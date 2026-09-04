# API Contracts: Knowledge Base Document Ingestion Pipeline

**Feature**: `002-knowledge-base-ingestion`  
**Base URL**: `/api/v1/documents`  
**Authentication**: Bearer JWT (Session Cookie or Header verified via Better Auth JWKS / DEV_AUTH_BYPASS)

---

## 1. Upload Document File

Uploads a document file (`.pdf`, `.docx`, `.txt`, `.md`) for background extraction, chunking, and embedding.

- **Method**: `POST`
- **Path**: `/api/v1/documents/upload`
- **Content-Type**: `multipart/form-data`

### Form Parameters
- `file`: `UploadFile` (Required) - Binary file data. Max 10 MB.
- `title`: `string` (Optional) - Custom title. Defaults to original filename.

### Responses

#### `202 Accepted`
```json
{
  "id": "7b8893d2-3162-4ef8-9e5c-cb613da66141",
  "title": "return-policy.md",
  "file_type": "md",
  "file_size_bytes": 14200,
  "status": "processing",
  "chunk_count": 0,
  "character_count": 0,
  "content_preview": null,
  "created_at": "2026-09-04T08:30:00.000Z",
  "updated_at": "2026-09-04T08:30:00.000Z"
}
```

#### `413 Payload Too Large`
```json
{
  "detail": "File size exceeds the 10 MB limit."
}
```

#### `415 Unsupported Media Type`
```json
{
  "detail": "Unsupported file format. Allowed formats: .pdf, .docx, .txt, .md"
}
```

#### `400 Bad Request` (Capacity Limit)
```json
{
  "detail": "Organization document limit reached (maximum 50 documents)."
}
```

---

## 2. Ingest Raw Text Snippet

Submits a direct text snippet (FAQ, policy note, guidelines) without uploading a file.

- **Method**: `POST`
- **Path**: `/api/v1/documents/raw`
- **Content-Type**: `application/json`

### Request Body
```json
{
  "title": "Store Holiday Hours",
  "content": "Our retail locations are closed on Thanksgiving and Christmas Day. Support chat remains active 24/7."
}
```

### Responses

#### `202 Accepted`
```json
{
  "id": "e2c3498a-115f-40e1-bb92-0b1a0391d4e0",
  "title": "Store Holiday Hours",
  "file_type": "raw",
  "file_size_bytes": 105,
  "status": "processing",
  "chunk_count": 0,
  "character_count": 105,
  "content_preview": "Our retail locations are closed on Thanksgiving and Christmas Day. Support chat remains active 24/7.",
  "created_at": "2026-09-04T08:31:00.000Z",
  "updated_at": "2026-09-04T08:31:00.000Z"
}
```

---

## 3. List Organization Documents

Retrieves all documents belonging to the authenticated organization.

- **Method**: `GET`
- **Path**: `/api/v1/documents`
- **Query Parameters**:
  - `limit`: `integer` (Default: 50, max: 100)
  - `offset`: `integer` (Default: 0)

### Responses

#### `200 OK`
```json
{
  "total": 2,
  "items": [
    {
      "id": "7b8893d2-3162-4ef8-9e5c-cb613da66141",
      "title": "return-policy.md",
      "file_type": "md",
      "file_size_bytes": 14200,
      "status": "ready",
      "chunk_count": 4,
      "character_count": 6200,
      "created_at": "2026-09-04T08:30:00.000Z"
    },
    {
      "id": "e2c3498a-115f-40e1-bb92-0b1a0391d4e0",
      "title": "Store Holiday Hours",
      "file_type": "raw",
      "file_size_bytes": 105,
      "status": "ready",
      "chunk_count": 1,
      "character_count": 105,
      "created_at": "2026-09-04T08:31:00.000Z"
    }
  ]
}
```

---

## 4. Get Document Details & Preview

Inspects an individual document's processing status, statistics, and text preview.

- **Method**: `GET`
- **Path**: `/api/v1/documents/{document_id}`

### Responses

#### `200 OK`
```json
{
  "id": "7b8893d2-3162-4ef8-9e5c-cb613da66141",
  "organization_id": "8fa538e1-6780-4966-ba39-813cbfad200d",
  "title": "return-policy.md",
  "file_type": "md",
  "file_size_bytes": 14200,
  "status": "ready",
  "chunk_count": 4,
  "character_count": 6200,
  "content_preview": "# Return and Refund Policy\n\nItems may be returned within 30 days of purchase...",
  "error_message": null,
  "created_at": "2026-09-04T08:30:00.000Z",
  "updated_at": "2026-09-04T08:30:15.000Z"
}
```

#### `404 Not Found`
```json
{
  "detail": "Document not found."
}
```
*(Returned also when the document exists but belongs to a different organization to uphold strict tenant privacy).*

---

## 5. Atomically Delete Document

Deletes the document row from PostgreSQL AND purges all vector embeddings from Qdrant.

- **Method**: `DELETE`
- **Path**: `/api/v1/documents/{document_id}`

### Responses

#### `204 No Content`
*(Empty response body indicating successful cross-store deletion).*

#### `404 Not Found`
```json
{
  "detail": "Document not found."
}
```

#### `500 Internal Server Error` (Cross-Store Consistency Abort)
```json
{
  "detail": "Failed to purge vector embeddings. Deletion aborted to maintain cross-store consistency."
}
```
