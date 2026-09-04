# Feature Specification: Knowledge Base Document Ingestion Pipeline

**Feature Branch**: `002-knowledge-base-ingestion`  
**Created**: 2026-09-04  
**Status**: Draft  
**Input**: System Specification Section 3.2: Knowledge Base (Document Management & Ingestion Pipeline)

---

## Executive Summary

The Knowledge Base Document Ingestion Pipeline enables business owners to upload their business guides, FAQs, product catalogs, and policies (PDF, DOCX, TXT, Markdown (.md), or direct text input) into their organization's knowledge base. The system extracts clean text, partitions the content into overlapping semantic chunks (~500 tokens with 50-token overlap), generates vector embeddings via an OpenAI-compatible interface, and indexes them in a tenant-isolated vector store. The owner can inspect processing progress (`uploading` → `processing` → `ready` | `failed`), preview content, and atomically delete documents across both relational and vector stores.

---

## Clarifications

### Session 2026-09-04

- Q: How should the system handle an upload when a document with the exact same filename already exists for that organization? → A: Reject with `409 Conflict` indicating a document with this filename already exists, requiring the owner to delete the existing document before uploading a replacement.
- Q: How should the system handle an uploaded file that contains zero readable text (such as an empty file or an image-only scanned PDF)? → A: Reject immediately at upload with `422 Unprocessable Content` ("Document contains no readable text").

---

## User Scenarios & Testing

### User Story 1 - Multi-Format Document Upload & Ingestion (Priority: P1) 🎯 MVP

A store owner uploads their store policies (PDF, Word doc, plain text, Markdown (.md) file, or pasted manual text). The system validates the file format, extracts readable text, splits it into semantic chunks, generates vector embeddings, and stores them tagged with the organization's unique ID.

**Why this priority**: Without ingesting and embedding documents, the AI assistant has zero knowledge to answer customer questions. This is the foundational capability of the entire platform.

**Independent Test**: Upload a sample PDF, TXT, or Markdown file via `POST /api/v1/documents/upload`; verify that text is extracted, chunked, and embedded into the vector store; verify the document transitions to `ready` status.

**Acceptance Scenarios**:
1. **Given** an authenticated business owner with an active organization, **When** they upload a valid `.txt`, `.md`, `.docx`, or text-readable `.pdf` file up to 10 MB, **Then** the system accepts the upload, creates a `Document` record in `uploading`/`processing` state, extracts text, generates vector embeddings for each chunk, and marks the document `ready`.
2. **Given** an authenticated owner, **When** they submit a raw text snippet (title and content) directly via the API/dashboard, **Then** the system creates a manual document entry and ingests it through the identical chunking and embedding pipeline.
3. **Given** an invalid or corrupted file, **When** text extraction fails, **Then** the system marks the document status as `failed` with a user-friendly error message, leaving no corrupted vector entries.

---

### User Story 2 - Document Listing, Inspection & Status Tracking (Priority: P1)

A business owner views their organization's uploaded documents in their dashboard, checks their processing status, and previews extracted content.

**Why this priority**: Owners must have real-time visibility into what documents are in their knowledge base and whether they are ready for the AI to query.

**Independent Test**: Call `GET /api/v1/documents` and verify all organization documents are returned with status, upload date, and size; call `GET /api/v1/documents/{id}` and verify the first 500 characters of extracted text are previewed.

**Acceptance Scenarios**:
1. **Given** an authenticated owner with multiple uploaded documents, **When** they request `GET /api/v1/documents`, **Then** they receive a list containing `id`, `filename`, `file_type`, `file_size_bytes`, `status`, `chunk_count`, and `created_at`.
2. **Given** an authenticated owner, **When** they request `GET /api/v1/documents/{id}`, **Then** they receive document metadata and a 500-character content preview snippet.
3. **Given** Owner A, **When** they attempt to retrieve a document belonging to Owner B via `GET /api/v1/documents/{owner_b_doc_id}`, **Then** the system returns `404 Not Found` or `403 Forbidden` due to query-level tenant isolation.

---

### User Story 3 - Cross-Store Atomic Document Deletion (Priority: P2)

An owner deletes an outdated policy or price list. The system removes the document record from the relational PostgreSQL database AND purges all associated vector embeddings from the vector store as a single atomic operation.

**Why this priority**: Outdated or deleted documents must never be retrieved by the AI. Per Constitution Principle "Cross-Store Atomicity", partial deletions that leave orphan embeddings are strictly forbidden.

**Independent Test**: Upload and index a document; call `DELETE /api/v1/documents/{id}`; verify that the document row is gone from PostgreSQL AND zero vector embeddings with that `document_id` remain in the vector index.

