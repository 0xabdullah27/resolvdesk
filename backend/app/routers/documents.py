import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status, BackgroundTasks
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import get_current_owner
from app.core.database import get_db
from app.models.owner import Owner
from app.schemas.document import DocumentListResponse, DocumentRead, RawDocumentCreate
from app.services.document_service import document_service
from app.services.ingestion_service import ingestion_service

router = APIRouter()


@router.post(
    "/upload",
    response_model=DocumentRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload document file for ingestion",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    """Uploads a document file (.pdf, .docx, .txt, .md) and triggers background ingestion."""
    filename = file.filename or "uploaded_document"
    content = await file.read()

    doc, clean_text = await document_service.prepare_file_upload(
        session=session,
        organization_id=current_owner.organization_id,
        filename=filename,
        content=content,
        title=title,
    )
    await session.commit()

    # Schedule background extraction, chunking, embedding, and indexing
    background_tasks.add_task(
        ingestion_service.ingest_document_text,
        document_id=doc.id,
        organization_id=current_owner.organization_id,
        text_content=clean_text,
        title=doc.title,
    )

    return doc


@router.post(
    "/raw",
    response_model=DocumentRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest manual raw text snippet",
)
async def ingest_raw_text(
    body: RawDocumentCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    """Submits a raw text snippet (up to 100,000 characters) and triggers background ingestion."""
    doc, clean_text = await document_service.prepare_raw_text(
        session=session,
        organization_id=current_owner.organization_id,
        title=body.title,
        content=body.content,
    )
    await session.commit()

    background_tasks.add_task(
        ingestion_service.ingest_document_text,
        document_id=doc.id,
        organization_id=current_owner.organization_id,
        text_content=clean_text,
        title=doc.title,
    )

    return doc


@router.get(
    "",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List organization documents",
)
async def list_documents(
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    """Retrieves a paginated list of documents belonging to the authenticated organization."""
    total, items = await document_service.list_documents(
        session=session,
        organization_id=current_owner.organization_id,
        limit=min(limit, 100),
        offset=offset,
    )
    return DocumentListResponse(total=total, items=items)


@router.get(
    "/{document_id}",
    response_model=DocumentRead,
    status_code=status.HTTP_200_OK,
    summary="Get document details and preview",
)
async def get_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    """Inspects an individual document's metadata, status, chunk metrics, and content preview."""
    doc = await document_service.get_document(
        session=session,
        document_id=document_id,
        organization_id=current_owner.organization_id,
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return doc


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Atomically delete document and vector points",
)
async def delete_document(
    document_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    current_owner: Owner = Depends(get_current_owner),
):
    """Atomically removes the document record from PostgreSQL and purges all vector chunks from Qdrant."""
    deleted = await document_service.delete_document_atomic(
        session=session,
        document_id=document_id,
        organization_id=current_owner.organization_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
