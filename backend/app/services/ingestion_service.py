import uuid
from typing import Optional
from app.core.database import async_session_factory
from app.core.logging import get_logger
from app.core.config import settings
from app.models.document import DocumentStatus
from app.repos.document_repo import document_repo
from app.repos.vector_repo import vector_repo
from app.services.chunker_service import chunk_text
from app.services.embedding_service import embedding_service

logger = get_logger(__name__)


class IngestionService:
    """Orchestrates background document ingestion: chunking, embedding, vector indexing, and status tracking."""

    async def ingest_document_text(
        self,
        document_id: uuid.UUID,
        organization_id: uuid.UUID,
        text_content: str,
        title: str,
    ) -> None:
        """Executes the full background pipeline for an extracted or submitted document text."""
        logger.info(
            "start_ingestion_pipeline",
            document_id=str(document_id),
            organization_id=str(organization_id),
            chars=len(text_content),
        )

        async with async_session_factory() as session:
            # 1. Update status to PROCESSING
            await document_repo.update_status(
                session=session,
                document_id=document_id,
                organization_id=organization_id,
                status=DocumentStatus.PROCESSING,
                content_preview=text_content[:500],
            )
            await session.commit()

        try:
            # 2. Partition into semantic chunks
            chunks = chunk_text(
                text=text_content,
                target_tokens=settings.CHUNK_SIZE_TOKENS,
                overlap_tokens=settings.CHUNK_OVERLAP_TOKENS,
            )

            if not chunks:
                raise ValueError("No valid chunks produced from document content.")

            # 3. Generate embeddings
            texts = [c["text"] for c in chunks]
            embeddings = await embedding_service.get_embeddings(texts)

            if len(embeddings) != len(chunks):
                raise ValueError(
                    f"Embedding count mismatch: expected {len(chunks)}, got {len(embeddings)}"
                )

            # 4. Attach vector and metadata to chunk items
            for i, chunk in enumerate(chunks):
                chunk["vector"] = embeddings[i]
                chunk["title"] = title

            # 5. Index chunks in Qdrant with tenant payload tags
            indexed_count = await vector_repo.upsert_chunks(
                organization_id=organization_id,
                document_id=document_id,
                chunks=chunks,
            )

            # 6. Mark document as READY in PostgreSQL
            async with async_session_factory() as session:
                await document_repo.update_status(
                    session=session,
                    document_id=document_id,
                    organization_id=organization_id,
                    status=DocumentStatus.READY,
                    chunk_count=indexed_count,
                    character_count=len(text_content),
                    content_preview=text_content[:500],
                )
                await session.commit()

            logger.info(
                "ingestion_pipeline_ready",
                document_id=str(document_id),
                organization_id=str(organization_id),
                chunk_count=indexed_count,
            )

        except Exception as e:
            logger.error(
                "ingestion_pipeline_failed",
                document_id=str(document_id),
                organization_id=str(organization_id),
                error=str(e),
            )

            # Clean up any partial vector points in Qdrant to uphold consistency
            try:
                await vector_repo.purge_by_document(organization_id, document_id)
            except Exception as cleanup_err:
                logger.warning(
                    "vector_cleanup_after_ingest_failure_failed",
                    error=str(cleanup_err),
                )

            # Update document to FAILED state
            async with async_session_factory() as session:
                await document_repo.update_status(
                    session=session,
                    document_id=document_id,
                    organization_id=organization_id,
                    status=DocumentStatus.FAILED,
                    error_message=str(e)[:1000],
                )
                await session.commit()


ingestion_service = IngestionService()
