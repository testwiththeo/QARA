"""create bug_reports table

Revision ID: 004
Revises: 003
Create Date: 2026-06-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bug_reports",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("steps_to_reproduce", sa.Text(), nullable=True),
        sa.Column("expected_behavior", sa.Text(), nullable=True),
        sa.Column("actual_behavior", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(5), nullable=True),
        sa.Column("status", sa.String(20), server_default="open"),
        sa.Column("component", sa.String(255), nullable=True),
        sa.Column("assignee_id", sa.UUID(), nullable=True),
        sa.Column("reporter_id", sa.UUID(), nullable=True),
        sa.Column("duplicate_of", sa.UUID(), nullable=True),
        sa.Column("risk_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("regression_zones", sa.JSON(), nullable=True),
        sa.Column("env_fingerprint", sa.JSON(), nullable=True),
        sa.Column("ticket_url", sa.String(1000), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assignee_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["duplicate_of"], ["bug_reports.id"]),
        sa.CheckConstraint("severity IN ('P0','P1','P2','P3')", name="ck_bug_severity"),
    )
    op.create_index("idx_bugs_project_status", "bug_reports", ["project_id", "status"])
    op.create_index("idx_bugs_assignee", "bug_reports", ["assignee_id"])
    op.create_index("idx_bugs_severity", "bug_reports", ["severity"])
    op.create_index("idx_bugs_created", "bug_reports", [sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_index("idx_bugs_created", table_name="bug_reports")
    op.drop_index("idx_bugs_severity", table_name="bug_reports")
    op.drop_index("idx_bugs_assignee", table_name="bug_reports")
    op.drop_index("idx_bugs_project_status", table_name="bug_reports")
    op.drop_table("bug_reports")
