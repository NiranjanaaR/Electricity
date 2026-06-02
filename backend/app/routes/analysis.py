from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..config import get_settings
from ..analyzer import run_daily_analysis
from ..schemas import AnalysisRunResult

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/run", response_model=AnalysisRunResult)
def run_now(db: Session = Depends(get_db)):
    settings = get_settings()
    result = run_daily_analysis(db, lookback_days=settings.analysis_lookback_days)
    return AnalysisRunResult(**result)
