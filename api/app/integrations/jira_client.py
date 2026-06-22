from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger("qara.jira")

# Priority mapping: QARA severity → Jira priority name
PRIORITY_MAP = {
    "P0": "Highest",
    "P1": "High",
    "P2": "Medium",
    "P3": "Low",
}


class JiraClient:
    """Async Jira REST API v3 client."""

    def __init__(self, url: str, email: str, api_token: str) -> None:
        self.base_url = url.rstrip("/")
        self.email = email
        self.api_token = api_token
        self.timeout = 30.0
        self._project_cache: dict[str, dict] | None = None
        self._issue_type_cache: dict[str, dict] | None = None

    def _auth_headers(self) -> dict[str, str]:
        import base64
        creds = base64.b64encode(f"{self.email}:{self.api_token}".encode()).decode()
        return {
            "Authorization": f"Basic {creds}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def create_issue(
        self,
        *,
        project_key: str,
        summary: str,
        description: str,
        severity: str = "P2",
        issue_type: str = "Bug",
    ) -> dict[str, Any]:
        """Create a Jira issue and return the response."""
        # Resolve project ID and issue type ID
        project_id = await self._get_project_id(project_key)
        issue_type_id = await self._get_issue_type_id(issue_type)
        priority_name = PRIORITY_MAP.get(severity, "Medium")

        payload = {
            "fields": {
                "project": {"id": project_id},
                "summary": summary,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": description}],
                        }
                    ],
                },
                "issuetype": {"id": issue_type_id},
                "priority": {"name": priority_name},
            }
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/rest/api/3/issue",
                json=payload,
                headers=self._auth_headers(),
            )
            resp.raise_for_status()
            return resp.json()

    async def get_projects(self) -> list[dict]:
        """Get all Jira projects."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(
                f"{self.base_url}/rest/api/3/project",
                headers=self._auth_headers(),
            )
            resp.raise_for_status()
            projects = resp.json()
            self._project_cache = {p["key"]: p for p in projects}
            return projects

    async def get_issue_types(self) -> list[dict]:
        """Get all issue types."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(
                f"{self.base_url}/rest/api/3/issuetype",
                headers=self._auth_headers(),
            )
            resp.raise_for_status()
            types = resp.json()
            self._issue_type_cache = {t["name"]: t for t in types}
            return types

    async def test_connection(self) -> dict[str, str]:
        """Test Jira connectivity."""
        projects = await self.get_projects()
        issue_types = await self.get_issue_types()
        return {
            "success": "true",
            "message": f"Connected to Jira. Found {len(projects)} projects and {len(issue_types)} issue types.",
        }

    async def _get_project_id(self, project_key: str) -> str:
        if self._project_cache is None:
            await self.get_projects()
        project = (self._project_cache or {}).get(project_key)
        if project is None:
            raise ValueError(f"Jira project '{project_key}' not found")
        return project["id"]

    async def _get_issue_type_id(self, name: str) -> str:
        if self._issue_type_cache is None:
            await self.get_issue_types()
        issue_type = (self._issue_type_cache or {}).get(name)
        if issue_type is None:
            raise ValueError(f"Jira issue type '{name}' not found")
        return issue_type["id"]
