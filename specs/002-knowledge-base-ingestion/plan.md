# Implementation Plan: Knowledge Base Document Ingestion Pipeline

**Branch**: `002-knowledge-base-ingestion` | **Date**: 2026-09-04 | **Spec**: [specs/002-knowledge-base-ingestion/spec.md](spec.md)

**Input**: Feature specification from `/specs/002-knowledge-base-ingestion/spec.md`

---

## Summary

The Knowledge Base Document Ingestion Pipeline enables business owners to upload their business guides, FAQs, product catalogs, and policies (PDF, DOCX, TXT, Markdown `.md`, or direct text input) into their organization's knowledge base. The backend extracts clean text, partitions content into semantic chunks (~500 tokens with 50-token overlap), generates dense embeddings via an OpenAI-compatible interface, and indexes vectors into Qdrant with strict `organization_id` payload filters. Deletions are executed atomically across PostgreSQL and Qdrant.

---

## Technical Context

**Language/Version**: Python >= 3.12 (managed via `uv`)  
**Primary Dependencies**:
- `fastapi` >= 0.141.1, `uvicorn[standard]`
- `sqlmodel` >= 0.0.42, `asyncpg` >= 0.31.0, `aiosqlite` >= 0.22.1
- `pypdf` >= 5.0.0 (PDF text extraction)
- `python-docx` >= 1.1.0 (Word DOCX text extraction)
- `python-multipart` >= 0.0.12 (Multi-part file uploads)
- `tiktoken` >= 0.8.0 (Token estimation and semantic chunking)
- `qdrant-client` >= 1.12.0 (Dedicated vector database client with in-memory test capability)
- `httpx` >= 0.28.1 (Provider-agnostic async HTTP client for embeddings API)

**Storage**:
- PostgreSQL (via Neon / asyncpg) for `Document` relational metadata and state tracking.
- Qdrant for dense vector embeddings in collection `resolvdesk_documents`.

**Testing**: `pytest`, `pytest-asyncio`, `pytest-mock` (Unit, Contract, and Integration test suites).  
**Target Platform**: Linux / Windows Server, Containerized ASGI API.  
**Project Type**: Web service REST API (FastAPI backend).  
**Performance Goals**: Ingest and index a 10-page document within 30 seconds; upload response returned in < 500ms via asynchronous background processing.  
**Constraints**:
- Max file size: 10 MB (`413 Payload Too Large`).
- Max capacity: 50 documents per Organization (`400 Bad Request`).
- Duplicate filename per organization: Rejected with `409 Conflict` (FR-013).
- Zero readable text / empty files: Rejected immediately with `422 Unprocessable Content` (FR-014).
- Raw text snippet boundary: 100,000 characters max (`422 Unprocessable Content`) (FR-015).
- Semantic chunking: 500 tokens with 50-token overlap.
- Cross-Store Atomicity: Rollback relational delete if vector purge fails.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Assessment | Status |
|---|---|---|
| **I. Strict Multi-Tenant Isolation** | Every `Document` row has `organization_id` FK. Every Qdrant point has indexed `organization_id` keyword payload. All queries filter by `organization_id`. | **PASS** |
| **V. Layered Architecture & Boundary Defense** | Strict 3-layer division: `routers/documents.py` (HTTP) → `services/document_service.py` & `services/ingestion_service.py` (business logic, parsing, chunking) → `repos/document_repo.py` & `repos/vector_repo.py` (DB & Qdrant queries). | **PASS** |
| **VI. Provider-Agnostic AI Layer** | Embedding service uses `httpx.AsyncClient` calling generic OpenAI-compatible `POST {EMBEDDING_API_BASE}/embeddings`. Configurable purely via `.env` without vendor SDK locks. | **PASS** |
| **Infrastructure: Cross-Store Atomicity** | Document deletion executes vector point deletion in Qdrant; if vector purge fails, relational deletion in PostgreSQL is rolled back. | **PASS** |
| **Infrastructure: Dedicated Vector Store** | Embeddings are stored strictly in Qdrant, never as columns in relational PostgreSQL. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-knowledge-base-ingestion/
├── checklists/
│   └── requirements.md    # Specification quality checklist
├── spec.md                # Feature specification
├── plan.md                # This file (/speckit-plan command output)
├── research.md            # Phase 0 output: parsing, chunking, Qdrant, embeddings
├── data-model.md          # Phase 1 output: Document model & Qdrant vector payload
├── quickstart.md          # Phase 1 output: runnable test & verification steps
├── contracts/
│   └── api.md             # Phase 1 output: OpenAPI REST contracts
└── tasks.md               # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── core/
│   │   ├── config.py             # Add Qdrant and Embedding settings
│   │   └── exceptions.py         # Custom exceptions: 400, 409, 413, 415, 422, 500
│   ├── models/
│   │   └── document.py           # SQLModel Document entity, Enums & (org_id, title) unique constraint
│   ├── schemas/
│   │   └── document.py           # Pydantic schemas (DocumentRead, RawDocumentCreate with 100k bound)
│   ├── repos/
│   │   ├── document_repo.py      # PostgreSQL async CRUD with tenant isolation
│   │   └── vector_repo.py        # Qdrant client interactions (upsert, purge, tenant filter)
│   ├── services/
│   │   ├── document_service.py   # Document CRUD & cross-store atomic deletion
│   │   ├── parsers/              # Extractors for PDF, DOCX, TXT, MD
│   │   │   ├── __init__.py
│   │   │   ├── pdf_parser.py
│   │   │   ├── docx_parser.py
│   │   │   └── text_parser.py    # Handles TXT and Markdown (.md)
│   │   ├── chunker_service.py    # Tiktoken 500-token chunker with 50-token overlap
│   │   ├── embedding_service.py  # Provider-agnostic OpenAI-compatible embedding client
│   │   └── ingestion_service.py  # Async pipeline coordinator (parse -> chunk -> embed -> index)
│   └── routers/
│       └── documents.py          # FastAPI router (/api/v1/documents)
└── tests/
    ├── unit/
    │   ├── test_document_parsers.py # Unit tests for PDF, DOCX, TXT, MD extraction
    │   └── test_chunker.py          # Unit tests for 500/50 token chunking
    ├── contract/
    │   └── test_documents_contract.py # API validation: 400, 409, 413, 415, 422 status codes
    └── integration/
        └── test_document_ingestion.py # Full pipeline, Qdrant indexing, atomic deletion
```

**Structure Decision**: Standard FastAPI three-layer backend architecture matching existing project conventions. All business logic and file parsers are cleanly modularized under `app/services/` and tested via pytest.

---

## Complexity Tracking

> **No violations recorded. Design fully complies with Constitution.**

| Item | Assessment |
|---|---|
| Extra layers | None. Strict Router -> Service -> Repo architecture. |
| In-memory testing | Enabled via Qdrant `:memory:` client and SQLite async test database, eliminating external Docker dependencies for test suites. |
