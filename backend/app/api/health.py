"""Health + readiness endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel

from app import __version__
from app.core.config import get_settings

router = APIRouter(tags=["meta"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    env: str


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    s = get_settings()
    return HealthResponse(
        status="ok",
        service="labhpay-backend",
        version=__version__,
        env=s.APP_ENV,
    )


@router.get("/ready", response_model=HealthResponse)
def ready() -> HealthResponse:
    # Stage 1: same as /health. Stage 3+ will check Redis + Supabase.
    return health()
