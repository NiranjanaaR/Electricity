"""Daily analyzer: scores each stock and produces a Suggestion.

This is an educational signal-mix — not investment advice.
"""
from __future__ import annotations

from datetime import date
from typing import List
import logging

from sqlalchemy.orm import Session

from . import indicators
from .models import Stock, PriceBar, Suggestion
from .data_provider import fetch_prices
from .seed_data import OBX_UNIVERSE

logger = logging.getLogger(__name__)


def ensure_universe(db: Session) -> List[Stock]:
    """Make sure the stock universe is present in the DB."""
    existing = {s.ticker: s for s in db.query(Stock).all()}
    created: List[Stock] = []
    for entry in OBX_UNIVERSE:
        if entry["ticker"] not in existing:
            stock = Stock(**entry)
            db.add(stock)
            created.append(stock)
    if created:
        db.commit()
        for s in created:
            db.refresh(s)
    return db.query(Stock).all()


def refresh_prices(db: Session, stock: Stock, lookback_days: int) -> List[PriceBar]:
    bars = fetch_prices(stock.ticker, days=lookback_days)
    existing_dates = {p.date for p in stock.prices}
    added = 0
    for b in bars:
        if b["date"] in existing_dates:
            continue
        db.add(PriceBar(stock_id=stock.id, **b))
        added += 1
    if added:
        db.commit()
    return (
        db.query(PriceBar)
        .filter(PriceBar.stock_id == stock.id)
        .order_by(PriceBar.date.asc())
        .all()
    )


def score(rsi: float | None, vol_spike: float | None,
          sma20: float | None, sma50: float | None,
          last_close: float | None, mom_pct: float | None) -> tuple[str, float, str]:
    """Return (action, confidence 0..1, reason string)."""
    reasons: list[str] = []
    points = 0.0

    # RSI: oversold = bullish bias, overbought = bearish bias
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

    # Moving-average cross / trend
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

    # Volume spike — confirms whatever direction price is moving
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

    # Decide action
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

    action, confidence, explanation = score(rsi_v, vol_spike, sma20, sma50, last_close, mom)
    risk = risk_from_volatility(vol_pct)

    # Replace previous suggestion for the same day
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
        explanation=explanation,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion


def run_daily_analysis(db: Session, lookback_days: int = 180,
                       analysis_date: date | None = None) -> dict:
    analysis_date = analysis_date or date.today()
    stocks = ensure_universe(db)
    suggestions = 0
    for stock in stocks:
        try:
            res = analyze_stock(db, stock, lookback_days, analysis_date)
            if res is not None:
                suggestions += 1
        except Exception as e:
            logger.exception("Analysis failed for %s: %s", stock.ticker, e)
    return {"analyzed": len(stocks), "suggestions": suggestions, "analysis_date": analysis_date}
