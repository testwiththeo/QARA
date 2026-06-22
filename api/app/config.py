from __future__ import annotations

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://qara:qara@localhost:5432/qara"
    database_url_sync: str = "postgresql://qara:qara@localhost:5432/qara"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "qara-captures"
    minio_use_ssl: bool = False

    # 9Router (LLM)
    nine_router_url: str = "http://host.docker.internal:20128/v1"
    nine_router_model: str = "qoder/qmodel-latest"
    embedding_provider: Literal["9router", "tfidf"] = "9router"
    embedding_dimension: int = 384

    # Auth / JWT
    jwt_secret: str = "change-me-to-random-64-char-string"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30
    jwt_algorithm: str = "HS256"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000,chrome-extension://*"

    # Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_max_upload_size: int = 52_428_800  # 50 MB

    # Worker
    arq_max_tries: int = 3
    arq_retry_delay: int = 10


settings = Settings()
