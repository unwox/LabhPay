"""
Admin API — gated on an email allowlist (ADMIN_EMAILS).

A logged-in user whose email is in ADMIN_EMAILS may:

  GET  /admin/users                 list users + per-user stats
  GET  /admin/analytics?days=30     aggregate usage from audit_anonymous
  GET  /admin/health                AI providers + Redis + queue snapshot
  POST /admin/users/{id}/disable    soft-disable (blocks login/refresh)
  POST /admin/users/{id}/enable     re-enable
  POST /admin/users/{id}/logout     revoke all of a user's sessions
  POST /admin/users/{id}/reset-limits   clear a user's rate-limit counters

Privacy note: this surfaces operational metadata only. Financial data is
never persisted (Redis, 30-min TTL), so there's nothing here to leak about
what a user actually spent — only counts of events.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.dependencies import current_user
from app.core.redis_client import get_redis
from app.core.security import AccessClaims
from app.db.users import User, get_user_store
from utils.audit import analytics_client, hash_user_id

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------- admin gate ----------------

def current_admin(
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> AccessClaims:
    """Allow only logged-in users whose email is in ADMIN_EMAILS."""
    user = get_user_store().by_id(claims.sub)
    if not user or not get_settings().is_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return claims


# ---------------- models ----------------

class AdminUser(BaseModel):
    id: str
    email: str | None = None
    phone_e164: str | None = None
    display_name: str | None = None
    auth_method: str          # "google" | "phone" | "both"
    created_at: str | None = None
    last_login_at: str | None = None
    login_count: int = 0
    disabled: bool = False
    is_admin: bool = False


def _auth_method(u: User) -> str:
    if u.google_id and u.phone_e164:
        return "both"
    if u.google_id:
        return "google"
    if u.phone_e164:
        return "phone"
    return "unknown"


def _to_admin_user(u: User) -> AdminUser:
    s = get_settings()
    return AdminUser(
        id=u.id,
        email=u.email,
        phone_e164=u.phone_e164,
        display_name=u.display_name,
        auth_method=_auth_method(u),
        created_at=u.created_at,
        last_login_at=u.last_login_at,
        login_count=u.login_count,
        disabled=u.disabled,
        is_admin=s.is_admin_email(u.email),
    )


# ---------------- users ----------------

@router.get("/users")
def list_users(
    _admin: Annotated[AccessClaims, Depends(current_admin)],
    limit: int = Query(500, ge=1, le=2000),
) -> dict:
    store = get_user_store()
    users = store.list_users(limit=limit)
    now = datetime.now(timezone.utc)

    def _recent(iso: str | None, days: int) -> bool:
        if not iso:
            return False
        try:
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except Exception:
            return False
        return (now - dt) <= timedelta(days=days)

    total = len(users)
    new_7d = sum(1 for u in users if _recent(u.created_at, 7))
    active_7d = sum(1 for u in users if _recent(u.last_login_at, 7))
    active_30d = sum(1 for u in users if _recent(u.last_login_at, 30))
    disabled = sum(1 for u in users if u.disabled)

    return {
        "totals": {
            "users": total,
            "new_7d": new_7d,
            "active_7d": active_7d,
            "active_30d": active_30d,
            "disabled": disabled,
        },
        "users": [_to_admin_user(u).model_dump() for u in users],
    }


class _ActionResult(BaseModel):
    ok: bool = True
    user_id: str
    action: str


@router.post("/users/{user_id}/disable")
def disable_user(
    user_id: str,
    admin: Annotated[AccessClaims, Depends(current_admin)],
) -> _ActionResult:
    store = get_user_store()
    user = store.by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if get_settings().is_admin_email(user.email):
        raise HTTPException(status_code=400, detail="Refusing to disable an admin account.")
    store.set_disabled(user_id, True)
    # Kill active sessions so the disable takes effect without waiting for the
    # access token to expire.
    try:
        store.purge_user_refresh(user_id)
    except Exception:
        pass
    return _ActionResult(user_id=user_id, action="disable")


@router.post("/users/{user_id}/enable")
def enable_user(
    user_id: str,
    admin: Annotated[AccessClaims, Depends(current_admin)],
) -> _ActionResult:
    store = get_user_store()
    if not store.by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    store.set_disabled(user_id, False)
    return _ActionResult(user_id=user_id, action="enable")


@router.post("/users/{user_id}/logout")
def force_logout(
    user_id: str,
    admin: Annotated[AccessClaims, Depends(current_admin)],
) -> _ActionResult:
    store = get_user_store()
    if not store.by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    store.purge_user_refresh(user_id)
    # Best-effort: also purge their Redis session blobs.
    try:
        from app.services.storage import purge_user_session
        purge_user_session(user_id)
    except Exception:
        pass
    return _ActionResult(user_id=user_id, action="logout")


@router.post("/users/{user_id}/reset-limits")
def reset_limits(
    user_id: str,
    admin: Annotated[AccessClaims, Depends(current_admin)],
) -> _ActionResult:
    if not get_user_store().by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    r = get_redis()
    deleted = 0
    for pattern in (f"rl:assistant:{user_id}", f"rl:upload:{user_id}"):
        try:
            deleted += int(r.delete(pattern) or 0)
        except Exception:
            pass
    return _ActionResult(user_id=user_id, action=f"reset-limits ({deleted} cleared)")


# ---------------- analytics ----------------

@router.get("/analytics")
def analytics(
    _admin: Annotated[AccessClaims, Depends(current_admin)],
    days: int = Query(30, ge=1, le=180),
) -> dict:
    sb = analytics_client()
    if sb is None:
        return {
            "available": False,
            "reason": "Analytics store not configured.",
            "days": days,
            "events": {},
            "daily_active": [],
            "uploads_by_day": [],
        }

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    try:
        resp = (
            sb.table("audit_anonymous")
            .select("event, user_hash, occurred_at")
            .gte("occurred_at", cutoff)
            .order("occurred_at", desc=True)
            .limit(20000)
            .execute()
        )
        rows = resp.data or []
    except Exception as e:
        return {
            "available": False,
            "reason": f"Could not read analytics: {e}",
            "days": days,
            "events": {},
            "daily_active": [],
            "uploads_by_day": [],
        }

    event_counts: Counter[str] = Counter()
    dau: dict[str, set] = defaultdict(set)        # day -> set(user_hash)
    uploads: dict[str, int] = defaultdict(int)    # day -> count

    for row in rows:
        ev = row.get("event") or "unknown"
        event_counts[ev] += 1
        occurred = row.get("occurred_at") or ""
        day = occurred[:10]
        uh = row.get("user_hash")
        if day:
            if uh:
                dau[day].add(uh)
            if ev == "statements.upload":
                uploads[day] += 1

    daily_active = [{"day": d, "users": len(s)} for d, s in sorted(dau.items())]
    uploads_by_day = [{"day": d, "count": c} for d, c in sorted(uploads.items())]

    # Friendly roll-ups
    logins = event_counts.get("auth.login", 0) + event_counts.get("auth.login.google", 0)

    return {
        "available": True,
        "days": days,
        "totals": {
            "events": sum(event_counts.values()),
            "logins": logins,
            "uploads": event_counts.get("statements.upload", 0),
            "assistant_turns": event_counts.get("assistant.turn", 0),
            "exports": event_counts.get("exports.download", 0),
            "resolution_emails": event_counts.get("resolution.email", 0),
        },
        "events": dict(event_counts),
        "daily_active": daily_active,
        "uploads_by_day": uploads_by_day,
    }


# ---------------- system health ----------------

@router.get("/health")
def admin_health(
    admin: Annotated[AccessClaims, Depends(current_admin)],
) -> dict:
    out: dict = {"redis": {}, "ai": {}, "users": {}}

    # Redis ping + rough key count
    try:
        r = get_redis()
        pong = r.ping()
        out["redis"] = {"ok": bool(pong), "dbsize": int(r.dbsize())}
    except Exception as e:
        out["redis"] = {"ok": False, "error": str(e)}

    # AI gateway snapshot (full counts — we're admin here)
    try:
        from ai_gateway import get_gateway
        snap = get_gateway().health_snapshot()
        out["ai"] = {
            "providers": snap.get("providers", {}),
            "fast_priority": snap.get("fast_priority"),
            "deep_priority": snap.get("deep_priority"),
        }
    except Exception as e:
        out["ai"] = {"error": str(e)}

    # User store mode + count
    try:
        store = get_user_store()
        out["users"] = {"store": store.mode, "count": store.count_users()}
    except Exception as e:
        out["users"] = {"error": str(e)}

    out["generated_at"] = datetime.now(timezone.utc).isoformat()
    return out
