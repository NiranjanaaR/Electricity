"""Fetch OHLCV data for Oslo Børs tickers from real market-data providers.

Resolution order (each provider only attempted if reachable / configured):

1. **Yahoo Finance chart API** — direct HTTPS call to
   ``query1.finance.yahoo.com``. No API key required.
2. **Stooq** CSV download — open data, no key required. Good fallback when
   Yahoo rate-limits.
3. **yfinance** library — secondary Yahoo path, useful when the library
   handles a cookie/crumb negotiation that the direct call doesn't.
4. **AlphaVantage** ``TIME_SERIES_DAILY`` — opt-in via
   ``ALPHAVANTAGE_API_KEY``. Free tier is rate-limited (5 req/min).
5. **Finnhub** ``/stock/candle`` — opt-in via ``FINNHUB_API_KEY``. Oslo
   Børs candles require Finnhub's paid tier.

If every provider fails, :class:`DataFetchError` is raised. The analyzer
records the error against the stock so the API surfaces it to the UI.
No synthetic data is ever generated.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Dict, Callable
import logging
import math
import os
import time

import httpx

from .config import get_settings

logger = logging.getLogger(__name__)


# A real-browser User-Agent prevents Yahoo's anti-bot from returning 401/429.
_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}


class DataFetchError(RuntimeError):
    """Raised when no provider could deliver OHLCV data for a ticker."""

    def __init__(self, ticker: str, attempts: list[str]):
        self.ticker = ticker
        self.attempts = attempts
        super().__init__(
            f"Failed to fetch market data for {ticker}. Attempts: "
            + "; ".join(attempts)
        )


def _yahoo_chart_fetch(ticker: str, days: int) -> List[Dict]:
    """Fetch directly from Yahoo's chart endpoint (no library).

    This is the same data ``yfinance`` uses but without the cookie/crumb
    dance that frequently breaks. The response is a single JSON object
    containing parallel arrays for timestamp / open / high / low / close /
    volume.
    """
    end_ts = int(time.time())
    start_ts = end_ts - (max(days, 30) + 14) * 86400
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    params = {
        "period1": start_ts,
        "period2": end_ts,
        "interval": "1d",
        "events": "history",
        "includePrePost": "false",
    }
    with httpx.Client(timeout=30.0, follow_redirects=True,
                      headers=_BROWSER_HEADERS) as client:
        resp = client.get(url, params=params)
    if resp.status_code == 429:
        raise RuntimeError("Yahoo rate-limited (HTTP 429)")
    resp.raise_for_status()

    data = resp.json()
    chart = data.get("chart") or {}
    err = chart.get("error")
    if err:
        raise RuntimeError(f"Yahoo: {err.get('description') or err.get('code')}")

    result = chart.get("result") or []
    if not result:
        raise RuntimeError("Yahoo: empty result")

    res = result[0]
    timestamps = res.get("timestamp") or []
    quote_list = (res.get("indicators") or {}).get("quote") or [{}]
    quote = quote_list[0] if quote_list else {}
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []

    if not timestamps or not closes:
        raise RuntimeError("Yahoo: no bars in response")

    bars: List[Dict] = []
    for i, ts in enumerate(timestamps):
        c = closes[i] if i < len(closes) else None
        if c is None:
            continue
        o = opens[i] if i < len(opens) and opens[i] is not None else c
        h = highs[i] if i < len(highs) and highs[i] is not None else c
        l = lows[i] if i < len(lows) and lows[i] is not None else c
        v = volumes[i] if i < len(volumes) and volumes[i] is not None else 0
        bars.append({
            "date": datetime.utcfromtimestamp(ts).date(),
            "open": float(o),
            "high": float(h),
            "low": float(l),
            "close": float(c),
            "volume": float(v),
        })
    if not bars:
        raise RuntimeError("Yahoo: all bars filtered (no valid closes)")
    bars.sort(key=lambda b: b["date"])
    return bars


def _stooq_fetch(ticker: str, days: int) -> List[Dict]:
    """Fetch from Stooq CSV. Free, no API key.

    Stooq uses lowercase tickers with the same ``.ol`` suffix as Yahoo for
    Oslo Børs.
    """
    sym = ticker.lower()
    url = f"https://stooq.com/q/d/l/?s={sym}&i=d"
    with httpx.Client(timeout=30.0, follow_redirects=True,
                      headers={"User-Agent": _BROWSER_HEADERS["User-Agent"]}) as client:
        resp = client.get(url)
    resp.raise_for_status()
    text = resp.text.strip()

    if not text or text.lower().startswith("no data"):
        raise RuntimeError("Stooq: no data for symbol")

    lines = text.splitlines()
    if len(lines) < 2 or not lines[0].lower().startswith("date"):
        raise RuntimeError(f"Stooq: unexpected response head: {lines[0][:80]!r}")

    cutoff = date.today() - timedelta(days=max(days, 30))
    bars: List[Dict] = []
    for line in lines[1:]:
        parts = line.split(",")
        if len(parts) < 6:
            continue
        try:
            d = datetime.strptime(parts[0], "%Y-%m-%d").date()
        except ValueError:
            continue
        if d < cutoff:
            continue
        try:
            bars.append({
                "date": d,
                "open": float(parts[1]),
                "high": float(parts[2]),
                "low": float(parts[3]),
                "close": float(parts[4]),
                "volume": float(parts[5]) if parts[5] else 0.0,
            })
        except ValueError:
            continue
    if not bars:
        raise RuntimeError("Stooq: no bars in window")
    bars.sort(key=lambda b: b["date"])
    return bars


def _yfinance_fetch(ticker: str, days: int) -> List[Dict]:
    """Fallback: use the yfinance library (handles cookie/crumb auth)."""
    import yfinance as yf  # imported lazily

    end = date.today() + timedelta(days=1)
    start = end - timedelta(days=max(days, 30) + 14)

    df = None
    try:
        df = yf.download(
            ticker, start=start.isoformat(), end=end.isoformat(),
            interval="1d", progress=False, auto_adjust=False, threads=False,
        )
    except Exception as e:
        logger.debug("yf.download raised for %s: %s", ticker, e)

    if df is None or df.empty:
        try:
            df = yf.Ticker(ticker).history(
                start=start.isoformat(), end=end.isoformat(),
                interval="1d", auto_adjust=False,
            )
        except Exception as e:
            raise RuntimeError(f"yfinance request failed: {e}") from e

    if df is None or df.empty:
        raise RuntimeError("yfinance returned no rows")

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
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": ticker,
        "outputsize": outputsize,
        "apikey": key,
    }
    with httpx.Client(timeout=30.0) as client:
        resp = client.get("https://www.alphavantage.co/query", params=params)
    resp.raise_for_status()
    payload = resp.json()

    if "Time Series (Daily)" not in payload:
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
        raise RuntimeError("AlphaVantage returned no rows in window")
    bars.sort(key=lambda b: b["date"])
    return bars


def _finnhub_fetch(ticker: str, days: int) -> List[Dict]:
    key = get_settings().finnhub_api_key or os.environ.get("FINNHUB_API_KEY")
    if not key:
        raise RuntimeError("FINNHUB_API_KEY not set")

    to_ts = int(time.time())
    from_ts = to_ts - days * 24 * 3600
    params = {
        "symbol": ticker,
        "resolution": "D",
        "from": from_ts,
        "to": to_ts,
        "token": key,
    }
    with httpx.Client(timeout=30.0) as client:
        resp = client.get("https://finnhub.io/api/v1/stock/candle", params=params)
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


# Provider order: keyless / direct first, library second, paid APIs last.
_PROVIDERS: list[tuple[str, Callable[[str, int], List[Dict]]]] = [
    ("yahoo", _yahoo_chart_fetch),
    ("stooq", _stooq_fetch),
    ("yfinance", _yfinance_fetch),
    ("alphavantage", _alphavantage_fetch),
    ("finnhub", _finnhub_fetch),
]


def fetch_prices(ticker: str, days: int = 180) -> List[Dict]:
    """Fetch daily OHLCV bars for ``ticker``.

    Returns a list of dicts sorted by date ascending. Raises
    :class:`DataFetchError` if every provider fails. Never returns
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
