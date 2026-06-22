from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class BugCreateRequest(BaseModel):
    title: str = Field(max_length=500)
    description: str | None = None
    project_id: str
    severity: str | None = Field(None, pattern="^(P0|P1|P2|P3)$")
    steps_to_reproduce: str | None = None
    expected_behavior: str | None = None
    actual_behavior: str | None = None


class BugUpdateRequest(BaseModel):
    title: str | None = Field(None, max_length=500)
    description: str | None = None
    severity: str | None = Field(None, pattern="^(P0|P1|P2|P3)$")
    status: str | None = None
    component: str | None = None
    assignee_id: str | None = None
    ticket_url: str | None = None


class BugCaptureResponse(BaseModel):
    id: str
    capture_type: str
    file_url: str | None = None
    file_size_bytes: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BugResponse(BaseModel):
    id: str
    title: str
    project_id: str
    severity: str | None = None
    status: str
    component: str | None = None
    risk_score: float | None = None
    assignee_id: str | None = None
    reporter_id: str | None = None
    duplicate_of: str | None = None
    ticket_url: str | None = None
    description: str | None = None
    steps_to_reproduce: str | None = None
    expected_behavior: str | None = None
    actual_behavior: str | None = None
    env_fingerprint: dict | None = None
    metadata_: dict[str, Any] | None = Field(None, alias="metadata_")
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    captures: list[BugCaptureResponse] = []

    model_config = {"from_attributes": True}


class BugListResponse(BaseModel):
    items: list[BugResponse]
    total: int
    page: int
    page_size: int
    pages: int


class SimilarBugResponse(BaseModel):
    id: str
    title: str
    severity: str | None = None
    status: str
    similarity: float
