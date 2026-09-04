# Tasks: Knowledge Base Document Ingestion Pipeline (Backend First)

**Input**: Design documents from `/specs/002-knowledge-base-ingestion/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Scope**: Strictly **Backend-First**. Establishes multi-format file parsers (PDF, DOCX, TXT, Markdown `.md`), token-based semantic chunker (500 tokens / 50 overlap), provider-agnostic embeddings client, Qdrant vector store integration with strict tenant isolation, background ingestion lifecycle, and atomic cross-store deletion.

**Tests**: Included per Constitution quality gates (Principle I tenant isolation, contract verification, schema validation, cross-store atomicity).

---

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task specifies exact file paths

---

## Phase 1: Setup (Dependencies & Configuration)

**Purpose**: Add required backend dependencies and vector store / embedding environment configuration.

- [X] T001 Add `pypdf`, `python-docx`, `python-multipart`, `tiktoken`, and `qdrant-client` dependencies to `backend/pyproject.toml`
- [X] T002 [P] Configure Qdrant (`QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION_NAME`) and OpenAI-compatible embedding settings (`EMBEDDING_API_BASE`, `EMBEDDING_API_KEY`, `EMBEDDING_MODEL_NAME`, `EMBEDDING_DIMENSION`) in `backend/app/core/config.py`
- [X] T003 [P] Define custom exceptions for capacity (400), duplicate filename (409), payload limits (413), unsupported formats (415), zero text / length bounds (422), and cross-store sync failures (500) in `backend/app/core/exceptions.py`

---

## Phase 2: Foundational (Data Model & Vector Store Infrastructure)

**Purpose**: Core `Document` relational model, Alembic database migration, and Qdrant vector repository client that all document operations depend upon.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Implement `Document` SQLModel entity with `(organization_id, title)` unique constraint and enums (`DocumentStatus`, `DocumentType` with `MD`) in `backend/app/models/document.py`
- [X] T005 [P] Register `Document` in `backend/app/models/__init__.py`
- [X] T006 Create and apply Alembic migration for documents table with `uq_documents_org_title` unique constraint in `backend/alembic/versions/002_create_documents_table.py`
- [X] T007 [P] Implement Qdrant vector store client initialization, collection ensure (1536 cosine), and payload keyword index creation (`organization_id`, `document_id`) in `backend/app/repos/vector_repo.py`
- [X] T008 Implement PostgreSQL `DocumentRepository` with strict `organization_id` tenant filtering in `backend/app/repos/document_repo.py`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Multi-Format Document Upload & Ingestion (Priority: P1) 🎯 MVP

**Goal**: Enable business owners to upload documents (PDF, DOCX, TXT, Markdown `.md`) or submit raw text snippets, extracting text, splitting into ~500-token chunks with 50-token overlap, computing embeddings via an OpenAI-compatible endpoint, and indexing them into Qdrant under the organization's tenant ID.

**Independent Test**: Upload a sample Markdown (`.md`), PDF, TXT, or raw text snippet via API; verify document reaches `ready` state, extracted text is chunked, and vector embeddings are stored in Qdrant with `organization_id` payload.

### Tests for User Story 1

- [X] T009 [P] [US1] Unit tests for PDF, DOCX, TXT, and Markdown parsers (verifying structural header preservation `#`, `##` in Markdown) in `backend/tests/unit/test_document_parsers.py`
- [X] T010 [P] [US1] Unit tests for token chunker verifying 500-token target, 50-token overlap, and boundary splitting in `backend/tests/unit/test_chunker.py`
- [X] T011 [P] [US1] Contract test for document upload endpoint `POST /api/v1/documents/upload` in `backend/tests/contract/test_documents_contract.py`
- [X] T012 [P] [US1] Contract test for raw text ingestion endpoint `POST /api/v1/documents/raw` in `backend/tests/contract/test_documents_contract.py`
- [X] T013 [P] [US1] Integration test for complete upload -> extract -> chunk -> embed -> Qdrant indexing flow in `backend/tests/integration/test_document_ingestion.py`

### Implementation for User Story 1

- [X] T014 [P] [US1] Define Pydantic request and response schemas (`DocumentRead`, `DocumentListResponse`, `RawDocumentCreate` with 1 - 100,000 char validation) in `backend/app/schemas/document.py`
- [X] T015 [P] [US1] Implement in-memory PDF text parser using `pypdf` in `backend/app/services/parsers/pdf_parser.py`
- [X] T016 [P] [US1] Implement DOCX text parser using `python-docx` in `backend/app/services/parsers/docx_parser.py`
- [X] T017 [P] [US1] Implement TXT and Markdown (`.md`) text parser preserving markdown headers and structure in `backend/app/services/parsers/text_parser.py`
- [X] T018 [P] [US1] Implement parser registry dispatcher in `backend/app/services/parsers/__init__.py`
- [X] T019 [P] [US1] Implement token chunking service using `tiktoken` (500 tokens / 50 overlap) in `backend/app/services/chunker_service.py`
- [X] T020 [P] [US1] Implement provider-agnostic OpenAI-compatible embedding client with chunk batching using `httpx.AsyncClient` in `backend/app/services/embedding_service.py`
- [X] T021 [US1] Implement background ingestion pipeline service coordinating extract, chunk, embed, and Qdrant upsert with status tracking in `backend/app/services/ingestion_service.py`
- [X] T022 [US1] Implement document upload endpoint `POST /api/v1/documents/upload` with fast synchronous validation and background task execution in `backend/app/routers/documents.py`
- [X] T023 [US1] Implement raw text snippet endpoint `POST /api/v1/documents/raw` in `backend/app/routers/documents.py`
- [X] T024 [US1] Mount documents router in `backend/app/main.py`

