"""DeepSeek chat integration for the "Ask AI" panel.

DeepSeek exposes an OpenAI-compatible Chat Completions API at
``https://api.deepseek.com/v1/chat/completions``. We package the
question with a compact snapshot of what we know about the ticker
(latest suggestion, key indicators, news headlines) so the model can
answer with project-specific context.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Stock, Suggestion, PriceBar

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You are an investment-analysis assistant embedded in a tool that "
    "tracks Oslo Børs stocks. The user is looking at one specific ticker. "
    "Use the provided context (latest technical-signal snapshot, recent "
    "prices, news) to answer concisely and honestly. Be explicit about "
    "uncertainty. Do not give buy/sell instructions — discuss tradeoffs "
    "and what to monitor. If the question is unrelated to the stock, say "
    "so briefly."
)


def _stock_context(db: Session, ticker: str) -> dict:
    stock = db.query(Stock).filter(Stock.ticker == ticker.upper()).first()
    if not stock:
        return {"ticker": ticker, "error": "Unknown ticker"}

    suggestion = (
        db.query(Suggestion)
        .filter(Suggestion.stock_id == stock.id)
        .order_by(Suggestion.analysis_date.desc())
        .first()
    )
    recent = (
        db.query(PriceBar)
        .filter(PriceBar.stock_id == stock.id)
        .order_by(PriceBar.date.desc())
        .limit(20)
        .all()
    )

    ctx: dict = {
        "ticker": stock.ticker,
        "name": stock.name,
        "sector": stock.sector,
        "currency": stock.currency,
    }
    if suggestion:
        ctx["latest_signal"] = {
            "analysis_date": str(suggestion.analysis_date),
            "action": suggestion.action,
            "confidence": round(suggestion.confidence, 3),
            "risk_level": suggestion.risk_level,
            "rsi": suggestion.rsi,
            "sma_20": suggestion.sma_20,
            "sma_50": suggestion.sma_50,
            "last_close": suggestion.last_close,
            "volume_spike": suggestion.volume_spike,
            "avg_turnover_nok": suggestion.avg_turnover_nok,
            "days_to_earnings": suggestion.days_to_earnings,
            "explanation": suggestion.explanation,
        }
        news = suggestion.news[:5] if suggestion.news else []
        ctx["latest_signal"]["news"] = [
            {"title": n.get("title"), "publisher": n.get("publisher"),
             "published": n.get("published")} for n in news
        ]
    if recent:
        ctx["recent_prices"] = [
            {"date": str(p.date), "close": p.close, "volume": p.volume}
            for p in reversed(recent)
        ]
    return ctx


def ask(db: Session, ticker: str, question: str) -> tuple[str, str]:
    """Return (answer, model). Raises RuntimeError on API/config failure."""
    settings = get_settings()
    if not settings.deepseek_api_key:
        raise RuntimeError(
            "DeepSeek not configured. Set DEEPSEEK_API_KEY in backend/.env "
            "to enable the Ask-AI feature."
        )

    context = _stock_context(db, ticker)
    user_msg = (
        f"Context (JSON):\n{json.dumps(context, default=str, indent=2)}\n\n"
        f"Question: {question}"
    )

    url = f"{settings.deepseek_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.deepseek_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.4,
        "max_tokens": 700,
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, headers=headers, json=payload)
    except Exception as e:
        raise RuntimeError(f"DeepSeek request failed: {e}") from e

    if resp.status_code >= 400:
        raise RuntimeError(f"DeepSeek HTTP {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    try:
        answer = data["choices"][0]["message"]["content"].strip()
    except Exception:
        raise RuntimeError(f"Unexpected DeepSeek response: {json.dumps(data)[:300]}")
    return answer, payload["model"]
