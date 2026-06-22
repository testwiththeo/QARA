from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bug_capture import BugCapture
from app.models.bug_report import BugReport
from app.services.storage_service import StorageService

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


async def upload_capture_file(
    db: AsyncSession,
    *,
    bug_id: uuid.UUID,
    tenant_id: uuid.UUID,
    capture_type: str,
    file: UploadFile,
) -> BugCapture:
    # Verify bug exists
    result = await db.execute(
        select(BugReport).where(BugReport.id == bug_id, BugReport.tenant_id == tenant_id)
    )
    bug = result.scalar_one_or_none()
    if bug is None:
        raise HTTPException(status_code=404, detail="Bug not found")

    # Read file
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    # Content hash
    content_hash = hashlib.sha256(contents).hexdigest()

    # Upload to MinIO
    storage = StorageService()
    filename = file.filename or f"{capture_type}_{uuid.uuid4().hex[:8]}"
    key = f"{tenant_id}/{bug_id}/{capture_type}/{filename}"
    file_url = await storage.put_object(
        key=key,
        body=contents,
        content_type=file.content_type or "application/octet-stream",
    )

    # Create DB record
    capture = BugCapture(
        bug_report_id=bug_id,
        capture_type=capture_type,
        file_url=file_url,
        file_size_bytes=len(contents),
        content_hash=content_hash,
        metadata_={"key": key, "filename": filename},
    )
    db.add(capture)
    await db.flush()
    return capture


async def list_captures_by_bug(
    db: AsyncSession, bug_id: uuid.UUID
) -> list[BugCapture]:
    result = await db.execute(
        select(BugCapture)
        .where(BugCapture.bug_report_id == bug_id)
        .order_by(BugCapture.created_at)
    )
    return list(result.scalars().all())


async def get_capture(
    db: AsyncSession, capture_id: uuid.UUID
) -> BugCapture:
    result = await db.execute(
        select(BugCapture).where(BugCapture.id == capture_id)
    )
    capture = result.scalar_one_or_none()
    if capture is None:
        raise HTTPException(status_code=404, detail="Capture not found")
    return capture


async def get_presigned_url(capture: BugCapture) -> str:
    storage = StorageService()
    key = (capture.metadata_ or {}).get("key")
    if not key:
        raise HTTPException(status_code=404, detail="File key not found")
    return await storage.get_presigned_url(key)
