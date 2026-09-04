import uuid
from typing import List, Optional, Tuple
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    CapacityLimitException,
    DuplicateDocumentException,
    PayloadTooLargeException,
    UnprocessableContentException,
    CrossStoreSyncException,
)
from app.models.document import Document, DocumentStatus, DocumentType
from app.repos.document_repo import document_repo
from app.repos.vector_repo import vector_repo
from app.services.parsers import detect_document_type, extract_text_from_file


class DocumentService:
    """Business logic and validation service for knowledge base document operations."""

    async def prepare_file_upload(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        filename: str,
        content: bytes,
        title: Optional[str] = None,
    ) -> Tuple[Document, str]:
        """Validates capacity, filename uniqueness, payload size, format, and extracts readable text."""
        # 1. Validate payload size (<= 10MB)
        file_size = len(content)
        if file_size > settings.MAX_DOCUMENT_SIZE_BYTES:
            raise PayloadTooLargeException()

        # 2. Check organization capacity (< 50)
        current_count = await document_repo.count_by_org(session, organization_id)
        if current_count >= settings.MAX_DOCUMENTS_PER_ORG:
            raise CapacityLimitException()

        # 3. Detect format and extract text (raises UnsupportedMediaTypeException / UnprocessableContentException)
        doc_type = detect_document_type(filename)
        clean_text = extract_text_from_file(filename, content)

        effective_title = (title or filename).strip()

        # 4. Check for duplicate filename/title in this organization
        existing_doc = await document_repo.get_by_org_and_title(session, organization_id, effective_title)
        if existing_doc is not None:
            raise DuplicateDocumentException(
                f"A document with filename '{effective_title}' already exists for this organization."
            )

        # 5. Create document in initial UPLOADING state
        document = Document(
            organization_id=organization_id,
            title=effective_title,
            file_type=doc_type,
            file_size_bytes=file_size,
            status=DocumentStatus.UPLOADING,
            character_count=len(clean_text),
            content_preview=clean_text[:500],
        )
        saved_doc = await document_repo.create(session, document)
        return saved_doc, clean_text

    async def prepare_raw_text(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        title: str,
        content: str,
    ) -> Tuple[Document, str]:
        """Validates capacity, duplicate title, text length bounds, and creates a raw document."""
        clean_title = title.strip()
        clean_content = content.strip()

        if not clean_content:
            raise UnprocessableContentException("Document contains no readable text.")

        if len(clean_content) > settings.MAX_RAW_TEXT_CHARS:
            raise UnprocessableContentException(
                f"Snippet content exceeds the maximum allowed length of {settings.MAX_RAW_TEXT_CHARS} characters."
            )

        # Check organization capacity (< 50)
        current_count = await document_repo.count_by_org(session, organization_id)
        if current_count >= settings.MAX_DOCUMENTS_PER_ORG:
            raise CapacityLimitException()

        # Check for duplicate title
        existing = await document_repo.get_by_org_and_title(session, organization_id, clean_title)
        if existing is not None:
            raise DuplicateDocumentException(
                f"A document with title '{clean_title}' already exists for this organization."
            )

        document = Document(
            organization_id=organization_id,
            title=clean_title,
            file_type=DocumentType.RAW,
            file_size_bytes=len(clean_content.encode("utf-8")),
            status=DocumentStatus.UPLOADING,
            character_count=len(clean_content),
            content_preview=clean_content[:500],
        )
        saved_doc = await document_repo.create(session, document)
        return saved_doc, clean_content

    async def list_documents(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[int, List[Document]]:
        """Retrieves paginated document items and total count for an organization."""
        total = await document_repo.count_by_org(session, organization_id)
        items = await document_repo.list_by_org(session, organization_id, limit=limit, offset=offset)
        return total, items

    async def get_document(
        self,
        session: AsyncSession,
        document_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> Optional[Document]:
        """Retrieves a single document verifying tenant ownership."""
        return await document_repo.get_by_id_and_org(session, document_id, organization_id)

    async def delete_document_atomic(
        self,
        session: AsyncSession,
        document_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> bool:
        """Atomically deletes a document: purges Qdrant points and deletes PostgreSQL record.

        Rolls back PostgreSQL transaction if vector purge fails.
        """
        # 1. Verify existence and ownership
        doc = await document_repo.get_by_id_and_org(session, document_id, organization_id)
        if not doc:
            return False

        # 2. Purge vector points from Qdrant first
        purge_ok = await vector_repo.purge_by_document(organization_id, document_id)
        if not purge_ok:
            raise CrossStoreSyncException()

        # 3. Delete PostgreSQL row in current transaction
        await document_repo.delete_by_id_and_org(session, document_id, organization_id)
        return True


document_service = DocumentService()
