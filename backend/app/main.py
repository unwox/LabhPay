"""
LabhPay backend entrypoint.

Stage 1: only /health + /ready are wired.
Routers for auth, statements, insights, assistant, resolution, export
come online in later stages.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.ai import router as ai_router
from app.api.assistant import router as assistant_router
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.exports import router as exports_router
from app.api.health import router as health_router
from app.api.intelligence import router as intelligence_router
from app.api.resolution import router as resolution_router
from app.api.statements import router as statements_router
from app.core.config import get_settings
from app.core.csrf import CSRF_HEADER, CsrfMiddleware
from app.core.security_headers import SecurityHeadersMiddleware

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
    allow_headers=["*", CSRF_HEADER],
    expose_headers=["Content-Disposition"],
)

# Stage 10: CSRF (double-submit cookie). Sits after CORS so OPTIONS doesn't
# get blocked.
app.add_middleware(CsrfMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(statements_router)
app.include_router(dashboard_router)
app.include_router(intelligence_router)
app.include_router(assistant_router)
app.include_router(resolution_router)
app.include_router(exports_router)
app.include_router(ai_router)
app.include_router(admin_router)


@app.get("/")
def root() -> dict:
    return {
        "service": "labhpay-backend",
        "message": "Privacy-first financial intelligence. See /docs.",
    }
