from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Stock, PriceBar, Suggestion
from ..schemas import StockOut, StockDetail, PriceBarOut, SuggestionOut

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("", response_model=List[StockOut])
def list_stocks(
    only_errors: bool = Query(False, description="Only return stocks whose last fetch failed"),
    db: Session = Depends(get_db),
) -> List[Stock]:
    q = db.query(Stock)
    if only_errors:
        q = q.filter(Stock.last_error.isnot(None))
    return q.order_by(Stock.ticker.asc()).all()


@router.get("/{ticker}", response_model=StockDetail)
def get_stock(
    ticker: str,
    days: int = Query(120, ge=10, le=365),
    db: Session = Depends(get_db),
):
    stock = db.query(Stock).filter(Stock.ticker == ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Unknown ticker {ticker}")

    prices = (
        db.query(PriceBar)
        .filter(PriceBar.stock_id == stock.id)
        .order_by(PriceBar.date.desc())
        .limit(days)
        .all()
    )
    prices = list(reversed(prices))

    suggestion = (
        db.query(Suggestion)
        .filter(Suggestion.stock_id == stock.id)
        .order_by(Suggestion.analysis_date.desc(), Suggestion.id.desc())
        .first()
    )

    return StockDetail(
        stock=StockOut.model_validate(stock),
        prices=[PriceBarOut.model_validate(p) for p in prices],
        suggestion=SuggestionOut.model_validate(suggestion) if suggestion else None,
    )
