from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.audit import AuditMiddleware
from app.routes import health, auth, bugs, captures, projects, integrations


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup / shutdown lifecycle."""
    # --- startup ---
    from app.services.storage_service import StorageService
    from app.llm.embeddings import probe_embedding_endpoint

    # Probe embedding provider
    settings.embedding_provider = await probe_embedding_endpoint()

    # Ensure MinIO bucket exists
    storage = StorageService()
    await storage.ensure_bucket()

    yield
    # --- shutdown ---


def create_app() -> FastAPI:
    app = FastAPI(
        title="QARA API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # --- middleware ---
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"chrome-extension://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(AuditMiddleware)

    # --- routers under /api/v1 ---
    api_prefix = "/api/v1"
    app.include_router(health.router, prefix=api_prefix, tags=["health"])
    app.include_router(auth.router, prefix=api_prefix, tags=["auth"])
    app.include_router(bugs.router, prefix=api_prefix, tags=["bugs"])
    app.include_router(captures.router, prefix=api_prefix, tags=["captures"])
    app.include_router(projects.router, prefix=api_prefix, tags=["projects"])
    app.include_router(integrations.router, prefix=api_prefix, tags=["integrations"])

    return app


app = create_app()
