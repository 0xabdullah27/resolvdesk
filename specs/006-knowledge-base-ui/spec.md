# Feature Specification: Knowledge Base & Document Management UI

**Feature Branch**: `006-knowledge-base-ui`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "Feature 006 (Knowledge Base UI)"

---

## Clarifications

### Session 2026-09-05

- Q: How should the document upload and manual text entry interfaces be presented to the business owner on the Knowledge Base page? → A: Option B — Permanent upload card and drop zone embedded directly on the page above the document table, featuring integrated tabbed switching between "File Upload" and "Manual Entry".
- Q: When a business owner selects or drops multiple files simultaneously into the upload zone, how should the upload queue behave? → A: Option A — Sequential batch queue: accept multiple files, validate each item, process uploads sequentially with individual progress tracking, and display a consolidated summary toast.
- Q: How should the document content preview and metadata be presented when the owner clicks "Preview"? → A: Option A — Slide-over Sheet (Drawer) sliding from the right edge, featuring metadata header cards and a full-height scrollable preview of the extracted plain text.
- Q: What filtering and search controls should be available to the business owner on the document table? → A: Option A — Filename search input paired with a Status filter dropdown (`All`, `Ready`, `Processing`, `Failed`).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Format Document Upload & Manual Text Ingestion (Priority: P1) 🎯 MVP

A business owner navigates to their Knowledge Base (`/dashboard/documents`) and uploads business policies, catalogs, FAQs, or guidelines so their AI assistant can answer visitor questions accurately. The page features a permanent upload card positioned directly above the document table, offering two tabs: "File Upload" (drag-and-drop or file browser supporting single or multi-file selection of `.pdf`, `.docx`, `.txt`, `.md` up to 10 MB each) and "Manual Entry" (title + text area up to 100,000 characters). For multiple files, the client executes a sequential batch queue with individual progress tracking. The UI immediately validates the input, submits it to the backend, provides instantaneous visual feedback, and notifies the user upon completion.

**Why this priority**: Without an accessible way for business owners to upload and ingest documents in the web dashboard, the knowledge base remains empty and the AI assistant cannot answer customer questions.

**Independent Test**: Navigate to `/dashboard/documents`, drop multiple sample files (e.g. two `.txt` files) via the embedded drop zone, and verify the sequential queue processes each file with progress feedback, updates the document list, and displays a summary toast. Also switch to the "Manual Entry" tab, submit a manual FAQ note, and verify it appears in the list.

**Acceptance Scenarios**:

1. **Given** an authenticated business owner on `/dashboard/documents`, **When** they drag-and-drop or select one or more valid files (`.pdf`, `.docx`, `.txt`, or `.md`) under 10 MB each into the upload card, **Then** the interface displays a sequential progress queue, uploads each file sequentially via the backend ingestion pipeline, adds the documents to the table in `uploading`/`processing` state, and presents a summary toast notification upon queue completion.
2. **Given** an owner wishing to add quick FAQ notes or store hours without creating a file, **When** they switch to the "Manual Entry" tab in the upload card, enter a title and text content (up to 100,000 characters), and submit, **Then** the system ingests the text snippet and adds it to the document table as a manual document entry.
3. **Given** a user selects a file larger than 10 MB or with an unsupported format (e.g., `.png`, `.exe`, `.zip`), **When** the file is dropped or chosen, **Then** the client immediately halts the upload before sending bytes and displays an inline validation error toast explaining the size/format restriction.
4. **Given** an upload fails due to a duplicate filename (409 Conflict), empty/unreadable text (422 Unprocessable), or organization capacity limit (400 Bad Request), **When** the backend returns the error, **Then** the UI displays an actionable, human-friendly error toast informing the owner of the exact resolution while continuing any remaining queued files in the batch.

---

### User Story 2 - Knowledge Base Listing, Status Tracking & Auto-Refresh (Priority: P1)

A business owner views the complete list of documents in their organization's knowledge base. Each entry displays the filename/title, format badge, file size, ingestion date, chunk count, and live processing status (`ready`, `processing`, or `failed`). When documents are actively processing, the interface automatically tracks their progress until they reach a final state without requiring manual page reloads.

**Why this priority**: Document ingestion involves asynchronous chunking and vector embedding that takes several seconds. Owners must see live, accurate statuses so they know when the AI assistant is fully grounded.

**Independent Test**: Upload a document and observe the status badge immediately reflect `processing` with an animated indicator, automatically update to `ready` within 5–15 seconds via client polling, and display the chunk count.

**Acceptance Scenarios**:

1. **Given** an owner with existing documents, **When** they load `/dashboard/documents`, **Then** they see a table of documents displaying filename, file format, human-readable size, upload date, chunk count, and status badge.
2. **Given** one or more documents are in `uploading` or `processing` status, **When** the owner stays on the page, **Then** the UI polls the document status every 3 seconds until all documents reach `ready` or `failed` status, at which point polling stops.
3. **Given** a document processing pipeline encounters an error (status: `failed`), **When** the owner inspects the status badge, **Then** the badge displays a failure indicator with an explanatory tooltip or popover detailing why ingestion failed.
4. **Given** an organization with zero documents, **When** the owner visits `/dashboard/documents`, **Then** the interface displays a welcoming empty state guiding the owner to upload their first document.

