from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bug_report import BugReport
from app.models.bug_capture import BugCapture

# Valid state transitions
VALID_TRANSITIONS: dict[str, set[str]] = {
    "open": {"triaging"},
    "triaging": {"triaged"},
    "triaged": {"closed", "open"},
    "closed": {"open"},
}


def validate_transition(current: str, new: str) -> None:
    allowed = VALID_TRANSITIONS.get(current, set())
    if new not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from '{current}' to '{new}'",
        )


async def create_bug(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    reporter_id: uuid.UUID,
    title: str,
    project_id: uuid.UUID,
    description: str | None = None,
    severity: str | None = None,
    steps_to_reproduce: str | None = None,
    expected_behavior: str | None = None,
    actual_behavior: str | None = None,
) -> BugReport:
    bug = BugReport(
        tenant_id=tenant_id,
        project_id=project_id,
        title=title,
        description=description,
        severity=severity,
        status="open",
        reporter_id=reporter_id,
        steps_to_reproduce=steps_to_reproduce,
        expected_behavior=expected_behavior,
        actual_behavior=actual_behavior,
    )
    db.add(bug)
    await db.flush()
    return bug


async def list_bugs(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    project_id: uuid.UUID | None = None,
    status: str | None = None,
    severity: str | None = None,
    assignee_id: uuid.UUID | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
) -> dict:
    query = select(BugReport).where(BugReport.tenant_id == tenant_id)

    if project_id:
        query = query.where(BugReport.project_id == project_id)
    if status:
        query = query.where(BugReport.status == status)
    if severity:
        query = query.where(BugReport.severity == severity)
    if assignee_id:
        query = query.where(BugReport.assignee_id == assignee_id)
    if search:
        query = query.where(
            or_(
                BugReport.title.ilike(f"%{search}%"),
                BugReport.description.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Sort
    sort_col = getattr(BugReport, sort_by, BugReport.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = list(result.scalars().all())

    pages = math.ceil(total / page_size) if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


async def get_bug(db: AsyncSession, bug_id: uuid.UUID, tenant_id: uuid.UUID) -> BugReport:
    result = await db.execute(
        select(BugReport).where(BugReport.id == bug_id, BugReport.tenant_id == tenant_id)
    )
    bug = result.scalar_one_or_none()
    if bug is None:
        raise HTTPException(status_code=404, detail="Bug not found")
    return bug


async def update_bug(
    db: AsyncSession,
    bug: BugReport,
    *,
    title: str | None = None,
    description: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    component: str | None = None,
    assignee_id: uuid.UUID | None = None,
    ticket_url: str | None = None,
) -> BugReport:
    if status and status != bug.status:
        validate_transition(bug.status, status)
        bug.status = status
        if status == "closed":
            bug.resolved_at = datetime.now(timezone.utc)
        elif bug.status == "open" and bug.resolved_at:
            # Reopening — clear resolved_at
            bug.resolved_at = None

    if title is not None:
        bug.title = title
    if description is not None:
        bug.description = description
    if severity is not None:
        bug.severity = severity
    if component is not None:
        bug.component = component
    if assignee_id is not None:
        bug.assignee_id = assignee_id
    if ticket_url is not None:
        bug.ticket_url = ticket_url

    bug.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return bug


async def soft_delete_bug(db: AsyncSession, bug: BugReport) -> BugReport:
    bug.status = "closed"
    bug.resolved_at = datetime.now(timezone.utc)
    bug.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return bug
