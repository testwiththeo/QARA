"""create bug_captures table

Revision ID: 005
Revises: 004
Create Date: 2026-06-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bug_captures",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("bug_report_id", sa.UUID(), nullable=False),
        sa.Column("capture_type", sa.String(20), nullable=False),
        sa.Column("file_url", sa.String(1000), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("content_hash", sa.String(64), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["bug_report_id"], ["bug_reports.id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "capture_type IN ('screenshot','video','console_log','network_har','dom_snapshot','env_fingerprint','session_replay')",
            name="ck_capture_type",
        ),
    )
    op.create_index("idx_captures_bug", "bug_captures", ["bug_report_id"])


def downgrade() -> None:
    op.drop_index("idx_captures_bug", table_name="bug_captures")
    op.drop_table("bug_captures")
