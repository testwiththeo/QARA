"""Integration test fixtures for QARA API."""

import json
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.core.config import Settings
from app.db.base import Base

TEST_DB_URL = "postgres+asyncpg://postgres:test@localhost:5432/qara_test"
TEST_REDIS_URL = "redis://localhost:6379"


@pytest.fixture(scope="session")
def settings():
    return Settings(
        database_url=TEST_DB_URL,
        redis_url=TEST_REDIS_URL,
        jwt_secret="test-secret-not-for-prod",
        nine_router_url="http://localhost:20128/v1",
        nine_router_api_key="test-key",
        s3_endpoint="http://localhost:9000",
        s3_bucket="qara-test",
        environment="test",
    )


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@qara.dev", "password": "TestPass123!", "name": "Test QA"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def sample_bug(client: AsyncClient, auth_headers: dict) -> dict:
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
            "project_id": "00000000-0000-0000-0000-000000000001",
        },
        headers=auth_headers,
    )
    return resp.json()


@pytest_asyncio.fixture
async def sample_project(client: AsyncClient, auth_headers: dict) -> dict:
    resp = await client.post(
        "/api/v1/projects",
        json={"name": "Test Project", "slug": "test-project"},
        headers=auth_headers,
    )
    return resp.json()


class Helpers:
    """Convenient helpers for test assertions."""

    @staticmethod
    def assert_ok(resp):
        assert resp.status_code in (200, 201), f"Expected 2xx, got {resp.status_code}: {resp.text}"

    @staticmethod
    def assert_error(resp, status_code: int, code: str = None):
        assert resp.status_code == status_code, f"Expected {status_code}, got {resp.status_code}"
        if code:
            assert resp.json()["error"]["code"] == code

    @staticmethod
    def load_json(path: str):
        with open(path) as f:
            return json.load(f)
