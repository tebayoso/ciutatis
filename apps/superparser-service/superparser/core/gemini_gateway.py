from __future__ import annotations

import hashlib
import math
import time
from typing import Protocol


class EmbeddingClient(Protocol):
    def embed(self, texts: list[str], model: str) -> list[list[float]]:
        ...


class DeterministicEmbeddingClient:
    """Local deterministic embedding fallback for tests and offline demos."""

    def embed(self, texts: list[str], model: str) -> list[list[float]]:
        return [_hash_embedding(text, dimensions=16) for text in texts]


class GeminiApiEmbeddingClient:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def embed(self, texts: list[str], model: str) -> list[list[float]]:  # pragma: no cover - live API path
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=self.api_key)
        vectors: list[list[float]] = []
        for text in texts:
            response = genai.embed_content(model=model, content=text)
            vectors.append([float(value) for value in response["embedding"]])
        return vectors


class GeminiGateway:
    def __init__(
        self,
        api_key: str | None,
        embedding_client: EmbeddingClient | None = None,
        embedding_model: str = "models/text-embedding-004",
        max_retries: int = 3,
        retry_sleep_sec: float = 0.05,
    ):
        self.api_key = api_key
        self.embedding_model = embedding_model
        self.max_retries = max_retries
        self.retry_sleep_sec = retry_sleep_sec
        if embedding_client is not None:
            self.embedding_client = embedding_client
        elif api_key:
            self.embedding_client = GeminiApiEmbeddingClient(api_key)
        else:
            self.embedding_client = DeterministicEmbeddingClient()

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                return self.embedding_client.embed(texts, self.embedding_model)
            except Exception as exc:  # pragma: no cover - retry branch covered by fake client
                last_error = exc
                if attempt >= self.max_retries:
                    break
                time.sleep(self.retry_sleep_sec * (2 ** attempt))
        raise RuntimeError(f"embedding request failed after retries: {last_error}") from last_error


def _hash_embedding(text: str, dimensions: int) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values = []
    for idx in range(dimensions):
        byte = digest[idx % len(digest)]
        values.append((byte / 255.0) * 2.0 - 1.0)
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [round(value / norm, 6) for value in values]
