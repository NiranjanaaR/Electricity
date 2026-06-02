import json
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, UniqueConstraint, Text
)
from sqlalchemy.orm import relationship

from .db import Base


class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True)
    ticker = Column(String(16), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    sector = Column(String(64), nullable=True)
    currency = Column(String(8), default="NOK")
    last_fetch_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)

    prices = relationship("PriceBar", back_populates="stock", cascade="all, delete-orphan")
    suggestions = relationship("Suggestion", back_populates="stock", cascade="all, delete-orphan")


class PriceBar(Base):
    __tablename__ = "price_bars"
    __table_args__ = (UniqueConstraint("stock_id", "date", name="uq_price_stock_date"),)

    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)

    stock = relationship("Stock", back_populates="prices")


class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"), index=True, nullable=False)
    analysis_date = Column(Date, nullable=False, index=True)
    action = Column(String(16), nullable=False)  # BUY / WATCH / AVOID
    confidence = Column(Float, nullable=False)   # 0..1
    risk_level = Column(String(16), nullable=False)  # Low / Medium / High
    rsi = Column(Float, nullable=True)
    sma_20 = Column(Float, nullable=True)
    sma_50 = Column(Float, nullable=True)
    volume_spike = Column(Float, nullable=True)
    last_close = Column(Float, nullable=True)
    avg_turnover_nok = Column(Float, nullable=True)   # 20-day mean of close*volume
    next_earnings_date = Column(Date, nullable=True)
    days_to_earnings = Column(Integer, nullable=True)
    enrichment_json = Column(Text, nullable=True)     # bid/ask/spread + news
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    stock = relationship("Stock", back_populates="suggestions")

    def _enrichment(self) -> dict:
        if not self.enrichment_json:
            return {}
        try:
            return json.loads(self.enrichment_json)
        except Exception:
            return {}

    @property
    def bid(self):
        return self._enrichment().get("bid")

    @property
    def ask(self):
        return self._enrichment().get("ask")

    @property
    def spread_pct(self):
        return self._enrichment().get("spread_pct")

    @property
    def news(self):
        return self._enrichment().get("news") or []
