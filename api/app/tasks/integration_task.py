from __future__ import annotations

import logging
import uuid

import arq

from app.tasks.settings import redis_settings

logger = logging.getLogger("qara.tasks.integration")


async def enqueue_integration_tasks(bug_id: str, tenant_id: str) -> None:
    """Enqueue Jira + Slack tasks if integrations are configured."""
    from app.database import async_session_factory
    from app.models.integration import Integration
    from sqlalchemy import select

    async with async_session_factory() as db:
        result = await db.execute(
            select(Integration).where(
                Integration.tenant_id == uuid.UUID(tenant_id),
                Integration.enabled == True,
            )
        )
        integrations = list(result.scalars().all())

    try:
        redis_pool = await arq.create_pool(redis_settings)
        for integration in integrations:
            if integration.provider == "jira":
                await redis_pool.enqueue_job("create_jira_ticket", bug_id)
            elif integration.provider == "slack":
                await redis_pool.enqueue_job("send_slack_notify", bug_id)
    except Exception as e:
        logger.warning("Failed to enqueue integration tasks: %s", e)


async def create_jira_ticket(ctx: dict, bug_id: str) -> None:
    """ARQ task: Create a Jira ticket for a bug."""
    from app.database import async_session_factory
    from app.models.bug_report import BugReport
    from app.models.integration import Integration
    from app.integrations.jira_client import JiraClient
    from sqlalchemy import select
    from datetime import datetime, timezone

    async with async_session_factory() as db:
        # Load bug
        result = await db.execute(
            select(BugReport).where(BugReport.id == uuid.UUID(bug_id))
        )
        bug = result.scalar_one_or_none()
        if bug is None:
            logger.error("Bug %s not found for Jira ticket creation", bug_id)
            return

        # Load Jira integration
        int_result = await db.execute(
            select(Integration).where(
                Integration.tenant_id == bug.tenant_id,
                Integration.provider == "jira",
                Integration.enabled == True,
            )
        )
        integration = int_result.scalar_one_or_none()
        if integration is None:
            return

        config = integration.config
        client = JiraClient(
            url=config["url"],
            email=config["email"],
            api_token=config["api_token"],
        )

        try:
            resp = await client.create_issue(
                project_key=config["project_key"],
                summary=bug.title,
                description=bug.description or "",
                severity=bug.severity or "P2",
            )
            # Update bug ticket_url
            ticket_key = resp.get("key")
            if ticket_key:
                bug.ticket_url = f"{config['url'].rstrip('/')}/browse/{ticket_key}"
                bug.updated_at = datetime.now(timezone.utc)
                await db.flush()
                await db.commit()
                logger.info("Created Jira ticket %s for bug %s", ticket_key, bug_id)
        except Exception as e:
            logger.error("Failed to create Jira ticket for bug %s: %s", bug_id, e)
            raise


async def send_slack_notify(ctx: dict, bug_id: str) -> None:
    """ARQ task: Send Slack notification for a bug."""
    from app.database import async_session_factory
    from app.models.bug_report import BugReport
    from app.models.bug_capture import BugCapture
    from app.models.integration import Integration
    from app.integrations.slack_client import SlackClient
    from sqlalchemy import select

    async with async_session_factory() as db:
        # Load bug
        result = await db.execute(
            select(BugReport).where(BugReport.id == uuid.UUID(bug_id))
        )
        bug = result.scalar_one_or_none()
        if bug is None:
            logger.error("Bug %s not found for Slack notification", bug_id)
            return

        # Load Slack integration
        int_result = await db.execute(
            select(Integration).where(
                Integration.tenant_id == bug.tenant_id,
                Integration.provider == "slack",
                Integration.enabled == True,
            )
        )
        integration = int_result.scalar_one_or_none()
        if integration is None:
            return

        config = integration.config
        client = SlackClient(bot_token=config["bot_token"])

        # Get screenshot if available
        cap_result = await db.execute(
            select(BugCapture).where(
                BugCapture.bug_report_id == bug.id,
                BugCapture.capture_type == "screenshot",
            ).limit(1)
        )
        screenshot = cap_result.scalar_one_or_none()
        screenshot_url = screenshot.file_url if screenshot else None

        try:
            blocks = SlackClient.build_bug_blocks(bug, screenshot_url=screenshot_url)
            await client.post_message(
                channel=config["channel"],
                text=f"New bug: [{bug.severity or 'Unset'}] {bug.title}",
                blocks=blocks,
            )
            logger.info("Sent Slack notification for bug %s", bug_id)
        except Exception as e:
            logger.error("Failed to send Slack notification for bug %s: %s", bug_id, e)
            raise
