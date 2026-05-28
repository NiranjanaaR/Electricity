import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


def _initial_analysis():
    db = SessionLocal()
    try:
        if db.query(Suggestion).count() == 0:
            logger.info("No suggestions in DB — running initial market analysis…")
            result = run_daily_analysis(db, lookback_days=get_settings().analysis_lookback_days)
            logger.info("Initial analysis complete: %s suggestions, %s errors",
                        result["suggestions"], len(result["errors"]))
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_universe(db)
    finally:
        db.close()
    # Run the first market fetch in the background so the API is reachable
    # immediately — fetching ~80 tickers from Yahoo can take a minute or two.
    threading.Thread(target=_initial_analysis, name="initial-analysis",
                     daemon=True).start()
    scheduler = start_scheduler()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="OsloBørs AI Assistant",
    description=(
        "Daily technical analysis of Oslo Børs stocks using real market data. "
        "Educational tool — does not execute trades."
    ),
    version="1.0.0",
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
