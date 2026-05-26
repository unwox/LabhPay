"""
PDF extraction Celery task.

Pipeline:
  decrypt blob -> detect password -> extract text -> parse via registry
  -> categorize -> persist result. Per-stage progress events go to Redis
  so the frontend can poll for state.

The task is idempotent: calling it again with the same job_id will simply
rebuild the result. Used both for the initial run and the password-retry.
"""

from __future__ import annotations

import sys
import traceback

# Make sibling packages importable when run from celery worker.
# /app is added by the Dockerfile; we add /app/backend so we can reuse
# the storage helper directly. For local dev (running outside docker),
# PYTHONPATH should include the repo root.

from celery_app import celery_app

# Lazy imports inside the task body so the worker boots fast.

PIPELINE_STAGES = [
    "decrypting",
    "extracting",
    "parsing",
    "categorizing",
    "done",
]


@celery_app.task(name="statements.pdf_extract", bind=True, max_retries=0)
def pdf_extract(self, *, user_id: str, job_id: str) -> dict:
    # Imports deferred to keep worker boot fast.
    from datetime import datetime

    from shared.categorizer import categorize_transactions
    from shared.schemas import JobResult, JobStage, JobStatus
    import parsers  # noqa: F401  -- registers HDFC/SBI/ICICI
    from parsers.registry import detect_bank

    # The worker reaches into the backend's storage helper directly because
    # both packages live in /app and the helper is the canonical access
    # layer for session blobs.
    sys.path.append("/app/backend")
    from app.services.storage import (
        consume_password,
        delete_pdf,
        fetch_filename,
        fetch_pdf,
        set_result,
        set_status,
    )

    from utils.pdf_extract import (
        ExtractResult,
        PdfPasswordRequired,
        PdfUnreadable,
        extract_text,
    )

    def emit(stage: JobStage, progress: float, message: str | None = None,
             bank_id: str | None = None, bank_display: str | None = None,
             error: str | None = None) -> None:
        set_status(
            JobStatus(
                job_id=job_id,
                stage=stage,
                progress=progress,
                message=message,
                bank_id=bank_id,
                bank_display=bank_display,
                error=error,
                updated_at=datetime.utcnow(),
            ),
            user_id=user_id,
        )

    try:
        emit(JobStage.DECRYPTING, 0.05, "Decrypting upload")
        data = fetch_pdf(user_id=user_id, job_id=job_id)
        if not data:
            emit(JobStage.FAILED, 1.0, error="File no longer available.")
            return {"ok": False, "reason": "missing"}

        password = consume_password(user_id=user_id, job_id=job_id)

        emit(JobStage.EXTRACTING, 0.20, "Reading the statement")
        try:
            result: ExtractResult = extract_text(data, password=password)
        except PdfPasswordRequired:
            emit(JobStage.NEEDS_PASSWORD, 0.20,
                 message="This statement is password-protected.")
            return {"ok": False, "reason": "needs_password"}
        except PdfUnreadable as e:
            emit(JobStage.FAILED, 1.0, error=str(e))
            delete_pdf(user_id=user_id, job_id=job_id)
            return {"ok": False, "reason": "unreadable"}

        emit(JobStage.PARSING, 0.55, "Identifying your bank")
        parser, conf = detect_bank(result.text)
        emit(JobStage.PARSING, 0.65, f"Detected {parser.display_name}",
             bank_id=parser.bank_id, bank_display=parser.display_name)
        statement = parser.parse(result.text, [])

        emit(JobStage.CATEGORIZING, 0.85, "Tagging transactions",
             bank_id=parser.bank_id, bank_display=parser.display_name)
        statement.transactions = categorize_transactions(statement.transactions)
        # Stage 7: LLM fallback for transactions the rules couldn't classify.
        # Silent no-op if disabled, budget exceeded, or all providers down.
        try:
            from app.services.categorizer_llm import llm_fallback_categorize
            statement.transactions = llm_fallback_categorize(
                statement.transactions, user_id=user_id
            )
        except Exception:
            # Fallback layer must never break the deterministic pipeline.
            pass
        statement.meta.pages = result.pages
        statement.meta.ocr_used = result.ocr_used
        statement.meta.detection_confidence = max(conf, statement.meta.detection_confidence)

        set_result(JobResult(job_id=job_id, statement=statement), user_id=user_id)

        # Privacy: delete the encrypted PDF as soon as extraction is done.
        delete_pdf(user_id=user_id, job_id=job_id)

        # Stage 10: stamp the Private Mode grace timer (no-op if the upload
        # wasn't in private mode).
        try:
            from app.services.private_mode import mark_analysis_done
            mark_analysis_done(user_id=user_id, job_id=job_id)
        except Exception:
            pass

        emit(JobStage.DONE, 1.0, "Ready",
             bank_id=parser.bank_id, bank_display=parser.display_name)
        return {"ok": True, "txns": len(statement.transactions)}

    except Exception as e:  # noqa: BLE001
        # Never log raw user content; only the exception type/message.
        emit(JobStage.FAILED, 1.0, error=f"{type(e).__name__}: {e}")
        # Print stack trace to worker logs (still no PII).
        traceback.print_exc()
        return {"ok": False, "reason": "exception"}
