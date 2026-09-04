# Research: Knowledge Base Document Ingestion Pipeline

**Feature**: `002-knowledge-base-ingestion`  
**Date**: 2026-09-04  
**Status**: Completed

---

## 1. Document Parsing & Text Extraction (PDF, DOCX, TXT, MD)

### Decision
- **PDF**: Use `pypdf` (`PdfReader`) for in-memory stream extraction. Pure Python, fast, lightweight, and does not require OS-level binaries (like poppler).
- **DOCX**: Use `python-docx` (`docx.Document`) to extract text from paragraphs and tables.
- **TXT & Markdown (.md)**: Native UTF-8 string decoding with fallback to `latin-1`. For Markdown, preserve structural tokens (headers `#`, `##`, lists `-`, `1.`, code blocks) as they carry essential semantic hierarchy for LLM retrieval and embedding quality.
- **Multi-Part Uploads**: Use `python-multipart` with FastAPI's `UploadFile`.

### Rationale
- Pure Python parsers avoid native binary dependencies, ensuring cross-platform stability (Windows, Linux containers, Neon serverless workflows).
- Parsing directly from in-memory byte streams (`io.BytesIO`) avoids writing transient unencrypted files to disk, upholding data security.
- Markdown headers provide natural semantic anchors for text chunking.

### Alternatives Considered
- `pdfminer.six` / `PyMuPDF` (fitz): `fitz` requires compiled C binaries which can cause installation friction across different OS environments; `pypdf` is lightweight and sufficient for text-extractable PDFs.
- External OCR (AWS Textract, Tesseract): Out of scope for v1 per spec. Text extraction handles digitally generated PDFs directly.

---

## 2. Text Partitioning & Semantic Chunking

### Decision
- **Chunk Size**: 500 tokens.
- **Overlap**: 50 tokens (10% overlap).
- **Tokenizer**: `tiktoken` (`cl100k_base`), matching OpenAI and modern embedding model tokenization.
- **Boundary Splitting**: Recursive character/delimiter splitting respecting paragraph (`\n\n`), sentence (`. `, `? `, `! `), and newline (`\n`) boundaries before token-based hard splits.

### Rationale
- 500 tokens provides high semantic coherence for business FAQs, policies, and product guides, while leaving ample context window for LLM generation.
- 50-token overlap preserves continuity across adjacent chunks, preventing critical context from being severed at chunk borders.

### Alternatives Considered
- Fixed character length (e.g. 1500 chars): Inaccurate token density depending on vocabulary, leading to unpredictable embedding model behavior.
- Sentence-only chunking: Yields highly variable chunk sizes, harming retrieval ranking consistency.

---

## 3. Provider-Agnostic Embeddings API

### Decision
- Interface directly with an OpenAI-compatible embeddings endpoint (`POST {EMBEDDING_API_BASE}/embeddings`) using `httpx.AsyncClient`.
- Standard model: `text-embedding-3-small` (1536 dimensions).
- Configurable environment variables:
  - `EMBEDDING_API_BASE` (default: `https://api.openai.com/v1`)
  - `EMBEDDING_API_KEY`
  - `EMBEDDING_MODEL_NAME` (default: `text-embedding-3-small`)
  - `EMBEDDING_DIMENSION` (default: `1536`)

### Rationale
- Adheres strictly to **Constitution Principle VI: Provider-Agnostic AI Layer**. No hardcoded vendor SDKs. Any OpenAI-compatible provider (OpenAI, Groq, Ollama, vLLM, FastChat) can be swapped purely via environment configuration without code modification.
- Batch embedding requests up to 32 chunks per call to minimize HTTP latency and roundtrips.

### Alternatives Considered
- Official `openai` Python SDK: Adds unnecessary vendor-specific dependencies and can break if custom endpoints deviate from strict SDK assumptions. Standard `httpx` async client provides complete control and lightweight footprint.
- Local sentence-transformers / PyTorch: Imposes massive multi-gigabyte memory and disk footprints, unacceptable for lightweight containerized API deployments.

