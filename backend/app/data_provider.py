"""Fetch OHLCV data for Oslo Børs tickers.

Tries Yahoo Finance via ``yfinance`` first. If the network is unavailable
(common in sandboxed dev environments), falls back to a deterministic
synthetic price series so the app stays usable end-to-end for demos.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import List, Dict
import hashlib
import math
import logging

import numpy as np

logger = logging.getLogger(__name__)


def _seed_for(ticker: str) -> int:
    h = hashlib.md5(ticker.encode()).hexdigest()
    return int(h[:8], 16)


def _synthetic_series(ticker: str, days: int) -> List[Dict]:
    """Generate a believable OHLCV series for the given ticker."""
    rng = np.random.default_rng(_seed_for(ticker))
    base_price = 50 + (rng.random() * 350)  # NOK 50..400
    base_vol = 200_000 + rng.integers(0, 2_000_000)

    drift = (rng.random() - 0.45) * 0.0008      # slight bias
    vol = 0.012 + rng.random() * 0.018          # daily sigma

    closes = [base_price]
    for _ in range(days - 1):
        shock = rng.normal(loc=drift, scale=vol)
        closes.append(max(0.5, closes[-1] * (1 + shock)))

    today = date.today()
    bars: List[Dict] = []
    for i, close in enumerate(closes):
        d = today - timedelta(days=days - 1 - i)
        # skip weekends to be a bit more realistic
        if d.weekday() >= 5:
            continue
        open_ = close * (1 + rng.normal(0, 0.004))
        high = max(open_, close) * (1 + abs(rng.normal(0, 0.005)))
        low = min(open_, close) * (1 - abs(rng.normal(0, 0.005)))
        # occasional volume spikes
        spike = 1.0 + (abs(rng.normal(0, 0.6)) if rng.random() < 0.07 else 0)
        volume = int(base_vol * spike * (0.7 + rng.random() * 0.6))
        bars.append({
            "date": d, "open": float(open_), "high": float(high),
            "low": float(low), "close": float(close), "volume": float(volume),
        })
    return bars


def fetch_prices(ticker: str, days: int = 180) -> List[Dict]:
    """Fetch daily OHLCV for the ticker. Returns list of dicts sorted by date asc."""
    try:
        import yfinance as yf  # imported lazily; heavy
        period = f"{max(days, 30)}d"
        df = yf.download(ticker, period=period, interval="1d",
                         progress=False, auto_adjust=False, threads=False)
        if df is not None and not df.empty:
            df = df.reset_index()
            # yfinance sometimes returns MultiIndex columns
            if hasattr(df.columns, "nlevels") and df.columns.nlevels > 1:
                df.columns = [c[0] for c in df.columns]
            bars = []
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
            if bars:
                return bars
    except Exception as e:
        logger.warning("yfinance fetch failed for %s: %s — using synthetic data", ticker, e)

    return _synthetic_series(ticker, days)
