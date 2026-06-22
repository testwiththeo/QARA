from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bug_report import BugReport
from sqlalchemy import text

logger = logging.getLogger("qara.triage")


async def find_similar_bugs(
    db: AsyncSession,
    bug_id: uuid.UUID,
    *,
    limit: int = 5,
    threshold: float = 0.7,
) -> list[dict]:
    """Find similar bugs using pgvector cosine similarity."""
    # First get the embedding for this bug
    emb_result = await db.execute(
        text("SELECT embedding FROM bug_embeddings WHERE bug_report_id = :bug_id"),
        {"bug_id": str(bug_id)},
    )
    row = emb_result.first()
    if row is None:
        return []

    embedding = row[0]

    # Similarity search
    result = await db.execute(
        text(
            """
            SELECT be.bug_report_id, br.title, br.severity, br.status,
                   1 - (be.embedding <=> :embedding::vector) AS similarity
            FROM bug_embeddings be
            JOIN bug_reports br ON br.id = be.bug_report_id
            WHERE be.bug_report_id != :bug_id
              AND 1 - (be.embedding <=> :embedding::vector) > :threshold
            ORDER BY be.embedding <=> :embedding::vector
            LIMIT :limit
            """
        ),
        {
            "bug_id": str(bug_id),
            "embedding": str(embedding),
            "threshold": threshold,
            "limit": limit,
        },
    )

    return [
        {
            "bug_report_id": row[0],
            "title": row[1],
            "severity": row[2],
            "status": row[3],
            "similarity": float(row[4]),
        }
        for row in result.fetchall()
    ]
