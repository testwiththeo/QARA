from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    vcs_url: str | None = None


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(None, max_length=255)
    vcs_url: str | None = None
    settings: dict[str, Any] | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    vcs_url: str | None = None
    settings: dict[str, Any] = {}
    created_at: datetime
    bug_count: int = 0

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
