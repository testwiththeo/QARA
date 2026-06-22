from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class JiraConfig(BaseModel):
    url: str
    email: str
    api_token: str
    project_key: str


class SlackConfig(BaseModel):
    bot_token: str
    channel: str


class IntegrationCreateRequest(BaseModel):
    provider: str = Field(pattern="^(jira|slack)$")
    config: dict[str, Any]


class IntegrationResponse(BaseModel):
    id: str
    provider: str
    enabled: bool
    config: dict[str, Any]
    last_sync_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IntegrationListResponse(BaseModel):
    items: list[IntegrationResponse]


class IntegrationTestResponse(BaseModel):
    success: bool
    message: str
