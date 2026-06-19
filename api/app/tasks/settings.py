from __future__ import annotations

from arq.connections import RedisSettings

from app.config import settings


def parse_redis_url(url: str) -> RedisSettings:
    """Parse redis://host:port/db into RedisSettings."""
    url = url.replace("redis://", "")
    parts = url.split("/")
    host_port = parts[0]
    db = int(parts[1]) if len(parts) > 1 else 0

    if ":" in host_port:
        host, port = host_port.split(":")
        port = int(port)
    else:
        host = host_port
        port = 6379

    return RedisSettings(host=host, port=port, database=db)


redis_settings = parse_redis_url(settings.redis_url)
