"""
Celery application factory.

Stage 1: one dummy task, no business logic.
Stage 4 wires pdf_extract / ocr_fallback / categorize.
Stage 10 wires the cleanup worker.
"""

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "labhpay",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks.dummy", "tasks.pdf_extract", "tasks.cleanup"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    # Privacy: results expire fast so even job metadata doesn't linger.
    result_expires=600,  # 10 minutes
    # Stage 10: cleanup-worker schedule (run via `celery -A celery_app beat`).
    beat_schedule={
        "cleanup-idle-sessions": {
            "task": "cleanup.idle_sessions",
            "schedule": float(os.getenv("CLEANUP_IDLE_INTERVAL_S", "120")),
        },
        "cleanup-orphan-results": {
            "task": "cleanup.orphan_results",
            "schedule": float(os.getenv("CLEANUP_ORPHAN_INTERVAL_S", "60")),
        },
    },
)
