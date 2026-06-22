from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.services import project_service

router = APIRouter(prefix="/projects")


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.create_project(
        db,
        tenant_id=user.tenant_id,
        name=body.name,
        vcs_url=body.vcs_url,
    )
    return _to_response(project, bug_count=0)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items = await project_service.list_projects(db, user.tenant_id)
    return ProjectListResponse(
        items=[
            _to_response(item["project"], item["bug_count"]) for item in items
        ]
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, bug_count = await project_service.get_project(db, project_id, user.tenant_id)
    return _to_response(project, bug_count)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, _ = await project_service.get_project(db, project_id, user.tenant_id)
    project = await project_service.update_project(
        db,
        project,
        name=body.name,
        vcs_url=body.vcs_url,
        settings=body.settings,
    )
    _, bug_count = await project_service.get_project(db, project_id, user.tenant_id)
    return _to_response(project, bug_count)


def _to_response(project, bug_count: int = 0) -> ProjectResponse:
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        vcs_url=project.vcs_url,
        settings=project.settings or {},
        created_at=project.created_at,
        bug_count=bug_count,
    )
