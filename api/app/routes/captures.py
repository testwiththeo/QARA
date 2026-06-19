from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.schemas.capture import CaptureListResponse, CaptureUploadResponse
from app.services import capture_service
from app.models.user import User

router = APIRouter(prefix="/captures")


@router.post("/upload", response_model=CaptureUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_capture(
    bug_report_id: str = Form(...),
    capture_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    valid_types = {
        "screenshot", "video", "console_log", "network_har",
        "dom_snapshot", "env_fingerprint", "session_replay",
    }
    if capture_type not in valid_types:
        raise HTTPException(status_code=422, detail=f"Invalid capture_type. Must be one of: {valid_types}")

    capture = await capture_service.upload_capture_file(
        db,
        bug_id=uuid.UUID(bug_report_id),
        tenant_id=user.tenant_id,
        capture_type=capture_type,
        file=file,
    )
    return CaptureUploadResponse(
        id=str(capture.id),
        bug_report_id=str(capture.bug_report_id),
        capture_type=capture.capture_type,
        file_url=capture.file_url,
        file_size_bytes=capture.file_size_bytes,
        created_at=capture.created_at,
    )


@router.get("/{capture_id}")
async def get_capture(
    capture_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    capture = await capture_service.get_capture(db, capture_id)
    url = await capture_service.get_presigned_url(capture)
    return RedirectResponse(url=url, status_code=302)


@router.get("/bug/{bug_id}", response_model=CaptureListResponse)
async def list_captures_for_bug(
    bug_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    captures = await capture_service.list_captures_by_bug(db, bug_id)
    return CaptureListResponse(
        items=[
            CaptureUploadResponse(
                id=str(c.id),
                bug_report_id=str(c.bug_report_id),
                capture_type=c.capture_type,
                file_url=c.file_url,
                file_size_bytes=c.file_size_bytes,
                created_at=c.created_at,
            )
            for c in captures
        ]
    )
