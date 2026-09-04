import uuid
import pytest
from unittest.mock import AsyncMock, patch

from app.core.exceptions import (
    CapacityLimitException,
    DuplicateDocumentException,
    PayloadTooLargeException,
    UnprocessableContentException,
)
from app.models.document import Document, DocumentStatus, DocumentType
from app.services.document_service import document_service


@pytest.mark.asyncio
async def test_prepare_file_upload_capacity_limit():
    session = AsyncMock()
    org_id = uuid.uuid4()

    with patch("app.services.document_service.document_repo.count_by_org", new_callable=AsyncMock) as mock_count:
        mock_count.return_value = 50
        with pytest.raises(CapacityLimitException) as exc_info:
            await document_service.prepare_file_upload(
                session=session,
                organization_id=org_id,
                filename="doc.txt",
                content=b"Hello world",
            )
        assert exc_info.value.status_code == 400
        assert "Organization document limit" in exc_info.value.detail


@pytest.mark.asyncio
async def test_prepare_file_upload_oversized():
    session = AsyncMock()
    org_id = uuid.uuid4()
    huge_content = b"A" * (10 * 1024 * 1024 + 1)

    with pytest.raises(PayloadTooLargeException) as exc_info:
        await document_service.prepare_file_upload(
            session=session,
            organization_id=org_id,
            filename="large.txt",
            content=huge_content,
        )
    assert exc_info.value.status_code == 413


@pytest.mark.asyncio
async def test_prepare_raw_text_capacity_limit():
    session = AsyncMock()
    org_id = uuid.uuid4()

    with patch("app.services.document_service.document_repo.count_by_org", new_callable=AsyncMock) as mock_count:
        mock_count.return_value = 50
        with pytest.raises(CapacityLimitException):
            await document_service.prepare_raw_text(
                session=session,
                organization_id=org_id,
                title="Notes",
                content="Valid content",
            )


@pytest.mark.asyncio
async def test_prepare_raw_text_length_bounds():
    session = AsyncMock()
    org_id = uuid.uuid4()

    # Empty text
    with pytest.raises(UnprocessableContentException):
        await document_service.prepare_raw_text(
            session=session,
            organization_id=org_id,
            title="Empty",
            content="   ",
        )

    # Exceeding 100k chars
    with pytest.raises(UnprocessableContentException):
        await document_service.prepare_raw_text(
            session=session,
            organization_id=org_id,
            title="Too Big",
            content="x" * 100_001,
        )


@pytest.mark.asyncio
async def test_prepare_file_upload_duplicate_title():
    session = AsyncMock()
    org_id = uuid.uuid4()

    with patch("app.services.document_service.document_repo.count_by_org", new_callable=AsyncMock) as mock_count, \
         patch("app.services.document_service.document_repo.get_by_org_and_title", new_callable=AsyncMock) as mock_get:
        mock_count.return_value = 5
        mock_get.return_value = Document(
            id=uuid.uuid4(),
            organization_id=org_id,
            title="existing.txt",
            file_type=DocumentType.TXT,
            file_size_bytes=100,
            status=DocumentStatus.READY,
        )

        with pytest.raises(DuplicateDocumentException):
            await document_service.prepare_file_upload(
                session=session,
                organization_id=org_id,
                filename="existing.txt",
                content=b"Sample content",
            )
