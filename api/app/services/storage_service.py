from __future__ import annotations

import logging
from typing import Any

import boto3
from botocore.config import Config as BotoConfig

from app.config import settings

logger = logging.getLogger("qara.storage")


class StorageService:
    def __init__(self) -> None:
        self._endpoint = (
            f"{'https' if settings.minio_use_ssl else 'http'}://{settings.minio_endpoint}"
        )
        self._client = boto3.client(
            "s3",
            endpoint_url=self._endpoint,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=BotoConfig(signature_version="s3v4"),
        )
        self._bucket = settings.minio_bucket

    async def ensure_bucket(self) -> None:
        """Create bucket if it doesn't exist. Retries up to 5 times."""
        import time
        for attempt in range(5):
            try:
                self._client.head_bucket(Bucket=self._bucket)
                logger.info("MinIO bucket '%s' ready", self._bucket)
                return
            except Exception:
                try:
                    self._client.create_bucket(Bucket=self._bucket)
                    logger.info("Created MinIO bucket '%s'", self._bucket)
                    return
                except Exception:
                    if attempt < 4:
                        logger.warning("MinIO not ready, retry %d/5", attempt + 1)
                        time.sleep(2)
        logger.error("Failed to ensure MinIO bucket after 5 retries")

    async def put_object(
        self,
        key: str,
        body: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=body,
            ContentType=content_type,
        )
        return f"{self._endpoint}/{self._bucket}/{key}"

    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expires_in,
        )
