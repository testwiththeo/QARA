"""Authentication API integration tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@qara.dev",
            "password": "StrongPass123!",
            "name": "New User",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "newuser@qara.dev"


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@qara.dev", "password": "StrongPass123!", "name": "Dup"},
    )
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@qara.dev", "password": "StrongPass123!", "name": "Dup"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "weak@qara.dev", "password": "123", "name": "Weak"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login@qara.dev", "password": "StrongPass123!", "name": "Login"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "login@qara.dev", "password": "StrongPass123!"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nonexist@qara.dev", "password": "wrong"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "refresh@qara.dev", "password": "StrongPass123!", "name": "Refresh"},
    )
    refresh = reg.json()["refresh_token"]
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient):
    resp = await client.get("/api/v1/bugs")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_invalid_token(client: AsyncClient):
    resp = await client.get("/api/v1/bugs", headers={"Authorization": "Bearer invalid"})
    assert resp.status_code == 401
