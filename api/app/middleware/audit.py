from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.database import async_session_factory

logger = logging.getLogger("qara.audit")

# Routes that should be audited (state-changing methods)
AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATHS = {"/api/v1/health", "/api/v1/ready"}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)

        if (
            request.method in AUDIT_METHODS
            and request.url.path not in SKIP_PATHS
            and 200 <= response.status_code < 300
        ):
            try:
                await self._log_audit(request, response)
            except Exception:
                logger.exception("Failed to write audit log")

        return response

    async def _log_audit(self, request: Request, response: Response) -> None:
        from sqlalchemy import text

        user_id = None
        tenant_id = None
        if hasattr(request.state, "user_id"):
            user_id = request.state.user_id
        if hasattr(request.state, "tenant_id"):
            tenant_id = request.state.tenant_id

        entity_type = self._extract_entity_type(request.url.path)
        entity_id = self._extract_entity_id(request.url.path)
        request_id = getattr(request.state, "request_id", None)

        async with async_session_factory() as session:
            await session.execute(
                text(
                    """
                    INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, changes, ip_address, created_at)
                    VALUES (:tenant_id, :user_id, :action, :entity_type, :entity_id, :changes, :ip_address, :created_at)
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "action": f"{request.method} {request.url.path}",
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "changes": json.dumps({"request_id": request_id, "status_code": response.status_code}),
                    "ip_address": request.client.host if request.client else None,
                    "created_at": datetime.now(timezone.utc),
                },
            )
            await session.commit()

    @staticmethod
    def _extract_entity_type(path: str) -> str | None:
        parts = path.strip("/").split("/")
        # /api/v1/bugs/... -> bugs
        if len(parts) >= 3:
            return parts[2]
        return None

    @staticmethod
    def _extract_entity_id(path: str) -> str | None:
        parts = path.strip("/").split("/")
        # /api/v1/bugs/{id} -> id
        if len(parts) >= 4:
            candidate = parts[3]
            try:
                import uuid
                uuid.UUID(candidate)
                return candidate
            except ValueError:
                return None
        return None
