"""Technical indicators used by the analyzer.

All functions accept and return plain Python lists / floats so they don't
require pandas at call sites, but use numpy for the math.
"""
from __future__ import annotations

from typing import Sequence
import numpy as np


def sma(values: Sequence[float], window: int) -> float | None:
    if len(values) < window:
        return None
    return float(np.mean(values[-window:]))


def rsi(values: Sequence[float], period: int = 14) -> float | None:
    """Wilder's RSI."""
    if len(values) < period + 1:
        return None
    arr = np.asarray(values, dtype=float)
    deltas = np.diff(arr)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    avg_gain = float(np.mean(gains[:period]))
    avg_loss = float(np.mean(losses[:period]))

    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return float(100 - (100 / (1 + rs)))


def volume_spike(volumes: Sequence[float], window: int = 20) -> float | None:
    """Returns latest volume / average volume over `window`.

    A value of 1.0 means today's volume matches the average; 2.0 means double.
    """
    if len(volumes) < window + 1:
        return None
    recent_avg = float(np.mean(volumes[-(window + 1):-1]))
    if recent_avg == 0:
        return None
    return float(volumes[-1] / recent_avg)


def momentum_pct(closes: Sequence[float], window: int = 10) -> float | None:
    """Percentage change over the last `window` bars."""
    if len(closes) < window + 1:
        return None
    return float((closes[-1] / closes[-window - 1] - 1.0) * 100.0)


def volatility_pct(closes: Sequence[float], window: int = 20) -> float | None:
    """Annualised-ish daily-return std-dev as percentage."""
    if len(closes) < window + 1:
        return None
    arr = np.asarray(closes[-(window + 1):], dtype=float)
    returns = np.diff(arr) / arr[:-1]
    return float(np.std(returns) * 100.0)
