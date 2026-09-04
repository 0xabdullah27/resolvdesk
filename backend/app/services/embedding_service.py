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

    @property
    def is_cohere(self) -> bool:
        """Determines if the configured provider is Cohere."""
        return "cohere.com" in self.api_base or self.model_name.startswith("embed-")

    async def get_embeddings(
        self,
        texts: List[str],
        input_type: str = "search_document",
    ) -> List[List[float]]:
        """Generates dense vector embeddings for a list of texts in batches.
        
        Supports both OpenAI-compatible endpoints (/v1/embeddings) and Cohere (/v2/embed).
        """
        if not texts:
            return []

        # If running in mock/dev test mode with mock key, return deterministic test vectors
        if self.api_key in ("mock-key", "mock-key-for-tests", "test", "") or settings.ENVIRONMENT == "test":
            return [generate_deterministic_vector(t, self.dimension) for t in texts]

        all_embeddings: List[List[float]] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(0, len(texts), self.batch_size):
                batch = texts[i : i + self.batch_size]
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }

                if self.is_cohere:
                    # Cohere v2 API endpoint & payload format
                    base = self.api_base if self.api_base.endswith("/v2") else f"{self.api_base}/v2"
                    url = f"{base}/embed"
                    payload = {
                        "model": self.model_name,
                        "texts": batch,
                        "input_type": input_type,
                        "embedding_types": ["float"],
                    }
                else:
                    # OpenAI-compatible API endpoint & payload format
                    url = f"{self.api_base}/embeddings"
                    payload = {
                        "input": batch,
                        "model": self.model_name,
                    }

                try:
                    response = await client.post(url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()

                    if self.is_cohere:
                        # Cohere v2 returns {"embeddings": {"float": [[...], [...]]}}
                        embeddings_data = data.get("embeddings", {})
                        if isinstance(embeddings_data, dict) and "float" in embeddings_data:
                            batch_embeddings = embeddings_data["float"]
                        elif isinstance(embeddings_data, list):
                            batch_embeddings = embeddings_data
                        else:
                            raise ValueError(f"Unexpected Cohere embeddings format: {data}")
                    else:
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
