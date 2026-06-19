"""create bug_embeddings table with pgvector

Revision ID: 008
Revises: 007
Create Date: 2026-06-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "bug_embeddings",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("bug_report_id", sa.UUID(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=False),  # vector type handled raw
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["bug_report_id"], ["bug_reports.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("bug_report_id"),
    )

    # Replace the text column with actual vector type
    op.execute(
        "ALTER TABLE bug_embeddings ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384)"
    )

    # HNSW index works on empty tables (unlike IVFFlat)
    op.execute(
        """
        CREATE INDEX idx_bug_embeddings_vector
            ON bug_embeddings USING hnsw (embedding vector_cosine_ops)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_bug_embeddings_vector")
    op.drop_table("bug_embeddings")
