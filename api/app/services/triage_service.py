from __future__ import annotations

import logging
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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

    # The embedding from pgvector comes as a string like "[0.1,0.2,...]"
    embedding = row[0]
    if not isinstance(embedding, str):
        embedding = str(embedding)

    # Similarity search using cast() to avoid parameter naming conflicts
    result = await db.execute(
        text(
            """
            SELECT be.bug_report_id, br.title, br.severity, br.status,
                   1 - (be.embedding <=> cast(:emb as vector)) AS similarity
            FROM bug_embeddings be
            JOIN bug_reports br ON br.id = be.bug_report_id
            WHERE be.bug_report_id != :bug_id
              AND 1 - (be.embedding <=> cast(:emb as vector)) > :threshold
            ORDER BY be.embedding <=> cast(:emb as vector)
            LIMIT :limit
            """
        ),
        {
            "bug_id": str(bug_id),
            "emb": embedding,
            "threshold": threshold,
            "limit": limit,
        },
    )

    return [
        {
            "bug_report_id": r[0],
            "title": r[1],
            "severity": r[2],
            "status": r[3],
            "similarity": float(r[4]),
        }
        for r in result.fetchall()
    ]
