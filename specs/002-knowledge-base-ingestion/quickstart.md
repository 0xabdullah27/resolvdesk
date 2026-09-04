# Quickstart Validation Guide: Knowledge Base Ingestion Pipeline

**Feature**: `002-knowledge-base-ingestion`  
**Date**: 2026-09-04

This quickstart guides developers through verifying the Document Ingestion Pipeline end-to-end, including multi-format file uploads (Markdown, PDF, DOCX, TXT, Raw text), background extraction, vector indexing, and atomic cross-store deletion.

---

## 1. Prerequisites & Environment Setup

Ensure backend dependencies are installed and test environment variables are loaded:

```powershell
cd backend
uv sync
```

Set environment variables in `backend/.env` (or use defaults):
```env
DATABASE_URL=sqlite+aiosqlite:///./test.db
DEV_AUTH_BYPASS=true
QDRANT_URL=:memory:
EMBEDDING_API_BASE=https://api.openai.com/v1
EMBEDDING_API_KEY=mock-key-for-tests
EMBEDDING_MODEL_NAME=text-embedding-3-small
```

---

## 2. Automated Test Execution

Run the complete test suite verifying text extraction parsers, chunking logic, tenant isolation, and API endpoints:

```powershell
cd backend
uv run pytest tests/unit/test_document_parsers.py tests/unit/test_chunker.py tests/contract/test_documents_contract.py tests/integration/test_document_ingestion.py -v
```

Expected output:
```text
tests/unit/test_document_parsers.py::test_pdf_parser_extracts_text PASSED
tests/unit/test_document_parsers.py::test_docx_parser_extracts_text PASSED
tests/unit/test_document_parsers.py::test_markdown_parser_preserves_structure PASSED
tests/unit/test_chunker.py::test_chunk_size_and_overlap PASSED
tests/contract/test_documents_contract.py::test_upload_markdown_contract PASSED
tests/integration/test_document_ingestion.py::test_atomic_cross_store_deletion PASSED
tests/integration/test_document_ingestion.py::test_tenant_vector_isolation PASSED
```

---

## 3. End-to-End API Verification Scenarios

### Scenario A: Ingest a Markdown (.md) Document

1. Create a sample markdown file `policy.md`:
```markdown
# Return and Exchange Policy

We accept returns within 30 days of purchase for a full refund.
Items must be in original condition with tags attached.
```

2. Submit the file via HTTP:
```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "Authorization: Bearer dev-test-token" \
  -F "file=@policy.md;type=text/markdown"
```

Response:
```json
{
  "id": "7b8893d2-3162-4ef8-9e5c-cb613da66141",
  "title": "policy.md",
  "file_type": "md",
  "file_size_bytes": 142,
  "status": "processing"
}
```

3. Poll document status until `ready`:
```bash
curl -X GET "http://localhost:8000/api/v1/documents/7b8893d2-3162-4ef8-9e5c-cb613da66141" \
  -H "Authorization: Bearer dev-test-token"
```

Response when ready:
```json
{
  "id": "7b8893d2-3162-4ef8-9e5c-cb613da66141",
  "title": "policy.md",
  "file_type": "md",
  "status": "ready",
  "chunk_count": 1,
  "character_count": 142,
  "content_preview": "# Return and Exchange Policy\n\nWe accept returns within 30 days..."
}
```

---

### Scenario B: Submit Raw Text Snippet

```bash
curl -X POST "http://localhost:8000/api/v1/documents/raw" \
  -H "Authorization: Bearer dev-test-token" \
  -H "Content-Type: application/json" \
  -d '{"title": "Store Hours", "content": "Open Monday to Friday 9am to 6pm."}'
```

---

### Scenario C: Verify Cross-Store Atomic Deletion

```bash
curl -X DELETE "http://localhost:8000/api/v1/documents/7b8893d2-3162-4ef8-9e5c-cb613da66141" \
  -H "Authorization: Bearer dev-test-token"
```

Expected Response: `204 No Content`

Verify deletion:
- `GET /api/v1/documents/7b8893d2-3162-4ef8-9e5c-cb613da66141` returns `404 Not Found`.
- Vector collection points for that `document_id` are completely purged from Qdrant.

---

### Scenario D: Edge Case & Validation Scenarios

1. **Duplicate Filename (`409 Conflict`)**:
   Uploading `policy.md` a second time:
   ```bash
   curl -i -X POST "http://localhost:8000/api/v1/documents/upload" \
     -H "Authorization: Bearer dev-test-token" \
     -F "file=@policy.md;type=text/markdown"
   ```
   Returns `HTTP/1.1 409 Conflict` (`A document with filename 'policy.md' already exists for this organization.`).

2. **Empty File / Zero Readable Text (`422 Unprocessable Content`)**:
   Uploading a 0-byte file:
   Returns `HTTP/1.1 422 Unprocessable Content` (`Document contains no readable text.`).

3. **Raw Text Overflow (`422 Unprocessable Content`)**:
   Submitting raw text snippet with > 100,000 characters:
   Returns `HTTP/1.1 422 Unprocessable Content` (`Snippet content exceeds the maximum allowed length of 100,000 characters.`).
