"""Daily analyzer: scores each stock and produces a Suggestion.

Uses **real market data only**. If data cannot be fetched for a ticker,
the failure is recorded on the Stock row and returned in the run
result; no suggestion is produced for that ticker.

This is a technical-signal mix — not investment advice. The app does
not place trades.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import List
import logging

from sqlalchemy.orm import Session

import json
import time

from . import indicators
from .models import Stock, PriceBar, Suggestion
from .data_provider import fetch_prices, fetch_enrichment, DataFetchError
from .seed_data import universe

logger = logging.getLogger(__name__)


def ensure_universe(db: Session) -> List[Stock]:
    """Make sure the stock universe is present in the DB and in sync."""
    existing = {s.ticker: s for s in db.query(Stock).all()}
    created = 0
    for entry in universe():
        if entry["ticker"] not in existing:
            db.add(Stock(**entry))
            created += 1
        else:
            stock = existing[entry["ticker"]]
            stock.name = entry["name"]
            stock.sector = entry.get("sector")
    if created:
        logger.info("Added %d new stocks to universe", created)
    db.commit()
    return db.query(Stock).order_by(Stock.ticker.asc()).all()


def refresh_prices(db: Session, stock: Stock, lookback_days: int) -> List[PriceBar]:
    """Fetch fresh OHLCV bars and merge them into the DB.

    Raises ``DataFetchError`` if the data providers all fail.
    """
    bars = fetch_prices(stock.ticker, days=lookback_days)
    existing_dates = {p.date for p in stock.prices}
    added = 0
    for b in bars:
        if b["date"] in existing_dates:
            continue
        db.add(PriceBar(stock_id=stock.id, **b))
        added += 1
    stock.last_fetch_at = datetime.utcnow()
    stock.last_error = None
    db.commit()
    return (
        db.query(PriceBar)
        .filter(PriceBar.stock_id == stock.id)
        .order_by(PriceBar.date.asc())
        .all()
    )


def score(rsi: float | None, vol_spike: float | None,
          sma20: float | None, sma50: float | None,
          last_close: float | None, mom_pct: float | None,
          avg_turnover_nok: float | None = None,
          days_to_earnings: int | None = None) -> tuple[str, float, str]:
    """Return (action, confidence 0..1, reason string)."""
    reasons: list[str] = []
    points = 0.0

    if rsi is not None:
        if rsi < 30:
            points += 0.35
            reasons.append(f"RSI {rsi:.1f} — oversold, often precedes a rebound")
        elif rsi < 40:
            points += 0.15
            reasons.append(f"RSI {rsi:.1f} — weak, room to recover")
        elif rsi > 70:
            points -= 0.30
            reasons.append(f"RSI {rsi:.1f} — overbought, pullback risk")
        elif rsi > 60:
            points -= 0.10
            reasons.append(f"RSI {rsi:.1f} — getting stretched")
        else:
            reasons.append(f"RSI {rsi:.1f} — neutral")

    if sma20 is not None and sma50 is not None and last_close is not None:
        if last_close > sma20 > sma50:
            points += 0.25
            reasons.append("Price above both 20- and 50-day SMA — uptrend intact")
        elif sma20 > sma50:
            points += 0.10
            reasons.append("20-day SMA above 50-day SMA — bullish trend")
        elif last_close < sma20 < sma50:
            points -= 0.20
            reasons.append("Price below both SMAs — downtrend")
        else:
            reasons.append("Trend mixed across SMAs")

    if vol_spike is not None:
        if vol_spike > 1.8:
            if mom_pct is not None and mom_pct > 0:
                points += 0.20
                reasons.append(f"Volume {vol_spike:.1f}× average on a rising day — strong buying interest")
            elif mom_pct is not None and mom_pct < 0:
                points -= 0.15
                reasons.append(f"Volume {vol_spike:.1f}× average on a down day — heavy selling")
            else:
                points += 0.05
                reasons.append(f"Volume {vol_spike:.1f}× average — unusual activity")
        elif vol_spike > 1.3:
            reasons.append(f"Volume {vol_spike:.1f}× average — slight pickup")

    # Liquidity penalty — thin turnover increases slippage and makes the
    # technical signal less actionable, regardless of how clean it looks.
    if avg_turnover_nok is not None:
        if avg_turnover_nok < 2_000_000:
            points -= 0.20
            reasons.append(
                f"Thin liquidity (~{avg_turnover_nok/1e6:.1f}M NOK/day avg) — "
                "wide spreads likely"
            )
        elif avg_turnover_nok < 10_000_000:
            points -= 0.05
            reasons.append(
                f"Modest liquidity (~{avg_turnover_nok/1e6:.1f}M NOK/day avg)"
            )

    # Earnings proximity — technicals get overridden by results, so trim
    # confidence when earnings are imminent.
    if days_to_earnings is not None and days_to_earnings >= 0:
        if days_to_earnings <= 7:
            points -= 0.15
            reasons.append(f"Earnings in {days_to_earnings} day(s) — event risk")
        elif days_to_earnings <= 14:
            points -= 0.07
            reasons.append(f"Earnings in {days_to_earnings} days — heads up")

    confidence = max(0.0, min(1.0, 0.5 + points))
    if confidence >= 0.65:
        action = "BUY"
    elif confidence >= 0.45:
        action = "WATCH"
    else:
        action = "AVOID"
    return action, confidence, " · ".join(reasons) if reasons else "Insufficient signals"


def risk_from_volatility(vol_pct: float | None) -> str:
    if vol_pct is None:
        return "Medium"
    if vol_pct < 1.5:
        return "Low"
    if vol_pct < 3.0:
        return "Medium"
    return "High"


def analyze_stock(db: Session, stock: Stock, lookback_days: int,
                  analysis_date: date) -> Suggestion | None:
    """Analyze a single stock. Bubbles fetch errors up to the caller."""
    prices = refresh_prices(db, stock, lookback_days)
    if len(prices) < 30:
        logger.info("Not enough history for %s (%d bars)", stock.ticker, len(prices))
        return None

    closes = [p.close for p in prices]
    volumes = [p.volume for p in prices]

    rsi_v = indicators.rsi(closes, 14)
    sma20 = indicators.sma(closes, 20)
    sma50 = indicators.sma(closes, 50)
    vol_spike = indicators.volume_spike(volumes, 20)
    mom = indicators.momentum_pct(closes, 10)
    vol_pct = indicators.volatility_pct(closes, 20)
    last_close = closes[-1]

    # 20-day average daily turnover in NOK (close * volume), useful as a
    # liquidity gate independent of share-volume noise.
    last_n = min(20, len(prices))
    avg_turnover_nok = float(
        sum(p.close * p.volume for p in prices[-last_n:]) / last_n
    ) if last_n else None

    # Best-effort context fetch — never blocks the suggestion.
    enrichment = fetch_enrichment(stock.ticker)
    next_earnings = enrichment.get("next_earnings")
    days_to_earnings: int | None = None
    if next_earnings is not None:
        days_to_earnings = (next_earnings - analysis_date).days

    bid = enrichment.get("bid")
    ask = enrichment.get("ask")
    spread_pct: float | None = None
    if bid and ask and ask > 0:
        spread_pct = (ask - bid) / ask * 100.0

    enrichment_payload = {
        "bid": bid,
        "ask": ask,
        "spread_pct": spread_pct,
        "avg_volume_10d": enrichment.get("avg_volume_10d"),
        "avg_volume_3m": enrichment.get("avg_volume_3m"),
        "news": enrichment.get("news") or [],
    }

    action, confidence, explanation = score(
        rsi_v, vol_spike, sma20, sma50, last_close, mom,
        avg_turnover_nok=avg_turnover_nok,
        days_to_earnings=days_to_earnings,
    )
    risk = risk_from_volatility(vol_pct)

    db.query(Suggestion).filter(
        Suggestion.stock_id == stock.id,
        Suggestion.analysis_date == analysis_date,
    ).delete()

    suggestion = Suggestion(
        stock_id=stock.id,
        analysis_date=analysis_date,
        action=action,
        confidence=confidence,
        risk_level=risk,
        rsi=rsi_v,
        sma_20=sma20,
        sma_50=sma50,
        volume_spike=vol_spike,
        last_close=last_close,
        avg_turnover_nok=avg_turnover_nok,
        next_earnings_date=next_earnings,
        days_to_earnings=days_to_earnings,
        enrichment_json=json.dumps(enrichment_payload, default=str),
        explanation=explanation,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion


def run_daily_analysis(db: Session, lookback_days: int = 180,
                       analysis_date: date | None = None) -> dict:
    """Analyze every stock in the universe.

    Returns a dict with ``analyzed`` (attempted), ``suggestions`` (produced),
    ``analysis_date`` and ``errors`` (per-ticker fetch failures).
    """
    analysis_date = analysis_date or date.today()
    stocks = ensure_universe(db)
    suggestions = 0
    errors: list[dict] = []

    for i, stock in enumerate(stocks):
        # Be polite to Yahoo — without a small delay we trigger HTTP 429
        # on the enrichment endpoints after the first ~20 tickers.
        if i > 0:
            time.sleep(0.4)
        try:
            res = analyze_stock(db, stock, lookback_days, analysis_date)
            if res is not None:
                suggestions += 1
        except DataFetchError as e:
            msg = "; ".join(e.attempts)
            stock.last_error = msg
            stock.last_fetch_at = datetime.utcnow()
            db.commit()
            errors.append({"ticker": stock.ticker, "error": msg})
            logger.warning("Fetch failed for %s: %s", stock.ticker, msg)
        except Exception as e:
            stock.last_error = f"analysis error: {e}"
            db.commit()
            errors.append({"ticker": stock.ticker, "error": str(e)})
            logger.exception("Analysis failed for %s", stock.ticker)

    return {
        "analyzed": len(stocks),
        "suggestions": suggestions,
        "analysis_date": analysis_date,
        "errors": errors,
    }
