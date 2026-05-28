import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from .config import get_settings
from .db import engine, SessionLocal, Base
from .analyzer import ensure_universe, run_daily_analysis
from .models import Suggestion  # noqa: F401  (register models)
from .routes import stocks as stocks_routes
from .routes import suggestions as suggestions_routes
from .routes import analysis as analysis_routes
from .scheduler import start_scheduler

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_universe(db)
        # Run an analysis on startup if there are no suggestions yet so the
        # frontend has something to show on first launch.
        if db.query(Suggestion).count() == 0:
            logger.info("No suggestions in DB — running initial analysis…")
            run_daily_analysis(db, lookback_days=get_settings().analysis_lookback_days)
    finally:
        db.close()
    scheduler = start_scheduler()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="OsloBørs AI Assistant",
    description=(
        "Daily technical analysis of Oslo Børs stocks. Educational tool — "
        "does not execute trades."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks_routes.router)
app.include_router(suggestions_routes.router)
app.include_router(analysis_routes.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