**Acceptance Scenarios**:
1. **Given** an existing `ready` document, **When** the owner issues `DELETE /api/v1/documents/{id}`, **Then** the relational database record is deleted and all vector points tagged with that `document_id` are deleted from the vector store.
2. **Given** a network failure during vector deletion, **When** the vector purge fails, **Then** the relational database deletion is rolled back (or marked failed) so no silent partial-delete state occurs.

---

### User Story 4 - File Validation, Capacity Limits & Edge Cases (Priority: P3)

The system protects against oversized uploads, unsupported formats, and storage abuse.

**Why this priority**: Protects system stability, predictable operating costs, and safeguards against malformed uploads.

**Independent Test**: Attempt uploading an 11 MB file, an executable file, or a 51st document when 50 already exist; verify graceful rejection with clean error details.

**Acceptance Scenarios**:
1. **Given** a file exceeding 10 MB, **When** the upload is attempted, **Then** the system rejects the request with `413 Payload Too Large`.
2. **Given** an unsupported file extension (e.g. `.exe`, `.jpg`, `.zip`), **When** upload is attempted, **Then** the system rejects the request with `415 Unsupported Media Type`.
3. **Given** an organization that already has 50 active documents, **When** attempting a 51st upload, **Then** the system returns `400 Bad Request` citing the 50-document limit.
4. **Given** an existing document with filename "catalog.pdf", **When** an owner attempts to upload another file named "catalog.pdf", **Then** the system rejects the upload with `409 Conflict` stating that a document with this filename already exists.
5. **Given** an uploaded file containing zero readable text (e.g. 0-byte file or image-only scanned PDF), **When** upload is attempted, **Then** the system immediately rejects the upload with `422 Unprocessable Content` ("Document contains no readable text").

---

## Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| **FR-001** | Formats | System MUST support `.pdf`, `.docx`, `.txt`, `.md` (Markdown), and raw text manual entries. |
| **FR-002** | Extraction | System MUST extract clean plain text from supported document formats (preserving header hierarchies and structure in Markdown) without requiring external cloud OCR services for v1. |
| **FR-003** | Chunking | System MUST partition extracted text into chunks of approximately 500 tokens with 50-token overlapping boundaries. |
| **FR-004** | Embedding | System MUST generate dense vector embeddings using an OpenAI-compatible embedding endpoint configured via environment variables. |
| **FR-005** | Indexing | System MUST store chunk vectors in a dedicated vector store (Qdrant), strictly tagged with `organization_id` and `document_id` payload metadata. |
| **FR-006** | Isolation | System MUST enforce `WHERE organization_id = ...` metadata filtering at the vector search query level to guarantee zero cross-tenant vector contamination. |
| **FR-007** | Pipeline Status | Every document MUST transition through tracked lifecycle states: `uploading` → `processing` → `ready` or `failed`. |
| **FR-008** | Atomic Deletion | Deleting a document MUST delete both the relational PostgreSQL record and all associated vector embeddings. Partial deletion states are prohibited. |
| **FR-009** | Capacity Constraints | System MUST enforce a maximum of 10 MB per file and a maximum of 50 documents per Organization. |
| **FR-010** | Metadata Preview | Document inspection MUST return metadata and a 500-character initial content preview. |
| **FR-011** | Storage Persistence | Extracted text chunks MUST retain their source document title, chunk index, and token length. |
| **FR-012** | Background Ingestion | Processing of multi-page documents MUST execute asynchronously so the upload endpoint responds immediately without blocking the HTTP client. |
| **FR-013** | Filename Uniqueness | System MUST enforce document filename/title uniqueness per Organization, rejecting duplicate uploads with `409 Conflict`. |
| **FR-014** | Content Validity | System MUST reject empty files or documents yielding zero extractable text immediately with `422 Unprocessable Content`. |

---

## Success Criteria

| ID | Metric | Target |
|---|---|---|
| **SC-001** | Ingestion Speed | A 10-page text document reaches `ready` status within 30 seconds. |
| **SC-002** | Tenant Filtering Accuracy | 100% of vector queries strictly filter by `organization_id` with 0 cross-tenant chunk leakage. |
| **SC-003** | Cross-Store Consistency | Zero orphan vector chunks remain after a document is deleted. |
| **SC-004** | File Format Compatibility | Successfully extracts text from standard PDF, DOCX, TXT, and Markdown (.md) files. |
| **SC-005** | Automated Test Coverage | Unit and integration test suites cover upload validation, text extraction, chunking, and tenant isolation. |

---

## Out of Scope (v1)

- Scanned image PDF OCR (only text-extractable PDFs are supported).
- Cloud storage integration (Google Drive / Dropbox syncing).
- Audio / Video transcription.
- Multi-lingual translation during ingestion.
- Document version history / diffing (owners delete and re-upload revised files).
