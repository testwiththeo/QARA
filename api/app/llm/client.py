from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger("qara.llm")


class LLMClient:
    """Async OpenAI-compatible client for 9Router."""

    def __init__(self) -> None:
        self.base_url = settings.nine_router_url
        self.model = settings.nine_router_model
        self.timeout = 30.0
        self.max_retries = 3

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        response_format: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        last_error: Exception | None = None
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload,
                        headers={"Authorization": "Bearer dummy"},
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                last_error = e
                logger.warning("LLM request attempt %d/%d failed: %s", attempt + 1, self.max_retries, e)
                if attempt < self.max_retries - 1:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
            except httpx.HTTPStatusError as e:
                raise RuntimeError(f"LLM API error: {e.response.status_code} {e.response.text}")

        raise RuntimeError(f"LLM request failed after {self.max_retries} attempts: {last_error}")

    async def embed(self, text: str) -> list[float] | None:
        """Get embedding for text. Returns None if unavailable."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.base_url}/embeddings",
                    json={"model": self.model, "input": text},
                    headers={"Authorization": "Bearer dummy"},
                )
                resp.raise_for_status()
                data = resp.json()
                return data["data"][0]["embedding"]
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError):
            return None
