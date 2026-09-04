import math
import hashlib
from typing import List, Optional
import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def generate_deterministic_vector(text: str, dimension: int = 1536) -> List[float]:
    """Generates a deterministic normalized unit vector based on text hash for mock/test environments."""
    # Hash seed
    hash_digest = hashlib.sha256(text.encode("utf-8")).digest()
    raw_floats = []
    for i in range(dimension):
        byte_val = hash_digest[i % len(hash_digest)]
        # Generate pseudo-random float between -1 and 1
        raw_floats.append(math.sin(byte_val * (i + 1)))

    norm = math.sqrt(sum(x * x for x in raw_floats)) or 1.0
    return [x / norm for x in raw_floats]


class EmbeddingService:
    """Provider-agnostic OpenAI-compatible embeddings service using pure HTTP client."""

    def __init__(
        self,
        api_base: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        dimension: Optional[int] = None,
    ):
        self.api_base = (api_base or settings.EMBEDDING_API_BASE).rstrip("/")
        self.api_key = api_key or settings.EMBEDDING_API_KEY
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self.dimension = dimension or settings.EMBEDDING_DIMENSION
        self.batch_size = 32

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates dense vector embeddings for a list of texts in batches."""
        if not texts:
            return []

        # If running in mock/dev test mode with mock key, return deterministic test vectors
        if self.api_key in ("mock-key", "mock-key-for-tests", "test", "") or settings.ENVIRONMENT == "test":
            return [generate_deterministic_vector(t, self.dimension) for t in texts]

        all_embeddings: List[List[float]] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(0, len(texts), self.batch_size):
                batch = texts[i : i + self.batch_size]
                url = f"{self.api_base}/embeddings"
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "input": batch,
                    "model": self.model_name,
                }

                try:
                    response = await client.post(url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    # OpenAI standard format: data["data"][i]["embedding"] sorted by index
                    sorted_items = sorted(data["data"], key=lambda x: x["index"])
                    batch_embeddings = [item["embedding"] for item in sorted_items]
                    all_embeddings.extend(batch_embeddings)
                except httpx.HTTPError as e:
                    logger.error("embedding_api_call_failed", error=str(e), url=url)
                    # Fallback to deterministic vector if in development or raise
                    if settings.ENVIRONMENT in ("development", "test"):
                        all_embeddings.extend([generate_deterministic_vector(t, self.dimension) for t in batch])
                    else:
                        raise

        return all_embeddings


embedding_service = EmbeddingService()
