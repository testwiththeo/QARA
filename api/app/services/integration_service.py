from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import Integration

# Fields that should be masked in API responses
SENSITIVE_FIELDS = {"api_token", "bot_token", "secret", "password"}


def mask_config(config: dict) -> dict:
    """Mask sensitive fields in integration config."""
    masked = {}
    for key, value in config.items():
        if key in SENSITIVE_FIELDS:
            masked[key] = "***"
        else:
            masked[key] = value
    return masked


async def create_integration(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    provider: str,
    config: dict,
) -> Integration:
    # Check for existing
    result = await db.execute(
        select(Integration).where(
            Integration.tenant_id == tenant_id,
            Integration.provider == provider,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Integration for '{provider}' already exists",
        )

    integration = Integration(
        tenant_id=tenant_id,
        provider=provider,
        config=config,
        enabled=True,
    )
    db.add(integration)
    await db.flush()
    return integration


async def list_integrations(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[Integration]:
    result = await db.execute(
        select(Integration).where(Integration.tenant_id == tenant_id)
    )
    return list(result.scalars().all())


async def get_integration(
    db: AsyncSession, integration_id: uuid.UUID, tenant_id: uuid.UUID
) -> Integration:
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.tenant_id == tenant_id,
        )
    )
    integration = result.scalar_one_or_none()
    if integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    return integration


async def delete_integration(
    db: AsyncSession, integration_id: uuid.UUID, tenant_id: uuid.UUID
) -> None:
    integration = await get_integration(db, integration_id, tenant_id)
    await db.delete(integration)
    await db.flush()


async def test_integration(integration: Integration) -> dict[str, str]:
    """Test integration connectivity."""
    if integration.provider == "jira":
        from app.integrations.jira_client import JiraClient
        config = integration.config
        client = JiraClient(
            url=config["url"],
            email=config["email"],
            api_token=config["api_token"],
        )
        return await client.test_connection()

    elif integration.provider == "slack":
        from app.integrations.slack_client import SlackClient
        config = integration.config
        client = SlackClient(bot_token=config["bot_token"])
        return await client.test_connection()

    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {integration.provider}")
