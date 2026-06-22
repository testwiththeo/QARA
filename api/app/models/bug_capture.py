from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, BigInteger, DateTime, JSON, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class BugCapture(Base):
    __tablename__ = "bug_captures"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    bug_report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bug_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    capture_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("NOW()"),
    )

    # relationships
    bug_report = relationship("BugReport", back_populates="captures", lazy="selectin")
