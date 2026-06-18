"""Bug report API integration tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_bug(client: AsyncClient, auth_headers: dict, sample_project: dict):
    resp = await client.post(
        "/api/v1/bugs",
        json={
            "title": "Login button unresponsive on Safari 17",
            "description": "Clicking login does nothing",
            "steps_to_reproduce": "1. Open Safari 17\n2. Go to /login\n3. Click button",
            "expected_behavior": "Redirect to dashboard",
            "actual_behavior": "Nothing happens",
            "severity": "P1",
            "component": "auth",
            "project_id": sample_project["id"],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Login button unresponsive on Safari 17"
    assert data["severity"] == "P1"
    assert data["component"] == "auth"
    assert data["status"] == "open"
    assert "id" in data
    assert "risk_score" in data
    assert "ticket_url" in data


@pytest.mark.asyncio
async def test_create_bug_missing_title(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/v1/bugs",
        json={"severity": "P1"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_bug_invalid_severity(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/v1/bugs",
        json={"title": "Test", "severity": "P5", "project_id": "00000000-0000-0000-0000-000000000001"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_bugs(client: AsyncClient, auth_headers: dict, sample_bug: dict):
    resp = await client.get("/api/v1/bugs", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_bug(client: AsyncClient, auth_headers: dict, sample_bug: dict):
    resp = await client.get(f"/api/v1/bugs/{sample_bug['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == sample_bug["id"]


@pytest.mark.asyncio
async def test_get_bug_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get(
        "/api/v1/bugs/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_bug_status(client: AsyncClient, auth_headers: dict, sample_bug: dict):
    resp = await client.patch(
        f"/api/v1/bugs/{sample_bug['id']}",
        json={"status": "triaging"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "triaging"


@pytest.mark.asyncio
async def test_update_bug_invalid_transition(client: AsyncClient, auth_headers: dict, sample_bug: dict):
    resp = await client.patch(
        f"/api/v1/bugs/{sample_bug['id']}",
        json={"status": "closed"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_find_similar_bugs(client: AsyncClient, auth_headers: dict, sample_bug: dict):
    resp = await client.get(
        f"/api/v1/bugs/{sample_bug['id']}/similar?limit=5",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_merge_duplicates(client: AsyncClient, auth_headers: dict, sample_project: dict):
    b1 = await client.post(
        "/api/v1/bugs",
        json={"title": "Bug one", "severity": "P2", "project_id": sample_project["id"]},
        headers=auth_headers,
    )
    b2 = await client.post(
        "/api/v1/bugs",
        json={"title": "Bug two", "severity": "P3", "project_id": sample_project["id"]},
        headers=auth_headers,
    )
    resp = await client.post(
        f"/api/v1/bugs/{b1.json()['id']}/merge",
        json={"target_bug_id": b2.json()["id"]},
        headers=auth_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_bug_with_captures(client: AsyncClient, auth_headers: dict, sample_project: dict):
    files = {
        "screenshot": ("screen.png", b"fake-png-content", "image/png"),
    }
    resp = await client.post(
        "/api/v1/bugs",
        data={
            "title": "Bug with screenshot",
            "project_id": sample_project["id"],
        },
        files=files,
        headers=auth_headers,
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_bug_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/bugs")
    assert resp.status_code == 401
