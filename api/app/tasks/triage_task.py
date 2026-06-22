from __future__ import annotations

import asyncio
import json
import logging
import uuid
from decimal import Decimal

import arq

from app.config import settings
from app.tasks.settings import redis_settings

logger = logging.getLogger("qara.tasks.triage")


async def enqueue_triage(bug_id: str) -> None:
    """Enqueue a triage task for a bug."""
    try:
        redis_pool = await arq.create_pool(redis_settings)
        await redis_pool.enqueue_job("triage_bug", bug_id)
        logger.info("Enqueued triage for bug %s", bug_id)
    except Exception as e:
        logger.warning("Failed to enqueue triage for bug %s: %s", bug_id, e)


async def triage_bug(ctx: dict, bug_id: str) -> None:
    """ARQ task: triage a bug report using LLM."""
    from app.database import async_session_factory
    from app.models.bug_report import BugReport
    from app.models.bug_capture import BugCapture
    from app.llm.client import LLMClient
    from app.llm.prompts import TRIAGE_SYSTEM_PROMPT, TRIAGE_USER_TEMPLATE
    from app.llm.embeddings import get_embedding
    from sqlalchemy import select, text, cast
    from sqlalchemy.types import UserDefinedType
    from datetime import datetime, timezone

    class Vector(UserDefinedType):
        """pgvector type for SQLAlchemy."""
        def get_col_spec(self):
            return "VECTOR"
        def bind_processor(self, dialect):
            def process(value):
                if isinstance(value, list):
                    return "[" + ",".join(str(v) for v in value) + "]"
                return value
            return process
        def bind_expression(self, bindvalue):
            return cast(bindvalue, Vector())

    async with async_session_factory() as db:
        # 1. Load bug + captures
        result = await db.execute(
            select(BugReport).where(BugReport.id == uuid.UUID(bug_id))
        )
        bug = result.scalar_one_or_none()
        if bug is None:
            logger.error("Bug %s not found for triage", bug_id)
            return

        # Update status to triaging
        if bug.status == "open":
            bug.status = "triaging"
            await db.flush()

        # Load captures
        cap_result = await db.execute(
            select(BugCapture).where(BugCapture.bug_report_id == bug.id)
        )
        captures = list(cap_result.scalars().all())

        # Extract console errors and env info
        console_errors = ""
        browser = ""
        os_info = ""
        url = ""
        for cap in captures:
            if cap.capture_type == "console_log" and cap.metadata_:
                console_errors = json.dumps(cap.metadata_)
            if cap.capture_type == "env_fingerprint" and cap.metadata_:
                env = cap.metadata_
                browser = env.get("browser", "")
                os_info = env.get("os", "")
                url = env.get("url", "")

        # 2. Build prompt
        user_content = TRIAGE_USER_TEMPLATE.format(
            title=bug.title,
            description=bug.description or "",
            steps_to_reproduce=bug.steps_to_reproduce or "",
            expected_behavior=bug.expected_behavior or "",
            actual_behavior=bug.actual_behavior or "",
            url=url,
            browser=browser,
            os=os_info,
            console_errors=console_errors,
        )

        # 3. Call LLM (savepoint so failure doesn't poison transaction)
        try:
            async with db.begin_nested():
                client = LLMClient()
                raw = await client.chat_completion(
                    messages=[
                        {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                )
                triage = json.loads(raw)

                if "severity" in triage:
                    bug.severity = triage["severity"]
                if "component" in triage:
                    bug.component = triage["component"]
                if "risk_score" in triage:
                    try:
                        bug.risk_score = Decimal(str(triage["risk_score"]))
                    except Exception:
                        pass
                bug.updated_at = datetime.now(timezone.utc)
                await db.flush()
        except Exception as e:
            logger.warning("LLM triage failed for bug %s: %s", bug_id, e)

        # 5. Generate embedding
        embedding = None
        embed_text = f"{bug.title} {bug.description or ''}"
        try:
            embedding = await get_embedding(embed_text)
        except Exception as e:
            logger.warning("Embedding generation failed for bug %s: %s", bug_id, e)

        if embedding is not None:
            vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

            # Store embedding (savepoint to protect transaction)
            try:
                async with db.begin_nested():
                    await db.execute(
                        text(
                            """
                            INSERT INTO bug_embeddings (id, bug_report_id, embedding, created_at)
                            VALUES (gen_random_uuid(), :bug_id, cast(:vec as vector), NOW())
                            ON CONFLICT (bug_report_id) DO UPDATE SET embedding = EXCLUDED.embedding
                            """
                        ),
                        {"bug_id": str(bug.id), "vec": vec_str},
                    )
                    await db.flush()
                    logger.info("Stored embedding for bug %s", bug_id)
            except Exception as e:
                logger.warning("Embedding storage failed for bug %s: %s", bug_id, e)

            # Cosine similarity search for duplicates
            try:
                async with db.begin_nested():
                    sim_result = await db.execute(
                        text(
                            """
                            SELECT be.bug_report_id, br.title, br.severity, br.status,
                                   1 - (be.embedding <=> cast(:vec as vector)) AS similarity
                            FROM bug_embeddings be
                            JOIN bug_reports br ON br.id = be.bug_report_id
                            WHERE be.bug_report_id != :bug_id
                              AND 1 - (be.embedding <=> cast(:vec as vector)) > 0.85
                            ORDER BY be.embedding <=> cast(:vec as vector)
                            LIMIT 1
                            """
                        ),
                        {"bug_id": str(bug.id), "vec": vec_str},
                    )
                    duplicate = sim_result.first()
                    if duplicate:
                        bug.duplicate_of = uuid.UUID(str(duplicate[0]))
                        logger.info("Found duplicate for bug %s: %s", bug_id, duplicate[0])
                        await db.flush()
            except Exception as e:
                logger.warning("Similarity search failed for bug %s: %s", bug_id, e)

        # Update status to triaged
        if bug.status == "triaging":
            bug.status = "triaged"
            bug.updated_at = datetime.now(timezone.utc)
            await db.flush()

        await db.commit()
        logger.info("Triage complete for bug %s: severity=%s, component=%s",
                     bug_id, bug.severity, bug.component)

        # 8. Enqueue integrations if configured
        try:
            from app.tasks.integration_task import enqueue_integration_tasks
            await enqueue_integration_tasks(str(bug.id), str(bug.tenant_id))
        except Exception as e:
            logger.warning("Failed to enqueue integration tasks for bug %s: %s", bug_id, e)
