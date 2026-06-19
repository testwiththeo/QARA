"""create projects table

Revision ID: 003
Revises: 002
Create Date: 2026-06-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("vcs_url", sa.String(500), nullable=True),
        sa.Column(
            "settings",
            sa.JSON(),
            server_default='{"auto_create_test_case": true, "auto_assign": true, "triage_model": "ai"}',
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_projects_tenant", "projects", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("idx_projects_tenant", table_name="projects")
    op.drop_table("projects")
