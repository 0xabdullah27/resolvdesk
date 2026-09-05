# Data Model: Knowledge Base & Document Management UI

**Feature Branch**: `006-knowledge-base-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Frontend Entities & Type Definitions

### 1.1 Document Enums

```typescript
export type DocumentType = "pdf" | "docx" | "txt" | "md" | "raw";

export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";
```

### 1.2 Document List Item (`DocumentItem`)

Represents a single document record in the Knowledge Base table.

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique identifier of the document |
| `title` | `string` | Display title / original filename |
| `file_type` | `DocumentType` | Recognized format (`pdf`, `docx`, `txt`, `md`, `raw`) |
| `file_size_bytes` | `number` | Size in bytes (formatted in UI as KB/MB) |
| `status` | `DocumentStatus` | Processing lifecycle state |
| `chunk_count` | `number` | Number of vector chunks indexed into Qdrant |
| `character_count` | `number` | Number of clean characters extracted |
| `created_at` | `string` (ISO timestamp) | Initial creation timestamp |

### 1.3 Detailed Document (`DocumentDetail`)

Extends `DocumentItem` for inspection inside the slide-over preview sheet.

| Field | Type | Description |
|---|---|---|
| `organization_id` | `string` (UUID) | Owner's organization identifier |
| `content_preview` | `string \| null` | First 500 characters of extracted plain text |
| `error_message` | `string \| null` | Human-readable explanation if `status === "failed"` |
| `updated_at` | `string` (ISO timestamp) | Last status/metadata update timestamp |

### 1.4 Document List Response (`DocumentListResponse`)

| Field | Type | Description |
|---|---|---|
| `total` | `number` | Total count of documents for the organization |
| `items` | `DocumentItem[]` | List of document records (capped at 50) |

---

## 2. Client-Side State Models

### 2.1 Batch Upload Queue Item (`UploadQueueItem`)

Tracks progress during multi-file drop and sequential upload.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique client-generated queue item identifier |
| `file` | `File` | Native browser File reference |
| `title` | `string` | Extracted filename |
| `size` | `number` | File size in bytes |
| `status` | `"queued" \| "uploading" \| "success" \| "error"` | Current item upload state |
| `progress` | `number` (0–100) | Current upload progress percentage |
| `error` | `string \| null` | Error description if upload rejected |

### 2.2 Manual Entry Form State (`RawDocumentInput`)

Validated via Zod schema before submission.

```typescript
import { z } from "zod";

export const rawDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  content: z
    .string()
    .trim()
    .min(1, "Content cannot exceed 1 character")
    .max(100_000, "Content cannot exceed 100,000 characters"),
});

export type RawDocumentInput = z.infer<typeof rawDocumentSchema>;
```

### 2.3 Table Filter & View State (`DocumentFilterState`)

```typescript
export interface DocumentFilterState {
  searchQuery: string;
  statusFilter: "all" | DocumentStatus;
}
```

---

## 3. Entity Lifecycle & State Transitions

```
[User Selects File / Types Text]
                │
                ▼
      [Client Validation]
         ├── Invalid (>10MB / bad ext) ──► Show inline error toast (halt)
         └── Valid
                │
                ▼
        [Sequential Queue]
                │
                ▼
     [Server Action Ingestion] ──► Backend HTTP 202 Accepted
                │
                ▼
       Status: "processing"
                │
        (3s Polling Loop)
                │
        ┌───────┴───────┐
        ▼               ▼
Status: "ready"   Status: "failed"
(Vector chunks)   (Error tooltip)
        │               │
        └───────┬───────┘
                │
         [User Action]
         ├── "Preview" ──► Open Slide-over Sheet (first 500 chars)
         └── "Delete"  ──► Confirm AlertDialog ──► Permanently Purged
```
