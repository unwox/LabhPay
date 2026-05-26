"""
/ai/health — provider + pool + budget snapshot.

For Stage 6 this is gated on an optional X-Admin-Key header (set the same
value in ADMIN_KEY env var). When ADMIN_KEY is unset we still expose the
endpoint but mask raw key counts so casual production peek doesn't leak
provisioning info.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException

from ai_gateway import get_gateway
from ai_gateway.prompts import list_prompts
from app.core.config import get_settings
from app.core.dependencies import current_user
from app.core.security import AccessClaims

router = APIRouter(prefix="/ai", tags=["ai"])


def _is_admin(x_admin_key: str | None) -> bool:
    s = get_settings()
    admin = getattr(s, "ADMIN_KEY", "") or ""
    return bool(admin) and x_admin_key == admin


@router.get("/health")
def ai_health(
    claims: Annotated[AccessClaims, Depends(current_user)],
    x_admin_key: Annotated[str | None, Header(alias="X-Admin-Key")] = None,
) -> dict:
    g = get_gateway()
    snap = g.health_snapshot()

    if not _is_admin(x_admin_key):
        # Mask raw key counts so a casual peek doesn't leak provisioning.
        for prov in snap["providers"].values():
            pool = prov["pool"]
            pool.pop("keys", None)
            for k in ("active", "cooled", "disabled"):
                if pool.get(k, 0) > 0:
                    pool[k] = "configured"
                else:
                    pool[k] = 0
            pool["total"] = "configured" if pool["total"] > 0 else 0
        # Hide budget specifics from non-admin users.
        return {
            "gateway": "ok",
            "providers": snap["providers"],
            "fast_priority": snap["fast_priority"],
            "deep_priority": snap["deep_priority"],
        }

    # Admin view: include exact counts + per-user remaining budget.
    from ai_gateway.budget import TokenBudget
    s = get_settings()
    budget = TokenBudget(daily_cap=s.AI_USER_DAILY_TOKEN_BUDGET)
    return {
        "gateway": "ok",
        "providers": snap["providers"],
        "fast_priority": snap["fast_priority"],
        "deep_priority": snap["deep_priority"],
        "prompts": [
            {"name": p.name, "version": p.version, "tier": p.tier} for p in list_prompts()
        ],
        "budget": {
            "daily_cap": s.AI_USER_DAILY_TOKEN_BUDGET,
            "this_user_remaining": budget.remaining(claims.sub),
            "this_user_used": budget.used(claims.sub),
        },
    }
