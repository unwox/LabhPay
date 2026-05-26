"""
/dashboard/summary — multi-statement aggregator over this user's available
Statements (those still in the Redis session cache).

Optional ?ids=a,b,c picks specific job_ids; default is "all I can see".
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import current_user
from app.core.security import AccessClaims
from app.services.analytics import summarize
from app.services.storage import _str_client  # reuse the configured Redis client
from app.services.storage import get_result

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _list_job_ids(user_id: str) -> list[str]:
    """Find every result key for this user (keys are: sess:{uid}:result:{jid})."""
    out: list[str] = []
    prefix = f"sess:{user_id}:result:"
    for k in _str_client().scan_iter(match=f"{prefix}*", count=200):
        out.append(k[len(prefix):])
    return out


@router.get("/summary")
def summary(
    claims: Annotated[AccessClaims, Depends(current_user)],
    ids: str | None = Query(None, description="Comma-separated job ids; omit for all"),
) -> dict:
    job_ids = (
        [i.strip() for i in ids.split(",") if i.strip()]
        if ids
        else _list_job_ids(claims.sub)
    )

    statements = []
    for jid in job_ids:
        r = get_result(user_id=claims.sub, job_id=jid)
        if r:
            statements.append(r.statement)

    return summarize(statements).to_dict()
