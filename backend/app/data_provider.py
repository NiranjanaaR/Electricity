"""Fetch OHLCV data for Oslo Børs tickers from free, no-key providers.

Resolution order:

1. **Yahoo Finance chart API** — direct HTTPS call to
   ``query1.finance.yahoo.com``. No API key required.
2. **Stooq** CSV download — open data, no key required. Good fallback when
   Yahoo rate-limits. Tries both ``stooq.com`` and ``stooq.pl`` mirrors.
3. **yfinance** library — secondary Yahoo path, useful when the library
   handles a cookie/crumb negotiation the direct call doesn't.

If every provider fails, :class:`DataFetchError` is raised. The analyzer
records the error against the stock so the API surfaces it to the UI.
No synthetic data is ever generated.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Dict, Callable
import logging
import math
import time

import httpx

logger = logging.getLogger(__name__)


# A real-browser User-Agent prevents Yahoo's and Stooq's anti-bot from
# returning 401/429/captcha pages.
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
    """Fetch directly from Yahoo's chart endpoint (no library)."""
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

    Tries both stooq.com and stooq.pl mirrors — when one rate-limits a
    request and returns the "Get your apikey:" gate, the other usually
    still serves CSV. Stooq uses lowercase tickers with the same ``.ol``
    suffix as Yahoo for Oslo Børs.
    """
    sym = ticker.lower()
    headers = {
        "User-Agent": _BROWSER_HEADERS["User-Agent"],
        "Accept": "text/csv,text/plain,*/*",
        "Referer": "https://stooq.com/",
    }
    last_err: str | None = None
    for host in ("stooq.com", "stooq.pl"):
        url = f"https://{host}/q/d/l/?s={sym}&i=d"
        try:
            with httpx.Client(timeout=30.0, follow_redirects=True,
                              headers=headers) as client:
                resp = client.get(url)
            resp.raise_for_status()
        except Exception as e:
            last_err = f"{host}: {e}"
            continue

        text = resp.text.strip()
        if not text or text.lower().startswith("no data"):
            last_err = f"{host}: no data for symbol"
            continue
        if "apikey" in text.lower()[:200]:
            # Stooq's soft-rate-limit / paid gate page
            last_err = f"{host}: rate-limited (apikey gate)"
            continue
        lines = text.splitlines()
        if len(lines) < 2 or not lines[0].lower().startswith("date"):
            last_err = f"{host}: unexpected response head: {lines[0][:60]!r}"
            continue

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
        if bars:
            bars.sort(key=lambda b: b["date"])
            return bars
        last_err = f"{host}: no bars in window"

    raise RuntimeError(f"Stooq: {last_err or 'unknown error'}")


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


_PROVIDERS: list[tuple[str, Callable[[str, int], List[Dict]]]] = [
    ("yahoo", _yahoo_chart_fetch),
    ("stooq", _stooq_fetch),
    ("yfinance", _yfinance_fetch),
]


# --------------------------- enrichment -----------------------------------
# Best-effort context fetchers. Failures are swallowed by ``fetch_enrichment``
# so a missing news feed never blocks the main price analysis.

def _yahoo_quote_summary(ticker: str) -> Dict:
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
    params = {"modules": "price,summaryDetail,calendarEvents"}
    with httpx.Client(timeout=20.0, headers=_BROWSER_HEADERS,
                      follow_redirects=True) as client:
        resp = client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    result = (data.get("quoteSummary") or {}).get("result") or []
    if not result:
        return {}
    res = result[0]
    price = res.get("price") or {}
    summary = res.get("summaryDetail") or {}
    cal = res.get("calendarEvents") or {}
    earnings = cal.get("earnings") or {}
    earnings_dates = earnings.get("earningsDate") or []

    def _raw(field):
        return (field or {}).get("raw") if isinstance(field, dict) else None

    next_earnings: date | None = None
    if earnings_dates:
        ts = _raw(earnings_dates[0])
        if ts:
            next_earnings = datetime.utcfromtimestamp(ts).date()

    return {
        "bid": _raw(price.get("bid")),
        "ask": _raw(price.get("ask")),
        "avg_volume_10d": _raw(summary.get("averageVolume10days")),
        "avg_volume_3m": _raw(summary.get("averageVolume")),
        "next_earnings": next_earnings,
    }


def _yahoo_news(ticker: str, limit: int = 5) -> List[Dict]:
    url = "https://query1.finance.yahoo.com/v1/finance/search"
    params = {"q": ticker, "newsCount": limit, "quotesCount": 0,
              "enableFuzzyQuery": "false"}
    with httpx.Client(timeout=20.0, headers=_BROWSER_HEADERS,
                      follow_redirects=True) as client:
        resp = client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    news = data.get("news") or []
    out: List[Dict] = []
    for n in news[:limit]:
        ts = n.get("providerPublishTime")
        out.append({
            "title": n.get("title"),
            "publisher": n.get("publisher"),
            "link": n.get("link"),
            "published": datetime.utcfromtimestamp(ts).isoformat() if ts else None,
        })
    return out


def _yfinance_enrichment(ticker: str) -> Dict:
    """Fallback enrichment via yfinance — uses Yahoo's crumb-authed
    endpoints which often succeed when the bare HTTPS calls 429.
    """
    import yfinance as yf  # imported lazily

    t = yf.Ticker(ticker)
    out: Dict = {}

    info: Dict = {}
    try:
        info = t.info or {}
    except Exception as e:
        logger.debug("yfinance .info failed for %s: %s", ticker, e)

    out["bid"] = info.get("bid")
    out["ask"] = info.get("ask")
    out["avg_volume_10d"] = info.get("averageDailyVolume10Day") or info.get("averageVolume10days")
    out["avg_volume_3m"] = info.get("averageVolume")

    # Earnings: .calendar is a DataFrame or dict depending on yfinance version
    try:
        cal = t.calendar
        next_earnings = None
        if hasattr(cal, "empty") and not cal.empty:
            # DataFrame form
            try:
                ts = cal.loc["Earnings Date"].iloc[0]
                next_earnings = ts.date() if hasattr(ts, "date") else None
            except Exception:
                pass
        elif isinstance(cal, dict):
            ed = cal.get("Earnings Date") or cal.get("earningsDate")
            if isinstance(ed, list) and ed:
                v = ed[0]
                next_earnings = v if isinstance(v, date) else getattr(v, "date", lambda: None)()
        out["next_earnings"] = next_earnings
    except Exception as e:
        logger.debug("yfinance .calendar failed for %s: %s", ticker, e)
        out["next_earnings"] = None

    return out


def _yfinance_news(ticker: str, limit: int = 5) -> List[Dict]:
    import yfinance as yf

    raw = []
    try:
        raw = yf.Ticker(ticker).news or []
    except Exception as e:
        logger.debug("yfinance .news failed for %s: %s", ticker, e)

    out: List[Dict] = []
    for n in raw[:limit]:
        # yfinance 0.2.x: flat dict; newer versions: {"content": {...}}
        item = n.get("content") if isinstance(n.get("content"), dict) else n
        title = item.get("title")
        publisher = item.get("publisher") or (item.get("provider") or {}).get("displayName")
        link = item.get("link") or (item.get("canonicalUrl") or {}).get("url")
        ts = item.get("providerPublishTime") or item.get("pubDate")
        published = None
        if isinstance(ts, (int, float)):
            published = datetime.utcfromtimestamp(ts).isoformat()
        elif isinstance(ts, str):
            published = ts
        out.append({"title": title, "publisher": publisher,
                    "link": link, "published": published})
    return out


def fetch_financials(ticker: str) -> Dict:
    """Quarterly and annual revenue/earnings via Yahoo quoteSummary.

    Returns a dict with ``quarterly_earnings``, ``annual_earnings`` and
    ``earnings_history`` (estimates vs actuals). Empty dict on failure.
    """
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
    params = {"modules": "earnings,earningsHistory,price"}
    try:
        with httpx.Client(timeout=20.0, headers=_BROWSER_HEADERS,
                          follow_redirects=True) as client:
            resp = client.get(url, params=params)
        resp.raise_for_status()
        payload = resp.json()
    except Exception as e:
        logger.info("Financials fetch failed for %s: %s", ticker, e)
        return {}

    result = (payload.get("quoteSummary") or {}).get("result") or []
    if not result:
        return {}
    res = result[0]
    currency = (res.get("price") or {}).get("currency") or "NOK"
    earnings = res.get("earnings") or {}
    fin = earnings.get("financialsChart") or {}
    earn_hist = (res.get("earningsHistory") or {}).get("history") or []

    def _raw(v):
        if isinstance(v, dict):
            return v.get("raw")
        return v

    def _series(items):
        out = []
        for it in items or []:
            out.append({
                "date": str(it.get("date")) if it.get("date") is not None else None,
                "revenue": _raw(it.get("revenue")),
                "earnings": _raw(it.get("earnings")),
            })
        return out

    history = []
    for h in earn_hist:
        history.append({
            "quarter": str(h.get("quarter")) if h.get("quarter") is not None else None,
            "period": h.get("period"),
            "estimate": _raw(h.get("epsEstimate")),
            "actual": _raw(h.get("epsActual")),
            "surprise_pct": _raw(h.get("surprisePercent")),
        })

    return {
        "currency": currency,
        "quarterly_earnings": _series(fin.get("quarterly")),
        "annual_earnings": _series(fin.get("yearly")),
        "earnings_history": history,
    }


def fetch_enrichment(ticker: str) -> Dict:
    """Pull bid/ask, average volume, next earnings date, and recent news.

    Tries Yahoo's direct endpoints first; falls back to yfinance when
    the direct calls get rate-limited. Best-effort throughout — any
    failure substitutes an empty value so a degraded enrichment never
    blocks the price analysis.
    """
    meta: Dict = {}
    try:
        meta = _yahoo_quote_summary(ticker)
    except Exception as e:
        logger.info("Direct quote-summary failed for %s: %s", ticker, e)

    # If the direct call missed anything, try yfinance for the gaps.
    if not meta or not any(v is not None for v in meta.values()):
        try:
            meta = _yfinance_enrichment(ticker)
        except Exception as e:
            logger.info("yfinance enrichment fallback failed for %s: %s", ticker, e)

    news: List[Dict] = []
    try:
        news = _yahoo_news(ticker)
    except Exception as e:
        logger.info("Direct news fetch failed for %s: %s", ticker, e)

    if not news:
        try:
            news = _yfinance_news(ticker)
        except Exception as e:
            logger.info("yfinance news fallback failed for %s: %s", ticker, e)

    meta["news"] = news
    return meta


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
