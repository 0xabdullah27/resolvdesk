import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.document import Document, DocumentStatus


class DocumentRepository:
    """PostgreSQL repository for Document entity with strict query-level tenant isolation."""

    async def create(self, session: AsyncSession, document: Document) -> Document:
        """Persists a new document row."""
        session.add(document)
        await session.flush()
        await session.refresh(document)
        return document

    async def get_by_id_and_org(
        self,
        session: AsyncSession,
        document_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> Optional[Document]:
        """Retrieves a document enforcing organization_id at the SQL query level."""
        statement = select(Document).where(
            Document.id == document_id,
            Document.organization_id == organization_id,
        )
        result = await session.exec(statement)
        return result.first()

    async def get_by_org_and_title(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        title: str,
    ) -> Optional[Document]:
        """Retrieves a document by organization_id and title to check for duplicate filenames."""
        statement = select(Document).where(
            Document.organization_id == organization_id,
            Document.title == title,
        )
        result = await session.exec(statement)
        return result.first()

    async def list_by_org(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Document]:
        """Retrieves a paginated list of documents belonging strictly to the organization."""
        statement = (
            select(Document)
            .where(Document.organization_id == organization_id)
            .order_by(Document.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await session.exec(statement)
        return list(result.all())

    async def count_by_org(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> int:
        """Counts total active documents for the organization to enforce capacity limits."""
        statement = (
            select(func.count(Document.id))
            .where(Document.organization_id == organization_id)
        )
        result = await session.exec(statement)
        count = result.one()
        return count or 0

    async def update_status(
        self,
        session: AsyncSession,
        document_id: uuid.UUID,
        organization_id: uuid.UUID,
        status: DocumentStatus,
        chunk_count: int = 0,
        character_count: int = 0,
        content_preview: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[Document]:
        """Updates document status, metrics, and preview snippet within tenant boundary."""
        doc = await self.get_by_id_and_org(session, document_id, organization_id)
        if not doc:
            return None

        doc.status = status
        doc.chunk_count = chunk_count
        doc.character_count = character_count
        if content_preview is not None:
            doc.content_preview = content_preview[:500]
        doc.error_message = error_message
        doc.updated_at = datetime.now(timezone.utc)

        session.add(doc)
        await session.flush()
        await session.refresh(doc)
        return doc

    async def delete_by_id_and_org(
        self,
        session: AsyncSession,
        document_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> bool:
        """Deletes a document row enforcing tenant isolation filter."""
        doc = await self.get_by_id_and_org(session, document_id, organization_id)
        if not doc:
            return False

        await session.delete(doc)
        await session.flush()
        return True

    async def get_active_document_titles(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 5,
    ) -> List[str]:
        """Retrieves active completed document titles belonging strictly to the organization."""
        statement = (
            select(Document.title)
            .where(
                Document.organization_id == organization_id,
                Document.status == DocumentStatus.COMPLETED.value,
            )
            .order_by(Document.created_at.desc())
            .limit(limit)
        )
        result = await session.exec(statement)
        return [row for row in result.all() if row]


document_repo = DocumentRepository()
