from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.integration import (
    IntegrationCreateRequest,
    IntegrationListResponse,
    IntegrationResponse,
    IntegrationTestResponse,
)
from app.services import integration_service

router = APIRouter(prefix="/integrations")


@router.post("", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def create_integration(
    body: IntegrationCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    integration = await integration_service.create_integration(
        db,
        tenant_id=user.tenant_id,
        provider=body.provider,
        config=body.config,
    )
    return _to_response(integration)


@router.get("", response_model=IntegrationListResponse)
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    integrations = await integration_service.list_integrations(db, user.tenant_id)
    return IntegrationListResponse(
        items=[_to_response(i) for i in integrations]
    )


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    integration_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await integration_service.delete_integration(db, integration_id, user.tenant_id)


@router.post("/{integration_id}/test", response_model=IntegrationTestResponse)
async def test_integration(
    integration_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    integration = await integration_service.get_integration(db, integration_id, user.tenant_id)
    try:
        result = await integration_service.test_integration(integration)
        return IntegrationTestResponse(
            success=result.get("success") == "true",
            message=result.get("message", ""),
        )
    except Exception as e:
        return IntegrationTestResponse(success=False, message=str(e))


def _to_response(integration) -> IntegrationResponse:
    return IntegrationResponse(
        id=str(integration.id),
        provider=integration.provider,
        enabled=integration.enabled,
        config=integration_service.mask_config(integration.config),
        last_sync_at=integration.last_sync_at,
        created_at=integration.created_at,
    )