---

### User Story 3 - Document Content Inspection & Metadata Preview (Priority: P2)

A business owner wants to verify what content the AI assistant has indexed from a particular document. They can click "Preview" on any `ready` document to open a slide-over Sheet sliding in from the right edge of the screen, showing document metadata (format, size, chunk count, upload timestamp) and a formatted, scrollable preview of the extracted plain text (first 500 characters).

**Why this priority**: Enables owners to audit their knowledge base, verify text extraction fidelity, and ensure formatting or encoding did not corrupt the ingested data without losing visual context of the document table.

**Independent Test**: Click "Preview" on an active document row, verify a right-side Sheet slides in showing document metadata and the 500-character content preview snippet, and close the sheet.

**Acceptance Scenarios**:

1. **Given** a document in `ready` status, **When** the owner clicks the "Preview" button or row action, **Then** a slide-over Sheet opens from the right edge displaying the document's metadata (filename, size, format, chunk count, creation date) and a scrollable plain-text snippet previewing the first 500 characters of extracted text.
2. **Given** the preview Sheet is open, **When** the owner clicks the close button or presses Escape, **Then** the Sheet slides closed cleanly without resetting the underlying document list state.

---

### User Story 4 - Permanent Document Deletion with Safety Confirmation (Priority: P2)

An owner needs to remove outdated policies, discontinued pricing sheets, or deprecated guides from the knowledge base. Clicking "Delete" opens a safety confirmation dialog warning that all associated AI vector embeddings will be permanently purged. Upon confirmation, the document and its embeddings are deleted atomically, and the list updates immediately.

**Why this priority**: Prevents stale or inaccurate business information from being referenced by the AI assistant. Atomic cross-store deletion is a foundational requirement of the ResolvDesk Constitution.

**Independent Test**: Select a document, click "Delete", cancel the confirmation dialog to verify safety, click "Delete" again, confirm the action, and verify the document is immediately removed from the table with a success toast notification.

**Acceptance Scenarios**:

1. **Given** an existing document in the table, **When** the owner clicks the "Delete" action, **Then** a confirmation dialog (`AlertDialog`) appears warning that the document and its AI vector embeddings will be permanently deleted.
2. **Given** the confirmation dialog is open, **When** the owner confirms deletion, **Then** the system sends the deletion request, removes the row from the interface, and displays a success toast.
3. **Given** an owner cancels the confirmation dialog, **When** they click "Cancel" or click outside, **Then** no deletion occurs and the document remains intact.
4. **Given** a network or server failure during deletion, **When** the deletion fails, **Then** the UI displays an error toast and retains the document in the list.

---

### User Story 5 - Capacity Tracking, Search & Responsive Experience (Priority: P3)

The knowledge base dashboard provides clear visibility into organizational capacity (e.g., "3 of 50 documents used") with a visual progress bar. The document table includes a toolbar with a filename search input and a Status filter dropdown (`All`, `Ready`, `Processing`, `Failed`). Owners can quickly filter or search documents by filename and inspect documents needing attention. The entire interface adapts fluidly across desktop, tablet, and mobile screens, and strictly adheres to semantic design tokens for seamless light and dark mode switching.

**Why this priority**: Enhances usability, provides clarity on platform quota boundaries, and ensures accessibility across mobile devices and theme preferences.

**Independent Test**: Resize viewport to mobile dimensions to verify table responsiveness, type a query in the search input and select a status filter to filter documents, and switch between light and dark themes to verify design token consistency.

**Acceptance Scenarios**:

1. **Given** an owner with multiple documents, **When** they view the header of `/dashboard/documents`, **Then** they see a capacity badge (e.g., "7 / 50 Documents") and a proportional progress bar showing used quota.
2. **Given** a list of documents in various states, **When** the owner enters a query in the search bar or selects a status filter (e.g. `Failed`), **Then** the list instantly filters to matching items in real time without a server round-trip.
3. **Given** a user accessing the dashboard on a mobile screen (< 768px), **When** they view the documents page, **Then** the layout stacks cleanly, displaying responsive cards or a horizontally scrollable table without clipped text or overflowing actions.
4. **Given** the user toggles between light and dark themes, **When** the theme switches, **Then** all cards, borders, badges, dialogs, and text elements adapt immediately using semantic CSS tokens (`bg-card`, `text-foreground`, `border-border`, `bg-primary`, etc.) without visual contrast defects.

---

### Edge Cases