**Checkpoint**: User Story 1 is fully functional and testable independently (Backend MVP complete).

---

## Phase 4: User Story 2 - Document Listing, Inspection & Status Tracking (Priority: P1)

**Goal**: Allow business owners to list all uploaded documents, inspect their processing status, chunk count, file size, and inspect a 500-character plain text preview with strict query-level tenant isolation.

**Independent Test**: Call `GET /api/v1/documents` and verify all tenant documents are returned; call `GET /api/v1/documents/{id}` and verify content preview; verify Owner 2 cannot view Owner 1's document (returns 404).

### Tests for User Story 2

- [X] T025 [P] [US2] Contract test for `GET /api/v1/documents` and `GET /api/v1/documents/{id}` in `backend/tests/contract/test_documents_contract.py`
- [X] T026 [P] [US2] Integration test verifying strict multi-tenant isolation prevents cross-organization document inspection in `backend/tests/integration/test_document_ingestion.py`

### Implementation for User Story 2

- [X] T027 [US2] Implement paginated listing and single document query with tenant filtering in `backend/app/services/document_service.py`
- [X] T028 [US2] Implement `GET /api/v1/documents` endpoint in `backend/app/routers/documents.py`
- [X] T029 [US2] Implement `GET /api/v1/documents/{document_id}` endpoint returning metadata and 500-character preview in `backend/app/routers/documents.py`

**Checkpoint**: User Stories 1 and 2 are fully functional and integrated.

---

## Phase 5: User Story 3 - Cross-Store Atomic Document Deletion (Priority: P2)

**Goal**: Provide atomic deletion of a document across both PostgreSQL and Qdrant vector store, guaranteeing zero orphan vector chunks and rollback if vector purge fails.

**Independent Test**: Call `DELETE /api/v1/documents/{id}`; verify relational row is removed from PostgreSQL AND zero vector points remain in Qdrant; simulate Qdrant error and verify PostgreSQL delete is rolled back.

### Tests for User Story 3

- [X] T030 [P] [US3] Contract test for `DELETE /api/v1/documents/{id}` in `backend/tests/contract/test_documents_contract.py`
- [X] T031 [P] [US3] Integration test for atomic cross-store deletion and rollback on vector purge failure in `backend/tests/integration/test_document_ingestion.py`

### Implementation for User Story 3

- [X] T032 [US3] Implement vector point purge by `document_id` and `organization_id` in `backend/app/repos/vector_repo.py`
- [X] T033 [US3] Implement atomic cross-store deletion orchestrator rolling back PostgreSQL delete on Qdrant failure in `backend/app/services/document_service.py`
- [X] T034 [US3] Implement `DELETE /api/v1/documents/{document_id}` endpoint in `backend/app/routers/documents.py`

**Checkpoint**: User Stories 1, 2, and 3 are fully functional.

---

## Phase 6: User Story 4 - File Validation, Capacity Limits & Edge Cases (Priority: P3)

**Goal**: Enforce 10 MB file size limit (`413`), unsupported format rejection (`415`), 50 documents per organization limit (`400`), duplicate filename rejection (`409 Conflict`), and zero-readable-text / 100k-char snippet bounds (`422 Unprocessable Content`).

**Independent Test**: Attempt uploading an 11 MB file (413), an unsupported `.exe` (415), a duplicate filename (409), a zero-text file (422), a raw snippet >100k chars (422), or a 51st document (400); verify clear, actionable error details.

### Tests for User Story 4

- [X] T035 [P] [US4] Contract tests for 413 Payload Too Large, 415 Unsupported Media Type, 400 Capacity Limit, 409 Conflict (duplicate title), and 422 Unprocessable Content (zero text, 100k length bound) in `backend/tests/contract/test_documents_contract.py`
- [X] T036 [P] [US4] Unit test for organization document count constraint check in `backend/tests/unit/test_document_service.py`

### Implementation for User Story 4

- [X] T037 [US4] Implement fast synchronous file size, format, zero-readable-text, and duplicate title validation in `backend/app/routers/documents.py` and `backend/app/services/document_service.py`
- [X] T038 [US4] Implement organization document capacity check (max 50) in `backend/app/services/document_service.py`
- [X] T039 [US4] Register custom exception handlers for 400, 409, 413, 415, 422, and 500 in `backend/app/main.py`

---

## Phase 7: Polish & Documentation

**Purpose**: End-to-end verification, test execution, and cleanup.

- [X] T040 Run full automated test suite (`uv run pytest tests/ -v`) and verify 100% pass rate
- [X] T041 Verify OpenAPI documentation and Swagger schema at `/docs`
- [X] T042 Update Git with conventional commit and push branch `002-knowledge-base-ingestion`

---

## Dependencies & Execution Order

```mermaid
graph TD
    Setup[Phase 1: Setup T001-T003] --> Foundation[Phase 2: Foundation T004-T008]
    Foundation --> US1[Phase 3: US1 Ingestion Pipeline T009-T024]
    US1 --> US2[Phase 4: US2 Listing & Preview T025-T029]
    US2 --> US3[Phase 5: US3 Atomic Deletion T030-T034]
    US3 --> US4[Phase 6: US4 Limits & Edge Cases T035-T039]
    US4 --> Polish[Phase 7: Polish & Docs T040-T042]
```

### Parallel Execution Opportunities
- Parsers (`pdf_parser.py`, `docx_parser.py`, `text_parser.py`) can be implemented in parallel.
- Contract tests and Unit tests can be authored in parallel with schemas and models.
- US2 (Listing) and US3 (Deletion) can be implemented in parallel once US1 ingestion models and repos are complete.
