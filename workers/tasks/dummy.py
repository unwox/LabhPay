"""Smoke-test task. Confirms the worker is alive and routing jobs."""

from celery_app import celery_app


@celery_app.task(name="dummy.ping")
def ping(payload: str = "hello") -> dict:
    return {"pong": payload, "ok": True}