- **0-Byte / Empty File**: Client-side validation rejects files with 0 bytes immediately before uploading, notifying the owner that the file is empty.
- **Scanned / Image-Only PDF**: If an uploaded PDF has zero extractable text, the backend marks it as `failed` with message "Document contains no readable text". The UI displays this failure reason clearly with a suggestion to use a text-based document or manual entry.
- **Multiple File Selection**: When multiple files are dropped or selected simultaneously, the client enqueues them into a sequential batch queue, validating each file against format, size, and remaining organization quota. Each file is uploaded one at a time with dedicated progress indicators, and an individual error (e.g., duplicate filename) halts only that item while allowing the rest of the queue to proceed.
- **Quota Limit Reached (50/50)**: When an organization reaches 50 documents, the "Add Document" and "Manual Entry" buttons are disabled with a tooltip explaining the 50-document limit, preventing premature upload failures.
- **Duplicate Filename (409 Conflict)**: When an owner uploads a file whose name already exists in their organization, the UI displays a clear toast: "A document named '[filename]' already exists. Please rename the file or delete the existing version first."
- **Network Interruption During Upload**: If the upload is interrupted mid-transfer, an error toast notifies the owner and allows a one-click retry.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render a permanent upload card directly above the document table on `/dashboard/documents` featuring tabbed switching between a file drop zone (accepting `.pdf`, `.docx`, `.txt`, and `.md`) and a manual text entry form.
- **FR-002**: The client MUST validate file sizes prior to upload, enforcing a strict 10 MB per-file limit.
- **FR-003**: The system MUST provide a "Manual Entry" interface allowing owners to input a title and raw text content (1 to 100,000 characters).
- **FR-004**: The system MUST submit document uploads and raw text entries using authenticated Next.js Server Actions connecting to the FastAPI backend `/api/v1/documents/upload` and `/api/v1/documents/raw`.
- **FR-005**: The system MUST display a list of all documents belonging to the authenticated owner's organization, including filename/title, file type, file size, creation date, chunk count, and status badge.
- **FR-006**: The system MUST automatically poll document statuses every 3 seconds while any document is in `uploading` or `processing` state, terminating polling once all documents reach terminal states (`ready` or `failed`).
- **FR-007**: The system MUST provide a document preview slide-over Sheet extending from the right edge displaying document metadata and a scrollable view of the first 500 characters of extracted text for any `ready` document.
- **FR-008**: The system MUST require user confirmation via an `AlertDialog` before executing any permanent document deletion.
- **FR-009**: The system MUST immediately remove the deleted document from the view and revalidate the server cache upon successful deletion.
- **FR-010**: The system MUST display human-friendly, actionable error messages via Sonner toast notifications for all HTTP error scenarios (400, 409, 413, 415, 422, 500).
- **FR-011**: The system MUST display a live capacity tracker showing current document count versus the 50-document maximum limit with a visual progress bar.
- **FR-012**: The system MUST disable upload and manual entry triggers when the 50-document quota is reached, displaying a descriptive tooltip.
- **FR-013**: The system MUST provide real-time client-side search by filename/title and a status filter dropdown (`All`, `Ready`, `Processing`, `Failed`).
- **FR-014**: The system MUST render an illustrated empty state when no documents have been ingested yet, with clear calls to action for uploading a file or adding a manual entry.
- **FR-015**: All UI components MUST strictly utilize semantic theme tokens (`bg-background`, `text-foreground`, `border-border`, `bg-primary`, etc.) adhering to Constitution Principle VII, with zero hard-coded palette utility classes.

---

### Key Entities *(include if feature involves data)*

- **Document Item**: Represents an ingested knowledge base document in the UI. Attributes:
  - `id` (UUID string)
  - `filename` (string)
  - `file_type` (string: `pdf`, `docx`, `txt`, `md`, `raw`)
  - `file_size_bytes` (integer)
  - `chunk_count` (integer)
  - `status` (string: `uploading`, `processing`, `ready`, `failed`)
  - `created_at` (ISO timestamp string)
- **Document Detail / Preview**: Extends Document Item with `preview_text` (string, up to 500 characters) and processing error details (optional string).
- **Upload Payload**: File multipart form data (`file: File`) sent to the backend upload endpoint.
- **Raw Text Entry Payload**: JSON body containing `title` (string, 1-255 characters) and `content` (string, 1-100,000 characters).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Owners can complete an upload of a valid document under 10 MB in fewer than 3 clicks from `/dashboard/documents`.
- **SC-002**: Client-side validation catches 100% of oversized (> 10 MB) or invalid format files before network bytes are transmitted.
- **SC-003**: Ingestion progress updates are reflected in the UI within 3 seconds of a backend status transition without manual browser refresh.
- **SC-004**: Document content preview opens within 500ms of clicking the "Preview" action on a `ready` document.
- **SC-005**: 100% of UI elements conform to Constitution Principle VII (semantic tokens), verified across both dark and light modes.
- **SC-006**: 100% of failed upload/ingestion scenarios display human-readable guidance rather than raw exception text or status codes.

---

## Assumptions

- The backend document ingestion service (`/api/v1/documents/*`) created in Feature 002 is functional and accessible via Next.js Server Actions.
- FastEmbed and Qdrant process standard 10-page text documents to `ready` state within 5–15 seconds under normal operating conditions.
- Single-page client-side search and filtering is sufficient for up to 50 documents without requiring server-side paginated queries.
- Authentication tokens are managed in httpOnly cookies and propagated to backend calls via server-side headers (`Authorization: Bearer <token>`).
