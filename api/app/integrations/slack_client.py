from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger("qara.slack")


class SlackClient:
    """Async Slack Web API client."""

    BASE_URL = "https://slack.com/api"

    def __init__(self, bot_token: str) -> None:
        self.bot_token = bot_token
        self.timeout = 15.0

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.bot_token}",
            "Content-Type": "application/json",
        }

    async def post_message(
        self,
        *,
        channel: str,
        text: str,
        blocks: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Post a message to a Slack channel."""
        payload: dict[str, Any] = {
            "channel": channel,
            "text": text,
        }
        if blocks:
            payload["blocks"] = blocks

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.BASE_URL}/chat.postMessage",
                json=payload,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("ok"):
                raise RuntimeError(f"Slack API error: {data.get('error')}")
            return data

    async def test_connection(self) -> dict[str, str]:
        """Test Slack connectivity via auth.test."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(
                f"{self.BASE_URL}/auth.test",
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("ok"):
                raise RuntimeError(f"Slack auth failed: {data.get('error')}")
            return {
                "success": "true",
                "message": f"Connected to Slack as {data.get('user', 'unknown')} in workspace {data.get('team', 'unknown')}.",
            }

    @staticmethod
    def build_bug_blocks(bug, screenshot_url: str | None = None) -> list[dict[str, Any]]:
        """Build Block Kit message for a bug report."""
        severity_emoji = {"P0": "🔴", "P1": "🟠", "P2": "🟡", "P3": "🔵"}
        emoji = severity_emoji.get(bug.severity, "⚪")

        blocks: list[dict[str, Any]] = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"{emoji} [{bug.severity or 'Unset'}] {bug.title[:150]}"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Status:* {bug.status}"},
                    {"type": "mrkdwn", "text": f"*Severity:* {bug.severity or 'Pending'}"},
                    {"type": "mrkdwn", "text": f"*Component:* {bug.component or 'TBD'}"},
                    {"type": "mrkdwn", "text": f"*Risk Score:* {bug.risk_score or 'N/A'}"},
                ],
            },
        ]

        if bug.description:
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": bug.description[:500]},
            })

        if screenshot_url:
            blocks.append({
                "type": "image",
                "image_url": screenshot_url,
                "alt_text": "Bug screenshot",
            })

        blocks.append({"type": "divider"})

        return blocks
