"""create audit_log table (partitioned)

Revision ID: 007
Revises: 006
Create Date: 2026-06-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Partitioned table requires raw SQL
    op.execute(
        """
        CREATE TABLE audit_log (
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            tenant_id UUID REFERENCES tenants(id),
            user_id UUID REFERENCES users(id),
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50),
            entity_id UUID,
            changes JSONB,
            ip_address INET,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at)
        """
    )
    op.execute(
        """
        CREATE TABLE audit_log_y2026 PARTITION OF audit_log
            FOR VALUES FROM ('2026-01-01') TO ('2027-01-01')
        """
    )
    op.create_index("idx_audit_tenant_entity", "audit_log", ["tenant_id", "entity_id"])


def downgrade() -> None:
    op.drop_index("idx_audit_tenant_entity", table_name="audit_log")
    op.execute("DROP TABLE IF EXISTS audit_log_y2026")
    op.execute("DROP TABLE IF EXISTS audit_log")
