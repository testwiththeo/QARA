from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.schemas.bug import (
    BugCreateRequest,
    BugListResponse,
    BugResponse,
    BugUpdateRequest,
    SimilarBugResponse,
)
from app.services import bug_service
from app.services.capture_service import upload_capture_file
from app.models.bug_report import BugReport
from app.models.user import User

router = APIRouter(prefix="/bugs")


@router.post("", response_model=BugResponse, status_code=status.HTTP_201_CREATED)
async def create_bug(
    title: str = Form(..., max_length=500),
    project_id: str = Form(...),
    description: str | None = Form(None),
    severity: str | None = Form(None),
    steps_to_reproduce: str | None = Form(None),
    expected_behavior: str | None = Form(None),
    actual_behavior: str | None = Form(None),
    captures: list[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bug = await bug_service.create_bug(
        db,
        tenant_id=user.tenant_id,
        reporter_id=user.id,
        title=title,
        project_id=uuid.UUID(project_id),
        description=description,
        severity=severity,
        steps_to_reproduce=steps_to_reproduce,
        expected_behavior=expected_behavior,
        actual_behavior=actual_behavior,
    )

    # Upload inline capture files
    for file in captures:
        if file.filename:
            # Determine capture type from extension
            capture_type = _guess_capture_type(file.filename)
            await upload_capture_file(
                db,
                bug_id=bug.id,
                tenant_id=user.tenant_id,
                capture_type=capture_type,
                file=file,
            )

    await db.flush()
    # Load captures explicitly for the response (avoid identity map issues)
    from sqlalchemy import select as sa_select
    from app.models.bug_capture import BugCapture
    cap_result = await db.execute(
        sa_select(BugCapture).where(BugCapture.bug_report_id == bug.id).order_by(BugCapture.created_at)
    )
    capture_list = list(cap_result.scalars().all())

    # Enqueue triage task
    try:
        from app.tasks.triage_task import enqueue_triage
        await enqueue_triage(str(bug.id))
    except Exception:
        pass  # Bug created even if triage enqueue fails

    return _to_response(bug, captures_override=capture_list)


@router.get("", response_model=BugListResponse)
async def list_bugs(
    project_id: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    assignee_id: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await bug_service.list_bugs(
        db,
        tenant_id=user.tenant_id,
        project_id=uuid.UUID(project_id) if project_id else None,
        status=status,
        severity=severity,
        assignee_id=uuid.UUID(assignee_id) if assignee_id else None,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return BugListResponse(
        items=[_to_response(b) for b in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        pages=result["pages"],
    )


@router.get("/{bug_id}", response_model=BugResponse)
async def get_bug(
    bug_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bug = await bug_service.get_bug(db, bug_id, user.tenant_id)
    return _to_response(bug)


@router.patch("/{bug_id}", response_model=BugResponse)
async def update_bug(
    bug_id: uuid.UUID,
    body: BugUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bug = await bug_service.get_bug(db, bug_id, user.tenant_id)
    bug = await bug_service.update_bug(
        db,
        bug,
        title=body.title,
        description=body.description,
        severity=body.severity,
        status=body.status,
        component=body.component,
        assignee_id=uuid.UUID(body.assignee_id) if body.assignee_id else None,
        ticket_url=body.ticket_url,
    )
    return _to_response(bug)


@router.delete("/{bug_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bug(
    bug_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bug = await bug_service.get_bug(db, bug_id, user.tenant_id)
    await bug_service.soft_delete_bug(db, bug)


@router.get("/{bug_id}/similar", response_model=list[SimilarBugResponse])
async def get_similar_bugs(
    bug_id: uuid.UUID,
    limit: int = 5,
    threshold: float = 0.7,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.services.triage_service import find_similar_bugs

    bug = await bug_service.get_bug(db, bug_id, user.tenant_id)
    results = await find_similar_bugs(db, bug.id, limit=min(limit, 20), threshold=threshold)
    return [
        SimilarBugResponse(
            id=str(r["bug_report_id"]),
            title=r["title"],
            severity=r["severity"],
            status=r["status"],
            similarity=r["similarity"],
        )
        for r in results
    ]


def _to_response(bug, captures_override=None) -> BugResponse:
    captures = captures_override if captures_override is not None else (bug.captures or [])
    return BugResponse(
        id=str(bug.id),
        title=bug.title,
        project_id=str(bug.project_id),
        severity=bug.severity,
        status=bug.status,
        component=bug.component,
        risk_score=float(bug.risk_score) if bug.risk_score else None,
        assignee_id=str(bug.assignee_id) if bug.assignee_id else None,
        reporter_id=str(bug.reporter_id) if bug.reporter_id else None,
        duplicate_of=str(bug.duplicate_of) if bug.duplicate_of else None,
        ticket_url=bug.ticket_url,
        description=bug.description,
        steps_to_reproduce=bug.steps_to_reproduce,
        expected_behavior=bug.expected_behavior,
        actual_behavior=bug.actual_behavior,
        env_fingerprint=bug.env_fingerprint,
        metadata_=bug.metadata_,
        first_seen_at=bug.first_seen_at,
        last_seen_at=bug.last_seen_at,
        resolved_at=bug.resolved_at,
        created_at=bug.created_at,
        updated_at=bug.updated_at,
        captures=[
            {
                "id": str(c.id),
                "capture_type": c.capture_type,
                "file_url": c.file_url,
                "file_size_bytes": c.file_size_bytes,
                "created_at": c.created_at,
            }
            for c in captures
        ],
    )


def _guess_capture_type(filename: str) -> str:
    name = filename.lower()
    if name.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp")):
        return "screenshot"
    if name.endswith((".mp4", ".webm", ".avi", ".mov")):
        return "video"
    if name.endswith((".har",)):
        return "network_har"
    if "console" in name or name.endswith((".log",)):
        return "console_log"
    if "dom" in name or name.endswith((".html", ".htm")):
        return "dom_snapshot"
    if "env" in name or "fingerprint" in name:
        return "env_fingerprint"
    return "screenshot"  # default
