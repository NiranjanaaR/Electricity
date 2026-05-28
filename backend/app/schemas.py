from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


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
    explanation: str
    stock: StockOut


class StockDetail(BaseModel):
    stock: StockOut
    prices: List[PriceBarOut]
    suggestion: Optional[SuggestionOut] = None


class FetchError(BaseModel):
    ticker: str
    error: str


class AnalysisRunResult(BaseModel):
    analyzed: int
    suggestions: int
    analysis_date: date
    errors: List[FetchError] = []
