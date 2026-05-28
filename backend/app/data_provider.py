"""Fetch OHLCV data for Oslo Børs tickers from real market-data providers.

Resolution order (each provider only attempted if reachable / configured):

1. **Yahoo Finance** via ``yfinance`` — primary, no API key required.
2. **AlphaVantage** ``TIME_SERIES_DAILY`` — used if ``ALPHAVANTAGE_API_KEY``
   is set. AlphaVantage supports Oslo via the ``.OL`` suffix on a free
   tier with rate limits.
3. **Finnhub** ``/stock/candle`` — used if ``FINNHUB_API_KEY`` is set.
   Note: Oslo Børs candles require Finnhub's paid tier.

If every provider fails, :class:`DataFetchError` is raised. The analyzer
records the error against the stock so the API surfaces it to the UI.
No synthetic data is ever generated.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Dict, Optional, Callable
import logging
import math
import os
import time

import httpx

from .config import get_settings

logger = logging.getLogger(__name__)


class DataFetchError(RuntimeError):
    """Raised when no provider could deliver OHLCV data for a ticker."""

    def __init__(self, ticker: str, attempts: list[str]):
        self.ticker = ticker
        self.attempts = attempts
        super().__init__(
            f"Failed to fetch market data for {ticker}. Attempts: "
            + "; ".join(attempts)
        )


def _yfinance_fetch(ticker: str, days: int) -> List[Dict]:
    import yfinance as yf  # imported lazily

    # yfinance only accepts a fixed set of period strings (1d, 5d, 1mo, 3mo,
    # 6mo, 1y, …) — passing "180d" silently returns an empty frame. Use an
    # explicit start/end window so any lookback works. Add a small buffer for
    # weekends and holidays so we still get `days` trading bars back.
    end = date.today() + timedelta(days=1)  # end is exclusive
    start = end - timedelta(days=max(days, 30) + 14)

    df = None
    try:
        df = yf.download(
            ticker,
            start=start.isoformat(),
            end=end.isoformat(),
            interval="1d",
            progress=False,
            auto_adjust=False,
            threads=False,
        )
    except Exception as e:
        logger.debug("yf.download raised for %s: %s", ticker, e)

    if df is None or df.empty:
        # Fall back to Ticker.history(), which uses a different Yahoo endpoint
        # and sometimes succeeds when download() fails.
        try:
            df = yf.Ticker(ticker).history(
                start=start.isoformat(),
                end=end.isoformat(),
                interval="1d",
                auto_adjust=False,
            )
        except Exception as e:
            raise RuntimeError(f"yfinance request failed: {e}") from e

    if df is None or df.empty:
        raise RuntimeError(
            "yfinance returned no rows (Yahoo blocked the request, ticker "
            "unknown, or no trading in the window)"
        )

    df = df.reset_index()
    if hasattr(df.columns, "nlevels") and df.columns.nlevels > 1:
        df.columns = [c[0] for c in df.columns]

    bars: List[Dict] = []
    for _, row in df.iterrows():
        d = row["Date"]
        d = d.date() if hasattr(d, "date") else d
        close = float(row["Close"])
        if math.isnan(close):
            continue
        bars.append({
            "date": d,
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": close,
            "volume": float(row["Volume"]) if not math.isnan(row["Volume"]) else 0.0,
        })
    if not bars:
        raise RuntimeError("yfinance returned only NaN rows")
    return bars


def _alphavantage_fetch(ticker: str, days: int) -> List[Dict]:
    key = get_settings().alphavantage_api_key or os.environ.get("ALPHAVANTAGE_API_KEY")
    if not key:
        raise RuntimeError("ALPHAVANTAGE_API_KEY not set")

    outputsize = "full" if days > 100 else "compact"
    url = "https://www.alphavantage.co/query"
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": ticker,
        "outputsize": outputsize,
        "apikey": key,
    }
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params=params)
    resp.raise_for_status()
    payload = resp.json()

    if "Time Series (Daily)" not in payload:
        # AlphaVantage uses "Note" for throttling, "Error Message" otherwise
        msg = payload.get("Note") or payload.get("Error Message") or "unknown error"
        raise RuntimeError(f"AlphaVantage: {msg}")

    series = payload["Time Series (Daily)"]
    cutoff = date.today() - timedelta(days=days)
    bars: List[Dict] = []
    for ds, row in series.items():
        d = datetime.strptime(ds, "%Y-%m-%d").date()
        if d < cutoff:
            continue
        bars.append({
            "date": d,
            "open": float(row["1. open"]),
            "high": float(row["2. high"]),
            "low": float(row["3. low"]),
            "close": float(row["4. close"]),
            "volume": float(row["5. volume"]),
        })
    if not bars:
        raise RuntimeError("AlphaVantage returned no rows in lookback window")
    bars.sort(key=lambda b: b["date"])
    return bars


def _finnhub_fetch(ticker: str, days: int) -> List[Dict]:
    key = get_settings().finnhub_api_key or os.environ.get("FINNHUB_API_KEY")
    if not key:
        raise RuntimeError("FINNHUB_API_KEY not set")

    to_ts = int(time.time())
    from_ts = to_ts - days * 24 * 3600
    url = "https://finnhub.io/api/v1/stock/candle"
    params = {
        "symbol": ticker,
        "resolution": "D",
        "from": from_ts,
        "to": to_ts,
        "token": key,
    }
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, params=params)
    resp.raise_for_status()
    payload = resp.json()

    if payload.get("s") != "ok":
        raise RuntimeError(f"Finnhub: status={payload.get('s')}")

    ts = payload.get("t", [])
    if not ts:
        raise RuntimeError("Finnhub returned no candles")

    bars: List[Dict] = []
    for i, t in enumerate(ts):
        bars.append({
            "date": datetime.utcfromtimestamp(t).date(),
            "open": float(payload["o"][i]),
            "high": float(payload["h"][i]),
            "low": float(payload["l"][i]),
            "close": float(payload["c"][i]),
            "volume": float(payload["v"][i]),
        })
    bars.sort(key=lambda b: b["date"])
    return bars


# Provider order: cheapest / most reliable first.
_PROVIDERS: list[tuple[str, Callable[[str, int], List[Dict]]]] = [
    ("yfinance", _yfinance_fetch),
    ("alphavantage", _alphavantage_fetch),
    ("finnhub", _finnhub_fetch),
]


def fetch_prices(ticker: str, days: int = 180) -> List[Dict]:
    """Fetch daily OHLCV bars for ``ticker``.

    Returns a list of dicts sorted by date ascending. Raises
    :class:`DataFetchError` if no provider succeeds. Never returns
    synthetic data.
    """
    attempts: list[str] = []
    for name, fn in _PROVIDERS:
        try:
            bars = fn(ticker, days)
            if bars:
                logger.info("Fetched %d bars for %s via %s", len(bars), ticker, name)
                return bars
            attempts.append(f"{name}: empty result")
        except Exception as e:
            attempts.append(f"{name}: {e}")
            logger.warning("Provider %s failed for %s: %s", name, ticker, e)
            continue
    raise DataFetchError(ticker, attempts)
