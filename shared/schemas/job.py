"""Job + progress models for the extraction pipeline."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from shared.schemas.statement import Statement


class JobStage(str, Enum):
    QUEUED = "queued"
    DECRYPTING = "decrypting"
    EXTRACTING = "extracting"
    OCR = "ocr"
    PARSING = "parsing"
    CATEGORIZING = "categorizing"
    DONE = "done"
    NEEDS_PASSWORD = "needs_password"
    FAILED = "failed"


class JobStatus(BaseModel):
    job_id: str
    stage: JobStage = JobStage.QUEUED
    progress: float = Field(0.0, ge=0.0, le=1.0)
    message: Optional[str] = None
    bank_id: Optional[str] = None
    bank_display: Optional[str] = None
    error: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class JobResult(BaseModel):
    job_id: str
    statement: Statement
