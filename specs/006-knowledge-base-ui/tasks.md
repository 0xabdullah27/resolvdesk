# Tasks: Knowledge Base & Document Management UI

**Feature Branch**: `006-knowledge-base-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup & Types (Shared Infrastructure)

**Purpose**: TypeScript definitions, validation schemas, and client/server contracts.

- [ ] T001 [P] Create document TypeScript types and interfaces in `frontend/types/document.ts`
- [ ] T002 [P] Create document Zod validation schemas in `frontend/lib/validations/document.ts`

---

## Phase 2: Foundational (Server Actions & API Layer)

**Purpose**: Server Actions bridging Next.js to FastAPI `/api/v1/documents/*` endpoints.

**⚠️ CRITICAL**: Must complete before any user story UI components can connect to live backend data.

- [ ] T003 Implement `listDocumentsAction` and `getDocumentDetailsAction` in `frontend/actions/document-actions.ts`
- [ ] T004 [P] Implement `uploadDocumentAction` and `createRawDocumentAction` in `frontend/actions/document-actions.ts`
- [ ] T005 [P] Implement `deleteDocumentAction` with path revalidation in `frontend/actions/document-actions.ts`

**Checkpoint**: Core Server Actions verified and ready to handle uploads, queries, and deletions.

---

## Phase 3: User Story 1 - Multi-Format Document Upload & Manual Text Ingestion (Priority: P1) 🎯 MVP

**Goal**: Business owners can drag-and-drop documents (`.pdf`, `.docx`, `.txt`, `.md` up to 10 MB) or type manual FAQ notes (up to 100,000 characters) into an embedded upload card above the table.

**Independent Test**: Navigate to `/dashboard/documents`, upload a sample text file and submit a manual FAQ note; verify validation errors on oversized/invalid files and observe successful ingestion triggers with toast notifications.

- [ ] T006 [P] [US1] Implement drag-and-drop file upload zone in `frontend/components/documents/file-dropzone.tsx`
- [ ] T007 [P] [US1] Implement manual text entry form with live character counter in `frontend/components/documents/manual-entry-form.tsx`
- [ ] T008 [US1] Implement sequential batch upload queue manager with per-item progress tracking in `frontend/components/documents/upload-queue.tsx`
- [ ] T009 [US1] Build permanent upload card component with tabbed switching in `frontend/components/documents/document-upload-card.tsx`

**Checkpoint**: User Story 1 functional — owners can upload files and submit manual text with client-side validation and toast feedback.

---

## Phase 4: User Story 2 - Knowledge Base Listing, Status Tracking & Auto-Refresh (Priority: P1)

**Goal**: Display all organization documents in a rich table with format badges, file size, chunk counts, and live status badges (`ready`, `processing`, `failed`) that auto-poll every 3 seconds until finished.

**Independent Test**: Upload a document and observe the status badge show `processing` with a spinner, automatically update to `ready` within 5–15 seconds via polling, and display chunk count.

- [ ] T010 [P] [US2] Implement status badge component with spinner and failure tooltip in `frontend/components/documents/document-status-badge.tsx`
- [ ] T011 [P] [US2] Implement clean empty state component with guidance illustrations in `frontend/components/documents/document-empty-state.tsx`
- [ ] T012 [US2] Implement interactive document table displaying file details and action menus in `frontend/components/documents/document-table.tsx`
- [ ] T013 [US2] Implement self-terminating 3-second status polling hook and client container in `frontend/components/documents/documents-view.tsx`
- [ ] T014 [US2] Connect SSR initial data fetching in `frontend/app/dashboard/documents/page.tsx`

**Checkpoint**: User Stories 1 AND 2 functional — complete upload, listing, auto-refresh, and empty state operational.

---

## Phase 5: User Story 3 - Document Content Inspection & Metadata Preview (Priority: P2)

**Goal**: Business owners can click "Preview" on any `ready` document to open a slide-over Sheet from the right edge showing metadata and a scrollable 500-character content preview.

**Independent Test**: Click "Preview" on any active document row; verify the right-side Sheet smoothly opens displaying metadata and the extracted text preview snippet.

- [ ] T015 [US3] Implement slide-over preview Sheet component with on-demand detail fetching in `frontend/components/documents/document-preview-sheet.tsx`
- [ ] T016 [US3] Wire row preview action trigger from document table to preview Sheet in `frontend/components/documents/documents-view.tsx`

**Checkpoint**: User Story 3 functional — owners can inspect extracted text and chunk metrics on demand.

---

## Phase 6: User Story 4 - Permanent Document Deletion with Safety Confirmation (Priority: P2)

**Goal**: Owners can permanently delete documents from the knowledge base with an `AlertDialog` warning that vector embeddings will be purged from Qdrant.

**Independent Test**: Click "Delete" on a document row, verify the confirmation dialog appears, confirm deletion, and verify immediate removal from the table and server cache.

- [ ] T017 [US4] Implement destructive `AlertDialog` confirmation dialog in `frontend/components/documents/document-delete-dialog.tsx`
- [ ] T018 [US4] Wire delete action trigger, optimistic removal, and Sonner toast feedback in `frontend/components/documents/documents-view.tsx`

**Checkpoint**: User Story 4 functional — atomic deletion with safety confirmation operating smoothly.

---

## Phase 7: User Story 5 - Capacity Tracking, Search & Responsive Experience (Priority: P3)

**Goal**: Real-time filename search, Status filter dropdown (`All`, `Ready`, `Processing`, `Failed`), capacity progress bar (`X / 50 Documents`), and mobile-responsive layout.

**Independent Test**: Type a search query to filter documents, select a status filter, verify the capacity bar reflects total count, and check responsive card layout on mobile viewports.

- [ ] T019 [P] [US5] Implement toolbar with capacity progress bar, search input, and Status filter dropdown in `frontend/components/documents/document-toolbar.tsx`
- [ ] T020 [US5] Wire real-time client-side search filtering and status filtering in `frontend/components/documents/documents-view.tsx`
- [ ] T021 [US5] Add mobile-responsive card stacking view for small screens in `frontend/components/documents/document-table.tsx`

**Checkpoint**: User Story 5 functional — filtering, capacity tracking, and responsive mobile layouts complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Theme token discipline, loading/error states, and end-to-end verification.

- [ ] T022 Verify Constitution Principle VII compliance (100% semantic theme tokens, zero hard-coded palette utilities) across all document components
- [ ] T023 Implement loading skeleton in `frontend/app/dashboard/documents/loading.tsx` and error boundary in `frontend/app/dashboard/documents/error.tsx`
- [ ] T024 Run end-to-end validation scenarios against `quickstart.md` and verify clean production build (`npm run build`)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user story UI work.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Core upload capability.
- **User Story 2 (Phase 4)**: Depends on Phase 3. Table listing & auto-polling.
- **User Story 3 (Phase 5)**: Depends on Phase 4. Detail preview Sheet.
- **User Story 4 (Phase 6)**: Depends on Phase 4. Deletion dialog.
- **User Story 5 (Phase 7)**: Depends on Phase 4. Toolbar, search, status filter, capacity bar.
- **Polish (Phase 8)**: Depends on all user stories being complete.

### Parallel Opportunities
- `T001` and `T002` can run in parallel (Phase 1).
- `T004` and `T005` can run in parallel with `T003` (Phase 2).
- `T006` and `T007` can run in parallel (Phase 3).
- `T010` and `T011` can run in parallel (Phase 4).
- `T015` (US3) and `T017` (US4) can run in parallel once Phase 4 is complete.

---

## Implementation Strategy

### MVP Scope (User Story 1 + User Story 2)
1. Complete Phase 1 (Types & Schemas)
2. Complete Phase 2 (Server Actions)
3. Complete Phase 3 (Upload Card & Ingestion)
4. Complete Phase 4 (Document Table & Auto-Polling)
5. **Validate MVP**: Business owners can upload documents, see them in the table, and watch them transition to `ready`.

### Incremental Delivery
- Add User Story 3 (Preview Sheet) → audit extracted text.
- Add User Story 4 (Atomic Deletion) → safely purge documents.
- Add User Story 5 (Toolbar, Search, Capacity) → ease of management at scale.
- Final Polish (Tokens, Skeletons, Build verification) → production-ready delivery.
