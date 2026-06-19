from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CaptureUploadResponse(BaseModel):
    id: str
    bug_report_id: str
    capture_type: str
    file_url: str | None = None
    file_size_bytes: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CaptureListResponse(BaseModel):
    items: list[CaptureUploadResponse]
