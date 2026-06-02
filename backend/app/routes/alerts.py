from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Alert, Stock
from ..schemas import AlertOut

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertOut])
def list_alerts(
    days: int = Query(14, ge=1, le=365),
    tickers: Optional[str] = Query(
        None, description="Comma-separated ticker filter, e.g. EQNR.OL,DNB.OL"
    ),
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    q = db.query(Alert).filter(Alert.analysis_date >= since)
    if tickers:
        wanted = [t.strip().upper() for t in tickers.split(",") if t.strip()]
        if wanted:
            q = q.join(Stock).filter(Stock.ticker.in_(wanted))
    return q.order_by(Alert.analysis_date.desc(), Alert.id.desc()).limit(200).all()
