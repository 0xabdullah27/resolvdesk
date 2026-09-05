# Research: Knowledge Base & Document Management UI

**Feature Branch**: `006-knowledge-base-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. File Upload & Batch Processing Architecture

### Decision
Use Next.js Server Actions (`"use server"`) passing `FormData` to the FastAPI backend `/api/v1/documents/upload` via `backendFetch`, orchestrated by a client-side sequential queue with per-file progress tracking.

### Rationale
1. **Security & Session Propagation**: Better Auth session tokens are stored in `httpOnly` secure cookies. Next.js Server Actions read these cookies on the server (`headers()`), resolve the bearer JWT, and forward it to FastAPI. Client-side direct browser-to-FastAPI uploads would require exposing tokens to JavaScript or handling cross-origin CORS cookies.
2. **Batch Queue Isolation**: Processing multiple files sequentially rather than concurrently protects backend memory and prevents saturating the local FastEmbed/Qdrant embedding pipeline. If one file in the batch fails (e.g., duplicate filename 409 or empty text 422), the client isolates the error and continues uploading subsequent queued files.
3. **Chunking & Payload Size**: A 10 MB file size limit per document matches standard Next.js Server Action body size configurations (`serverActions.bodySizeLimit: '10mb'`).

### Alternatives Considered
- *Direct Browser Fetch to FastAPI*: Rejected because Better Auth cookies are `httpOnly` and not readable by client-side JS; requires exposing JWT or complex CORS proxying.
- *Concurrent Parallel Uploads*: Rejected because simultaneous FastEmbed chunking runs high CPU spikes and could exhaust Neon connection pool slots.

---

## 2. Real-Time Status Tracking: Polling vs. WebSockets / SSE

### Decision
Implement client-side conditional polling every 3 seconds (`useInterval` / `useEffect`) active **only** while one or more documents have status `uploading` or `processing`. Once all documents reach terminal states (`ready` or `failed`), polling terminates immediately.

### Rationale
1. **Lightweight & Self-Cleaning**: FastEmbed vector embedding and Qdrant ingestion typically take 5 to 15 seconds for average business documents (10–50 pages). Polling every 3 seconds produces only 2–5 lightweight HTTP requests per upload cycle.
2. **Architectural Simplicity**: FastAPI already provides `GET /api/v1/documents`. Introducing a WebSocket or dedicated SSE channel for background document ingestion adds substantial protocol overhead and stateful connection tracking without meaningful user benefit.
3. **Automatic Clean-Up**: When no documents are in active transition, the polling interval is cleared, resulting in zero background network traffic.

### Alternatives Considered
- *Server-Sent Events (SSE) for Document Status*: While SSE is used for visitor chat streaming (`/api/v1/chat/stream`), using it for document lifecycle notifications adds unnecessary connection management for brief background tasks.
- *WebSockets*: Rejected per Constitution Principle V (Layered Architecture & Simplicity) as over-engineering for a periodic status check.

---

## 3. Component Architecture & UI Layout

### Decision
Implement a unified `/dashboard/documents` page with:
1. **Top Section**: Permanent `DocumentUploadCard` directly above the table featuring tabs for `File Upload` (drag-and-drop zone) and `Manual Entry` (title + text area).
2. **Middle Section**: `DocumentToolbar` with capacity progress bar (`X / 50 Documents`), real-time search input by filename, and `Status` dropdown filter (`All`, `Ready`, `Processing`, `Failed`).
3. **Main Section**: `DocumentTable` displaying filename, file type badge, size, date, chunk count, status badge, and row action menu.
4. **Overlay / Drawer**: Slide-over `DocumentPreviewSheet` (shadcn `Sheet` with `side="right"`) fetching detailed metadata and the 500-character content preview on demand.
5. **Confirmation**: `DocumentDeleteDialog` (`AlertDialog`) enforcing permanent deletion confirmation.

### Rationale
1. **Clear Hierarchy**: Keeps all knowledge management tasks (uploading, inspecting, filtering, deleting) within a single coherent view without multi-level route hopping.
2. **On-Demand Preview Fetching**: The list query (`GET /api/v1/documents`) remains fast and compact by excluding large preview texts; the preview text is loaded only when the owner explicitly clicks "Preview" (`GET /api/v1/documents/{id}`).

### Alternatives Considered
- *Modal Dialog for Uploads*: Rejected during clarification in favor of an embedded permanent card above the table, providing immediate drag-and-drop visibility.
- *Centered Preview Modal*: Rejected during clarification in favor of a slide-over Sheet from the right edge to provide superior vertical reading height for multi-paragraph snippets.

---

## 4. Theme Token Discipline (Constitution Principle VII)

### Decision
Use exclusively semantic CSS variables and design tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`, `text-muted-foreground`, `bg-destructive`, etc.) with zero hard-coded color palette classes (`slate-*`, `zinc-*`, `blue-*`, etc.).

### Rationale
- Required by ResolvDesk Constitution Principle VII. Ensures flawless automatic dark mode and light mode rendering and prevents styling fragmentation.
