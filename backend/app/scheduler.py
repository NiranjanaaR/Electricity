"""APScheduler-based daily analysis job."""
from __future__ import annotations

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .analyzer import run_daily_analysis
from .config import get_settings
from .db import SessionLocal

logger = logging.getLogger(__name__)


def _job():
    settings = get_settings()
    db = SessionLocal()
    try:
        result = run_daily_analysis(db, lookback_days=settings.analysis_lookback_days)
        logger.info("Daily analysis complete: %s", result)
    except Exception:
        logger.exception("Daily analysis job failed")
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    settings = get_settings()
    scheduler = BackgroundScheduler(timezone=settings.timezone)
    scheduler.add_job(
        _job,
        CronTrigger(hour=settings.schedule_hour, minute=settings.schedule_minute),
        id="daily-analysis",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — daily run at %02d:%02d %s",
                settings.schedule_hour, settings.schedule_minute, settings.timezone)
    return scheduler
