"""
Celery application factory.

Stage 1: one dummy task, no business logic.
Stage 4 wires pdf_extract / ocr_fallback / categorize.
Stage 10 wires the cleanup worker.
"""

import os
import ssl

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
_IS_TLS = REDIS_URL.startswith("rediss://")

celery_app = Celery(
    "labhpay",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks.dummy", "tasks.pdf_extract", "tasks.cleanup"],
)

# TLS config for Upstash. We configure it here (not via a ?ssl_cert_reqs= URL
# param) because Celery/kombu expects the value "CERT_REQUIRED" while redis-py
# expects "required" — the same URL can't satisfy both. Keeping the URL clean
# (no param) lets redis-py use its secure default, and Celery uses this.
if _IS_TLS:
    celery_app.conf.broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_REQUIRED}
    celery_app.conf.redis_backend_use_ssl = {"ssl_cert_reqs": ssl.CERT_REQUIRED}

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
    # Cost control: on a quota-limited Redis (e.g. Upstash free tier, 500k
    # req/month) an idle worker's broker polling is the dominant request
    # source. Poll far less often and drop periodic heartbeats. Uploads still
    # process within seconds — each new job wakes the poller.
    broker_transport_options={"polling_interval": 10.0, "visibility_timeout": 3600},
    result_backend_transport_options={"polling_interval": 10.0},
    broker_heartbeat=0,
    # Redis keys already carry TTLs and auto-expire, so cleanup is a safety net
    # only — run it infrequently to conserve Redis requests.
    beat_schedule={
        "cleanup-idle-sessions": {
            "task": "cleanup.idle_sessions",
            "schedule": float(os.getenv("CLEANUP_IDLE_INTERVAL_S", "1800")),
        },
        "cleanup-orphan-results": {
            "task": "cleanup.orphan_results",
            "schedule": float(os.getenv("CLEANUP_ORPHAN_INTERVAL_S", "3600")),
        },
    },
)
