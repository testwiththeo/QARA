"""Triage service integration tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_triage_bug(client: AsyncClient, auth_headers: dict, sample_bug: dict):
    resp = await client.post(
        f"/api/v1/bugs/{sample_bug['id']}/triage",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "severity" in data
    assert "component" in data
    assert "risk_score" in data
    assert "duplicate_of" in data
    assert data["severity"] in ("P0", "P1", "P2", "P3")


@pytest.mark.asyncio
async def test_triage_requires_existing_bug(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/v1/bugs/00000000-0000-0000-0000-000000000000/triage",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_triage_updates_bug_status(client: AsyncClient, auth_headers: dict, sample_bug: dict):
    await client.post(
        f"/api/v1/bugs/{sample_bug['id']}/triage",
        headers=auth_headers,
    )
    resp = await client.get(f"/api/v1/bugs/{sample_bug['id']}", headers=auth_headers)
    assert resp.json()["status"] == "triaged"