---

## 4. Dedicated Vector Store: Qdrant

### Decision
- Use `qdrant-client` with `AsyncQdrantClient`.
- Support two connection modes:
  1. **Production / Docker**: Remote Qdrant server (`QDRANT_URL=http://localhost:6333`, optional `QDRANT_API_KEY`).
  2. **Testing / In-Memory**: `:memory:` mode when `QDRANT_URL=":memory:"`, enabling 100% self-contained automated pytest execution without requiring external running services.
- Collection Name: `resolvdesk_documents`.
- Vector Distance: Cosine (`Distance.COSINE`).
- Vector Dimension: Matches `EMBEDDING_DIMENSION` (1536).
- Payload schema:
  - `organization_id`: `str` (indexed keyword for strict tenant isolation)
  - `document_id`: `str` (indexed keyword for atomic cascade deletion)
  - `chunk_index`: `int`
  - `text`: `str`
  - `token_count`: `int`
  - `title`: `str`

### Rationale
- Qdrant offers native payload-level filtering (`organization_id`), blazing fast HNSW search, and first-class in-memory testing support.
- Fully adheres to **Constitution Principle I (Strict Multi-Tenant Isolation)**: all vector searches MUST supply payload filter `Filter(must=[FieldCondition(key="organization_id", match=MatchValue(value=org_id))])`.
- Embeddings are kept out of PostgreSQL, adhering to Constitution rule: "Embeddings MUST NOT be stored as columns in the relational PostgreSQL schema."

### Alternatives Considered
- `pgvector`: Mixing vector operations into PostgreSQL adds heavy extension requirements and index rebuild overhead on transactional databases. Qdrant keeps relational and vector workloads decoupled and horizontally scalable.
- ChromaDB / Pinecone: Chroma has limited async and multi-tenant payload filtering capabilities; Pinecone is closed-source cloud-only.

---

## 5. Cross-Store Atomicity & Cascade Deletion

### Decision
- Treat document deletion as a two-phase transactional unit:
  1. Retrieve document to verify tenant ownership (`organization_id == current_user.organization_id`).
  2. Issue vector purge in Qdrant: delete all points matching `organization_id` AND `document_id`.
  3. Delete relational `Document` record in PostgreSQL within an async session transaction.
  4. If vector purge fails, rollback relational transaction and abort, returning `500 Internal Server Error` without deleting the database record.

### Rationale
- Complies with **Constitution Infrastructure Constraint: Cross-Store Atomicity**: "If the vector embedding deletion fails, the relational record MUST NOT be committed as deleted, and vice versa. Silent partial-delete states that orphan embeddings or leave stale data queryable are prohibited."

---

## 6. Asynchronous Background Ingestion

### Decision
- When an owner uploads a file:
  1. Fast synchronous validation: file size (<= 10MB), supported file extension (`.pdf`, `.docx`, `.txt`, `.md`), duplicate filename check (`409 Conflict`), non-empty readable text check (`422 Unprocessable Content`), and organization document count (< 50).
  2. Persist `Document` in PostgreSQL with status `uploading` / `processing`.
  3. Dispatch ingestion task via FastAPI `BackgroundTasks` (or async worker).
  4. Respond immediately to caller with `202 Accepted` (or `201 Created`) with document ID and status `processing`.
  5. Background pipeline reads file buffer, extracts text, chunks, embeds, indexes into Qdrant, updates `Document` status to `ready` (storing `chunk_count`, `char_count`, `content_preview`), or sets `status = "failed"` with `error_message`.

### Rationale
- Multi-page documents and embedding API calls take several seconds; synchronous blocking would freeze the client and cause HTTP gateway timeouts.
- Background execution gives immediate responsiveness and lets client poll or receive SSE updates.
