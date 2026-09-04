import uuid
from typing import Any, Dict, List, Optional
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams, PayloadSchemaType, PointStruct

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class VectorRepository:
    def __init__(self, client: Optional[AsyncQdrantClient] = None):
        if client is not None:
            self._client = client
        elif settings.QDRANT_URL == ":memory:":
            self._client = AsyncQdrantClient(location=":memory:")
        else:
            self._client = AsyncQdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
            )
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self.dimension = settings.EMBEDDING_DIMENSION
        self._initialized = False

    async def ensure_collection(self) -> None:
        """Ensures that the target collection exists with cosine distance and keyword payload indexes."""
        if self._initialized:
            return

        collections_response = await self._client.get_collections()
        existing = [c.name for c in collections_response.collections]

        if self.collection_name not in existing:
            logger.info("creating_qdrant_collection", collection=self.collection_name, dimension=self.dimension)
            await self._client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.dimension,
                    distance=Distance.COSINE,
                ),
            )

            # Create keyword payload index on organization_id for strict tenant isolation
            await self._client.create_payload_index(
                collection_name=self.collection_name,
                field_name="organization_id",
                field_schema=PayloadSchemaType.KEYWORD,
            )

            # Create keyword payload index on document_id for atomic cascade purge
            await self._client.create_payload_index(
                collection_name=self.collection_name,
                field_name="document_id",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            logger.info("qdrant_indexes_created", collection=self.collection_name)

        self._initialized = True

    async def upsert_chunks(
        self,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        chunks: List[Dict[str, Any]],
    ) -> int:
        """Upserts a list of embedded chunks into Qdrant strictly tagged with tenant metadata."""
        await self.ensure_collection()

        points: List[PointStruct] = []
        for chunk in chunks:
            point_id = str(
                chunk.get("id")
                or uuid.uuid5(document_id, str(chunk.get("chunk_index", 0)))
            )
            points.append(
                PointStruct(
                    id=point_id,
                    vector=chunk["vector"],
                    payload={
                        "organization_id": str(organization_id),
                        "document_id": str(document_id),
                        "chunk_index": chunk["chunk_index"],
                        "text": chunk["text"],
                        "token_count": chunk.get("token_count", 0),
                        "title": chunk.get("title", ""),
                        "created_at": chunk.get("created_at", ""),
                    },
                )
            )

        if points:
            await self._client.upsert(
                collection_name=self.collection_name,
                points=points,
                wait=True,
            )
            logger.info(
                "vector_chunks_indexed",
                organization_id=str(organization_id),
                document_id=str(document_id),
                chunk_count=len(points),
            )

        return len(points)

    async def purge_by_document(
        self,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
    ) -> bool:
        """Purges all vector embeddings belonging to a specific document under tenant isolation."""
        await self.ensure_collection()

        filter_condition = models.Filter(
            must=[
                models.FieldCondition(
                    key="organization_id",
                    match=models.MatchValue(value=str(organization_id)),
                ),
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchValue(value=str(document_id)),
                ),
            ]
        )

        try:
            await self._client.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(filter=filter_condition),
                wait=True,
            )
            logger.info(
                "purged_document_vectors",
                organization_id=str(organization_id),
                document_id=str(document_id),
            )
            return True
        except Exception as e:
            logger.error(
                "failed_purging_document_vectors",
                organization_id=str(organization_id),
                document_id=str(document_id),
                error=str(e),
            )
            return False

    async def count_by_document(
        self,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
    ) -> int:
        """Counts existing vector points for a document under tenant isolation."""
        await self.ensure_collection()

        filter_condition = models.Filter(
            must=[
                models.FieldCondition(
                    key="organization_id",
                    match=models.MatchValue(value=str(organization_id)),
                ),
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchValue(value=str(document_id)),
                ),
            ]
        )

        result = await self._client.count(
            collection_name=self.collection_name,
            count_filter=filter_condition,
            exact=True,
        )
        return result.count

    async def search_tenant_chunks(
        self,
        organization_id: uuid.UUID,
        query_vector: List[float],
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Searches for semantically similar chunks with strictly enforced organization_id payload filtering."""
        await self.ensure_collection()

        filter_condition = models.Filter(
            must=[
                models.FieldCondition(
                    key="organization_id",
                    match=models.MatchValue(value=str(organization_id)),
                )
            ]
        )

        # Support both query_points (modern) and search
        if hasattr(self._client, "query_points"):
            results = await self._client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=filter_condition,
                limit=limit,
            )
            scored_points = results.points
        else:
            scored_points = await self._client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=filter_condition,
                limit=limit,
            )

        return [
            {
                "id": str(p.id),
                "score": p.score,
                "payload": p.payload,
            }
            for p in scored_points
        ]

    async def close(self) -> None:
        await self._client.close()


# Shared singleton instance
vector_repo = VectorRepository()
