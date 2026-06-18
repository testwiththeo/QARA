"""Integration webhook tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_webhook_receive(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/v1/webhooks/incoming",
        json={
            "event": "bug.created",
            "payload": {"bug_id": "b-123", "title": "Test bug"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_sync_integration(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/v1/integrations/sync",
        json={"provider": "jira"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
