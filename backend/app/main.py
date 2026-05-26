"""
LabhPay backend entrypoint.

Stage 1: only /health + /ready are wired.
Routers for auth, statements, insights, assistant, resolution, export
come online in later stages.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.health import router as health_router
from app.api.statements import router as statements_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="LabhPay API",
    version="0.1.0",
    description="Privacy-first financial intelligence for Indian credit card users.",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(statements_router)
app.include_router(dashboard_router)
app.include_router(ai_router)


@app.get("/")
def root() -> dict:
    return {
        "service": "labhpay-backend",
        "message": "Privacy-first financial intelligence. See /docs.",
    }
