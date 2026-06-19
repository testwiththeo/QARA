from __future__ import annotations

import logging
from typing import Literal

import httpx
import numpy as np

from app.config import settings

logger = logging.getLogger("qara.embeddings")


async def probe_embedding_endpoint() -> Literal["9router", "tfidf"]:
    """On startup, probe whether 9Router supports embeddings."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.nine_router_url}/embeddings",
                json={"model": settings.nine_router_model, "input": "test"},
                headers={"Authorization": "Bearer dummy"},
            )
            if resp.status_code == 200:
                logger.info("9Router embedding endpoint available")
                return "9router"
    except (httpx.TimeoutException, httpx.ConnectError):
        pass
    logger.info("9Router embedding unavailable, using TF-IDF fallback")
    return "tfidf"


async def get_embedding(text: str) -> list[float]:
    """Get a 384-dim embedding for the given text."""
    if settings.embedding_provider == "9router":
        from app.llm.client import LLMClient
        client = LLMClient()
        result = await client.embed(text)
        if result is not None:
            # Pad/truncate to 384 dims
            if len(result) < 384:
                result = result + [0.0] * (384 - len(result))
            return result[:384]

    # TF-IDF fallback
    return tfidf_embed(text)


class TfidfEmbedder:
    """Singleton TF-IDF embedder for when 9Router embeddings are unavailable."""

    _instance: TfidfEmbedder | None = None
    _vectorizer = None

    def __init__(self):
        from sklearn.feature_extraction.text import TfidfVectorizer
        self._vectorizer = TfidfVectorizer(max_features=384)
        self._fitted = False

    @classmethod
    def get_instance(cls) -> TfidfEmbedder:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def embed(self, text: str) -> list[float]:
        if not self._fitted:
            # Fit on this single text — incremental
            self._vectorizer.fit([text])
            self._fitted = True
        else:
            # Refit with existing vocabulary, ignoring new terms
            pass

        vec = self._vectorizer.transform([text])
        arr = vec.toarray()[0]
        if len(arr) < 384:
            arr = np.pad(arr, (0, 384 - len(arr)))
        return arr[:384].tolist()


def tfidf_embed(text: str) -> list[float]:
    embedder = TfidfEmbedder.get_instance()
    return embedder.embed(text)
