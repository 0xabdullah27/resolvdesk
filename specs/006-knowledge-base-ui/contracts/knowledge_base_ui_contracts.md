# Interface Contracts: Knowledge Base & Document Management UI

**Feature Branch**: `006-knowledge-base-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](../spec.md)

---

## 1. Next.js Server Actions (`actions/document-actions.ts`)

All operations are executed via Next.js Server Actions on the server side using the authenticated session JWT.

### 1.1 `listDocumentsAction`
Retrieves all documents for the authenticated owner's organization.

```typescript
export async function listDocumentsAction(): Promise<{
  success: boolean;
  data?: DocumentListResponse;
  error?: string;
}>;
```
- **Backend call**: `GET /api/v1/documents?limit=50`
- **Cache Policy**: `no-store` (for fresh status evaluation during active polling)
- **Response**: List of document items, chunk metrics, and total count

### 1.2 `getDocumentDetailsAction`
Fetches extended metadata and content preview for a specific document.

```typescript
export async function getDocumentDetailsAction(
  documentId: string
): Promise<{
  success: boolean;
  data?: DocumentDetail;
  error?: string;
}>;
```
- **Backend call**: `GET /api/v1/documents/{documentId}`
- **Response**: Full document detail including `content_preview` (first 500 chars) and `error_message`

### 1.3 `uploadDocumentAction`
Submits a multipart file upload for asynchronous text extraction, chunking, and Qdrant vector indexing.

```typescript
export async function uploadDocumentAction(
  formData: FormData
): Promise<{
  success: boolean;
  data?: DocumentDetail;
  error?: string;
}>;
```
- **Input**: `formData` with `file: File` and optional `title: string`
- **Backend call**: `POST /api/v1/documents/upload`
- **Expected Status**: `202 Accepted`
- **Error Handling**:
  - `400`: Maximum organization capacity reached (50 documents limit)
  - `409`: Duplicate filename in organization
  - `413`: File exceeds 10 MB payload limit
  - `415`: Unsupported file format
  - `422`: Document contains no readable text

### 1.4 `createRawDocumentAction`
Submits a raw text snippet (title and content) directly for ingestion.

```typescript
export async function createRawDocumentAction(
  payload: RawDocumentInput
): Promise<{
  success: boolean;
  data?: DocumentDetail;
  error?: string;
}>;
```
- **Input**: `{ title: string; content: string }`
- **Backend call**: `POST /api/v1/documents/raw`
- **Expected Status**: `202 Accepted`
- **Validation**: Schema-enforced length constraints (1–255 title chars, 1–100,000 content chars)

### 1.5 `deleteDocumentAction`
Atomically purges the document row from PostgreSQL and all vector chunks from Qdrant.

```typescript
export async function deleteDocumentAction(
  documentId: string
): Promise<{
  success: boolean;
  error?: string;
}>;
```
- **Backend call**: `DELETE /api/v1/documents/{documentId}`
- **Expected Status**: `204 No Content`
- **Side Effect**: Calls `revalidatePath('/dashboard/documents')`

---

## 2. Component Interface Contracts (`components/documents/`)

### 2.1 `DocumentUploadCard`
Permanent card above the table offering tabbed switching between File Upload and Manual Entry.

```typescript
export interface DocumentUploadCardProps {
  currentCount: number;
  maxLimit: number;
  onUploadSuccess: () => void;
  disabled?: boolean;
}
```

### 2.2 `DocumentToolbar`
Search, status filter, and capacity indicator bar.

```typescript
export interface DocumentToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: "all" | DocumentStatus;
  onStatusFilterChange: (status: "all" | DocumentStatus) => void;
  currentCount: number;
  maxLimit: number;
}
```

### 2.3 `DocumentTable`
Interactive table displaying documents, status badges, and action menus.

```typescript
export interface DocumentTableProps {
  documents: DocumentItem[];
  onPreview: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
  isLoading?: boolean;
}
```

### 2.4 `DocumentPreviewSheet`
Slide-over Sheet extending from the right displaying metadata and 500-char text preview.

```typescript
export interface DocumentPreviewSheetProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}
```

### 2.5 `DocumentDeleteDialog`
Safety confirmation modal for permanent cross-store deletion.

```typescript
export interface DocumentDeleteDialogProps {
  document: DocumentItem | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}
```
