import uuid
import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.organization import Organization
from app.models.owner import Owner, OwnerStatus
from tests.conftest import issue_test_jwt


async def setup_test_owner(db_session: AsyncSession) -> tuple[Owner, str]:
    """Helper creating an organization and owner, returning owner and signed JWT."""
    org = Organization(display_name="Test Store")
    db_session.add(org)
    await db_session.flush()

    owner = Owner(
        email="owner@teststore.com",
        full_name="Store Owner",
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
async def test_upload_markdown_file_contract(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    md_content = b"# Store Policy\n\nReturns are valid within 30 days of receipt."
    files = {"file": ("return_policy.md", md_content, "text/markdown")}

    response = await client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert response.status_code == 202
    data = response.json()
    assert data["title"] == "return_policy.md"
    assert data["file_type"] == "md"
    assert data["file_size_bytes"] == len(md_content)
    assert data["status"] in ("uploading", "processing", "ready")
    assert "id" in data


@pytest.mark.asyncio
async def test_upload_duplicate_filename_returns_409(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    files = {"file": ("duplicate.md", b"# Header\nValid content.", "text/markdown")}

    # First upload succeeds
    resp1 = await client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert resp1.status_code == 202

    # Second upload with identical filename returns 409 Conflict
    files2 = {"file": ("duplicate.md", b"# Different content\nStill valid.", "text/markdown")}
    resp2 = await client.post("/api/v1/documents/upload", headers=headers, files=files2)
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_upload_zero_readable_text_returns_422(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    files = {"file": ("empty.txt", b"   \n\t  ", "text/plain")}
    response = await client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert response.status_code == 422
    assert "no readable text" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_unsupported_format_returns_415(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    files = {"file": ("malware.exe", b"MZBinaryData", "application/octet-stream")}
    response = await client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert response.status_code == 415
    assert "Unsupported file extension" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_oversized_file_returns_413(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    oversized_content = b"A" * (10 * 1024 * 1024 + 10)
    files = {"file": ("large.txt", oversized_content, "text/plain")}
    response = await client.post("/api/v1/documents/upload", headers=headers, files=files)
    assert response.status_code == 413
    assert "10 MB" in response.json()["detail"]


@pytest.mark.asyncio
async def test_raw_text_snippet_contract(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Shipping Rates",
        "content": "Free standard shipping on orders over $50 within the continental US.",
    }
    response = await client.post("/api/v1/documents/raw", headers=headers, json=payload)
    assert response.status_code == 202
    data = response.json()
    assert data["title"] == "Shipping Rates"
    assert data["file_type"] == "raw"
    assert data["character_count"] == len(payload["content"])


@pytest.mark.asyncio
async def test_raw_text_snippet_duplicate_title_returns_409(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"title": "FAQ", "content": "Valid FAQ content here."}
    resp1 = await client.post("/api/v1/documents/raw", headers=headers, json=payload)
    assert resp1.status_code == 202

    resp2 = await client.post("/api/v1/documents/raw", headers=headers, json=payload)
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_raw_text_snippet_exceeding_100k_chars_returns_422(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"title": "Long doc", "content": "A" * 100_001}
    response = await client.post("/api/v1/documents/raw", headers=headers, json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_and_get_documents_contract(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # Ingest a sample raw snippet
    raw_payload = {"title": "Store Guide", "content": "Step 1: Browse catalog. Step 2: Checkout."}
    create_resp = await client.post("/api/v1/documents/raw", headers=headers, json=raw_payload)
    assert create_resp.status_code == 202
    doc_id = create_resp.json()["id"]

    # List documents
    list_resp = await client.get("/api/v1/documents", headers=headers)
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] >= 1
    assert any(d["id"] == doc_id for d in list_data["items"])

    # Get single document
    get_resp = await client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert get_resp.status_code == 200
    doc_data = get_resp.json()
    assert doc_data["id"] == doc_id
    assert doc_data["title"] == "Store Guide"
    assert doc_data["content_preview"] is not None


@pytest.mark.asyncio
async def test_delete_document_contract(client: AsyncClient, db_session: AsyncSession):
    _, token = await setup_test_owner(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    raw_payload = {"title": "Temporary Note", "content": "Delete this note shortly."}
    create_resp = await client.post("/api/v1/documents/raw", headers=headers, json=raw_payload)
    doc_id = create_resp.json()["id"]

    # Delete
    del_resp = await client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert del_resp.status_code == 204

    # Subsequent GET returns 404
    get_resp = await client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert get_resp.status_code == 404
