from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bug_report import BugReport
from app.models.project import Project


async def create_project(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    name: str,
    vcs_url: str | None = None,
) -> Project:
    project = Project(
        tenant_id=tenant_id,
        name=name,
        vcs_url=vcs_url,
        settings={
            "auto_create_test_case": True,
            "auto_assign": True,
            "triage_model": "ai",
        },
    )
    db.add(project)
    await db.flush()
    return project


async def list_projects(db: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    result = await db.execute(
        select(Project).where(Project.tenant_id == tenant_id).order_by(Project.created_at)
    )
    projects = list(result.scalars().all())

    # Get bug counts
    items = []
    for p in projects:
        count_result = await db.execute(
            select(func.count()).select_from(BugReport).where(BugReport.project_id == p.id)
        )
        bug_count = count_result.scalar() or 0
        items.append({
            "project": p,
            "bug_count": bug_count,
        })
    return items


async def get_project(db: AsyncSession, project_id: uuid.UUID, tenant_id: uuid.UUID) -> tuple[Project, int]:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.tenant_id == tenant_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    count_result = await db.execute(
        select(func.count()).select_from(BugReport).where(BugReport.project_id == project_id)
    )
    bug_count = count_result.scalar() or 0
    return project, bug_count


async def update_project(
    db: AsyncSession,
    project: Project,
    *,
    name: str | None = None,
    vcs_url: str | None = None,
    settings: dict | None = None,
) -> Project:
    if name is not None:
        project.name = name
    if vcs_url is not None:
        project.vcs_url = vcs_url
    if settings is not None:
        project.settings = settings
    await db.flush()
    return project
