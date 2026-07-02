"""
Statement upload + processing API.

Endpoints:
  POST   /statements/upload                  multipart PDF -> {job_id}
  GET    /statements/{job_id}/status         poll progress
  GET    /statements/{job_id}/result         final Statement JSON
  POST   /statements/{job_id}/password       {password} -> retries extraction
  DELETE /statements/{job_id}                purge encrypted blob + status + result

All paths require an authenticated session.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from celery import Celery
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.dependencies import current_user
from app.core.security import AccessClaims
from app.db.users import get_user_store
from app.services.private_mode import mark_private
from app.services.storage import (
    delete_pdf,
    fetch_filename,
    get_result,
    get_status,
    purge_user_session,
    set_status,
    store_password,
    store_pdf,
)
from shared.schemas import JobResult, JobStage, JobStatus
from utils.audit import emit as audit_emit, hash_user_id
from utils.pdf_extract import is_password_protected

router = APIRouter(prefix="/statements", tags=["statements"])


# ---- Celery shim (no worker code imported here) ----

def _celery() -> Celery:
    s = get_settings()
    return Celery("labhpay-client", broker=s.REDIS_URL, backend=s.REDIS_URL)


def _enqueue(*, user_id: str, job_id: str) -> None:
    _celery().send_task(
        "statements.pdf_extract",
        kwargs={"user_id": user_id, "job_id": job_id},
    )


# ---- DTOs ----

class UploadResponse(BaseModel):
    job_id: str
    filename: str
    needs_password: bool


class PasswordBody(BaseModel):
    password: str = Field(..., min_length=1, max_length=64)


# ---- Routes ----

@router.post("/upload", response_model=UploadResponse)
async def upload_statement(
    claims: Annotated[AccessClaims, Depends(current_user)],
    file: UploadFile = File(..., description="Credit card statement PDF"),
    private: bool | None = Form(
        None,
        description="Override Private Mode for this upload. Defaults to user setting.",
    ),
) -> UploadResponse:
    s = get_settings()

    # MIME + size validation
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=415, detail="Only PDF statements are supported.")

    data = await file.read()
    max_bytes = s.UPLOAD_MAX_MB * 1024 * 1024
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Limit is {s.UPLOAD_MAX_MB} MB.",
        )
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="File does not look like a PDF.")

    job_id = uuid.uuid4().hex
    needs_pw = is_password_protected(data)

    # The statement pipeline needs its temporary store + queue (Redis). If that
    # is unavailable (e.g. provider outage or quota exhausted), fail softly with
    # a clear 503 instead of a raw 500 — the rest of the app stays usable.
    try:
        import redis as _redis  # noqa: PLC0415

        store_pdf(
            user_id=claims.sub,
            job_id=job_id,
            filename=file.filename or "statement.pdf",
            data=data,
        )

        initial_stage = JobStage.NEEDS_PASSWORD if needs_pw else JobStage.QUEUED
        set_status(
            JobStatus(
                job_id=job_id,
                stage=initial_stage,
                progress=0.0 if not needs_pw else 0.05,
                message=(
                    "This statement is password-protected."
                    if needs_pw
                    else "Queued for processing"
                ),
            ),
            user_id=claims.sub,
        )
    except _redis.exceptions.RedisError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Statement processing is temporarily unavailable — we're a bit "
                "over capacity right now. Please try again in a few minutes. "
                "(Everything else on LabhPay still works.)"
            ),
        )

    # Stage 10: respect Private Mode. If the user opted in (per-upload or
    # via their account default), mark this job so the cleanup worker
    # deletes the result after a short grace once analysis lands.
    use_private = private
    if use_private is None:
        try:
            u = get_user_store().by_id(claims.sub)
            use_private = bool(u and u.private_mode_default)
        except Exception:
            use_private = False
    if use_private:
        mark_private(user_id=claims.sub, job_id=job_id)

    if not needs_pw:
        try:
            _enqueue(user_id=claims.sub, job_id=job_id)
        except Exception:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Statement processing is temporarily unavailable — we're a "
                    "bit over capacity. Please try again in a few minutes."
                ),
            )

    audit_emit(
        "statements.upload",
        user=hash_user_id(claims.sub),
        bytes=len(data),
        needs_password=needs_pw,
        private_mode=bool(use_private),
    )

    return UploadResponse(
        job_id=job_id,
        filename=file.filename or "statement.pdf",
        needs_password=needs_pw,
    )


@router.post("/{job_id}/password")
def submit_password(
    job_id: str,
    body: PasswordBody,
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> dict:
    # Confirm a job is actually waiting on a password.
    status = get_status(user_id=claims.sub, job_id=job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found or expired.")
    if status.stage not in (JobStage.NEEDS_PASSWORD, JobStage.FAILED, JobStage.QUEUED):
        raise HTTPException(status_code=409, detail="Job is not awaiting a password.")

    store_password(user_id=claims.sub, job_id=job_id, password=body.password)
    set_status(
        JobStatus(job_id=job_id, stage=JobStage.QUEUED, progress=0.05,
                  message="Retrying with your password"),
        user_id=claims.sub,
    )
    _enqueue(user_id=claims.sub, job_id=job_id)
    return {"ok": True}


@router.get("/{job_id}/status", response_model=JobStatus)
def status(
    job_id: str,
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> JobStatus:
    s = get_status(user_id=claims.sub, job_id=job_id)
    if not s:
        raise HTTPException(status_code=404, detail="Job not found or expired.")
    return s


@router.get("/{job_id}/result", response_model=JobResult)
def result(
    job_id: str,
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> JobResult:
    r = get_result(user_id=claims.sub, job_id=job_id)
    if not r:
        # Fall back to status so the UI can show the right error state.
        st = get_status(user_id=claims.sub, job_id=job_id)
        if st and st.stage in (JobStage.DONE,):
            raise HTTPException(status_code=410, detail="Result already deleted.")
        raise HTTPException(status_code=425, detail="Not ready yet.")
    return r


@router.delete("/{job_id}")
def delete_job(
    job_id: str,
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> dict:
    delete_pdf(user_id=claims.sub, job_id=job_id)
    # Best-effort delete of status + result too
    from app.services.storage import _str_client  # type: ignore
    _str_client().delete(
        f"sess:{claims.sub}:status:{job_id}",
        f"sess:{claims.sub}:result:{job_id}",
        f"sess:{claims.sub}:filename:{job_id}",
        f"sess:{claims.sub}:pw:{job_id}",
    )
    return {"ok": True}


@router.delete("/")
def purge_session_data(
    claims: Annotated[AccessClaims, Depends(current_user)],
) -> dict:
    """Privacy hard-stop: nukes every blob/status/result for this user."""
    deleted = purge_user_session(claims.sub)
    return {"ok": True, "keys_deleted": deleted}
