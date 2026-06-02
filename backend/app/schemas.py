from datetime import date, datetime
from typing import Optional, List, Any
import json
from pydantic import BaseModel, ConfigDict, field_validator


class StockBase(BaseModel):
    ticker: str
    name: str
    sector: Optional[str] = None
    currency: str = "NOK"


class StockOut(StockBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    last_fetch_at: Optional[datetime] = None
    last_error: Optional[str] = None


class PriceBarOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float


class NewsItem(BaseModel):
    title: Optional[str] = None
    publisher: Optional[str] = None
    link: Optional[str] = None
    published: Optional[str] = None


class SuggestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    analysis_date: date
    action: str
    confidence: float
    risk_level: str
    rsi: Optional[float]
    sma_20: Optional[float]
    sma_50: Optional[float]
    volume_spike: Optional[float]
    last_close: Optional[float]
    avg_turnover_nok: Optional[float] = None
    next_earnings_date: Optional[date] = None
    days_to_earnings: Optional[int] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    spread_pct: Optional[float] = None
    news: List[NewsItem] = []
    explanation: str
    stock: StockOut

    @field_validator("news", mode="before")
    @classmethod
    def _passthrough_news(cls, v: Any):
        return v or []


class StockDetail(BaseModel):
    stock: StockOut
    prices: List[PriceBarOut]
    suggestion: Optional[SuggestionOut] = None


class FetchError(BaseModel):
    ticker: str
    error: str


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    analysis_date: date
    prev_action: Optional[str] = None
    new_action: str
    prev_confidence: Optional[float] = None
    new_confidence: float
    note: Optional[str] = None
    created_at: datetime
    stock: StockOut


class EarningsPoint(BaseModel):
    date: Optional[str] = None
    revenue: Optional[float] = None
    earnings: Optional[float] = None


class EarningsHistoryPoint(BaseModel):
    quarter: Optional[str] = None
    period: Optional[str] = None
    estimate: Optional[float] = None
    actual: Optional[float] = None
    surprise_pct: Optional[float] = None


class FinancialsOut(BaseModel):
    currency: str = "NOK"
    quarterly_earnings: List[EarningsPoint] = []
    annual_earnings: List[EarningsPoint] = []
    earnings_history: List[EarningsHistoryPoint] = []


class AiAskRequest(BaseModel):
    ticker: str
    question: str


class AiAskResponse(BaseModel):
    answer: str
    model: str


class AnalysisRunResult(BaseModel):
    analyzed: int
    suggestions: int
    analysis_date: date
    errors: List[FetchError] = []
