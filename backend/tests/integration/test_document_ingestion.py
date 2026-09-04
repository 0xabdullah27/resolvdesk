import uuid
import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from app.models.document import DocumentStatus
from app.repos.document_repo import document_repo
from app.repos.vector_repo import vector_repo
from app.services.ingestion_service import ingestion_service
from tests.conftest import issue_test_jwt


async def create_tenant(db_session: AsyncSession, name: str, email: str) -> tuple[Owner, str]:
    """Helper to create an organization, owner, and signed JWT."""
    org = Organization(display_name=name)
    db_session.add(org)
    await db_session.flush()

    owner = Owner(
        email=email,
        full_name=f"{name} Admin",
        status=OwnerStatus.ACTIVE,
        organization_id=org.id,
    )
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    token = issue_test_jwt(
        sub=str(owner.id),
        email=owner.email,
        organization_id=str(org.id),
    )
    return owner, token


@pytest.mark.asyncio
async def test_complete_ingestion_pipeline(client: AsyncClient, db_session: AsyncSession):
    """Verifies that an uploaded markdown file runs through chunking, embedding, and indexes points in Qdrant."""
    owner, token = await create_tenant(db_session, "Alpha Org", "alpha@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    md_content = b"""# Product Catalog

## Electronics
- Wireless noise-canceling headphones
- Ergonomic mechanical keyboard with custom switches

## Accessories
- USB-C fast charging cable
- Premium felt desk mat
"""
    files = {"file": ("products.md", md_content, "text/markdown")}

    # Upload document
    resp = await client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert resp.status_code == 202
    doc_id = uuid.UUID(resp.json()["id"])

    # Directly run ingestion pipeline to ensure synchronous completion in test environment
    await ingestion_service.ingest_document_text(
        document_id=doc_id,
        organization_id=owner.organization_id,
        text_content=md_content.decode("utf-8"),
        title="products.md",
    )

    # Check updated document status in DB
    updated_doc = await document_repo.get_by_id_and_org(db_session, doc_id, owner.organization_id)
    assert updated_doc is not None
    assert updated_doc.status == DocumentStatus.READY
    assert updated_doc.chunk_count >= 1
    assert updated_doc.character_count == len(md_content)
    assert "# Product Catalog" in (updated_doc.content_preview or "")

    # Verify vector points exist in Qdrant
    vector_count = await vector_repo.count_by_document(owner.organization_id, doc_id)
    assert vector_count == updated_doc.chunk_count


@pytest.mark.asyncio
async def test_tenant_isolation_prevents_cross_org_access(client: AsyncClient, db_session: AsyncSession):
    """Verifies that Owner B cannot retrieve or delete documents belonging to Owner A."""
    owner_a, token_a = await create_tenant(db_session, "Store A", "admin_a@storea.com")
    owner_b, token_b = await create_tenant(db_session, "Store B", "admin_b@storeb.com")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Owner A creates document
    raw_payload = {"title": "Internal Strategy", "content": "Confidential store revenue targets."}
    resp_a = await client.post("/api/v1/documents/raw", headers=headers_a, json=raw_payload)
    assert resp_a.status_code == 202
    doc_id = resp_a.json()["id"]

    # Owner B tries to GET Owner A's document -> 404
    resp_b_get = await client.get(f"/api/v1/documents/{doc_id}", headers=headers_b)
    assert resp_b_get.status_code == 404

    # Owner B lists documents -> does not include doc_id
    resp_b_list = await client.get("/api/v1/documents", headers=headers_b)
    assert resp_b_list.status_code == 200
    assert not any(d["id"] == doc_id for d in resp_b_list.json()["items"])

    # Owner B tries to DELETE Owner A's document -> 404
    resp_b_delete = await client.delete(f"/api/v1/documents/{doc_id}", headers=headers_b)
    assert resp_b_delete.status_code == 404

    # Document still exists for Owner A
    resp_a_verify = await client.get(f"/api/v1/documents/{doc_id}", headers=headers_a)
    assert resp_a_verify.status_code == 200


@pytest.mark.asyncio
async def test_atomic_cross_store_deletion(client: AsyncClient, db_session: AsyncSession):
    """Verifies that deleting a document removes the PostgreSQL record AND purges all Qdrant vectors."""
    owner, token = await create_tenant(db_session, "Beta Org", "beta@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Ingest document and vectors
    raw_payload = {"title": "Temporary FAQ", "content": "This content will be deleted."}
    create_resp = await client.post("/api/v1/documents/raw", headers=headers, json=raw_payload)
    assert create_resp.status_code == 202
    doc_id = uuid.UUID(create_resp.json()["id"])

    # Run ingestion
    await ingestion_service.ingest_document_text(
        document_id=doc_id,
        organization_id=owner.organization_id,
        text_content=raw_payload["content"],
        title="Temporary FAQ",
    )

    # Verify vectors exist before deletion
    count_before = await vector_repo.count_by_document(owner.organization_id, doc_id)
    assert count_before >= 1

    # Execute atomic deletion
    del_resp = await client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert del_resp.status_code == 204

    # Verify PostgreSQL row is gone
    doc_in_db = await document_repo.get_by_id_and_org(db_session, doc_id, owner.organization_id)
    assert doc_in_db is None

    # Verify Qdrant points are completely purged (0 remaining)
    count_after = await vector_repo.count_by_document(owner.organization_id, doc_id)
    assert count_after == 0


@pytest.mark.asyncio
async def test_cross_store_rollback_on_vector_failure(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    """Verifies that if Qdrant purge fails, PostgreSQL record deletion is rolled back."""
    owner, token = await create_tenant(db_session, "Gamma Org", "gamma@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    raw_payload = {"title": "Important Document", "content": "Important business data."}
    create_resp = await client.post("/api/v1/documents/raw", headers=headers, json=raw_payload)
    doc_id = uuid.UUID(create_resp.json()["id"])

    # Simulate Qdrant purge failure
    async def _mock_purge_failure(*args, **kwargs):
        return False

    monkeypatch.setattr(vector_repo, "purge_by_document", _mock_purge_failure)

    # Attempt deletion -> returns 500
    del_resp = await client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert del_resp.status_code == 500
    assert "cross-store consistency" in del_resp.json()["detail"]

    # Verify PostgreSQL document row still exists (not deleted)
    doc_in_db = await document_repo.get_by_id_and_org(db_session, doc_id, owner.organization_id)
    assert doc_in_db is not None
