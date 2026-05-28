from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Suggestion
from ..schemas import SuggestionOut

router = APIRouter(prefix="/api/suggestions", tags=["suggestions"])


@router.get("", response_model=List[SuggestionOut])
def latest_suggestions(
    limit: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None, description="Filter by BUY / WATCH / AVOID"),
    risk: Optional[str] = Query(None, description="Filter by Low / Medium / High"),
    db: Session = Depends(get_db),
):
    """Return the most recent suggestion per stock, sorted by confidence."""
    # Most recent analysis date in the DB
    latest_date = db.query(Suggestion.analysis_date).order_by(
        Suggestion.analysis_date.desc()
    ).first()
    if not latest_date:
        return []

    q = db.query(Suggestion).filter(Suggestion.analysis_date == latest_date[0])
    if action:
        q = q.filter(Suggestion.action == action.upper())
    if risk:
        q = q.filter(Suggestion.risk_level == risk.capitalize())

    return q.order_by(Suggestion.confidence.desc()).limit(limit).all()
