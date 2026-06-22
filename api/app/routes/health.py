from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def ready(db: AsyncSession = Depends(get_db)):
    checks: dict[str, str] = {}

    # Database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "fail"

    # Redis
    try:
        import redis.asyncio as aioredis
        from app.config import settings

        r = aioredis.from_url(settings.redis_url)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "fail"

    # MinIO
    try:
        import boto3
        from app.config import settings

        s3 = boto3.client(
            "s3",
            endpoint_url=f"{'https' if settings.minio_use_ssl else 'http'}://{settings.minio_endpoint}",
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
        )
        s3.head_bucket(Bucket=settings.minio_bucket)
        checks["minio"] = "ok"
    except Exception:
        checks["minio"] = "fail"

    # 9Router
    try:
        import httpx
        from app.config import settings

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.nine_router_url}/embeddings",
                json={"model": settings.nine_router_model, "input": "test"},
            )
            checks["9router"] = "ok" if resp.status_code == 200 else "degraded"
    except Exception:
        checks["9router"] = "degraded"

    all_ok = all(v == "ok" for v in checks.values())
    return {
        "status": "ready" if all_ok else "degraded",
        "checks": checks,
    }
