from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import AiAskRequest, AiAskResponse
from .. import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/ask", response_model=AiAskResponse)
def ask(req: AiAskRequest, db: Session = Depends(get_db)):
    q = (req.question or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="Empty question")
    if len(q) > 2000:
        raise HTTPException(status_code=400, detail="Question too long (max 2000 chars)")
    try:
        answer, model = ai_service.ask(db, req.ticker, q)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return AiAskResponse(answer=answer, model=model)
