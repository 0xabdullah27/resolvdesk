# Phase 0 Research: Conversations Inbox & Ticket Management UI

**Feature**: `009-conversations-inbox-ui`  
**Date**: 2026-09-06  
**Status**: Complete

---

## 1. Objectives & Key Questions

The goal of this research phase is to establish the frontend architecture and backend support needed for the business owner's **Conversations Inbox & Ticket Management UI** on `/dashboard/conversations`.

### Key Research Questions:
1. **Layout & Responsiveness**: How should the split-pane master-detail layout transition smoothly between desktop (>= 768px split-view) and mobile (< 768px drill-down view)?
2. **State & Synchronization**: How should conversation selection be synced with URL query parameters (`?id=<conversation_id>`), and how should background polling (every 30 seconds) insert new chats without disrupting the owner's active transcript?
3. **Backend Ticket Mutation**: Does the current backend support updating an escalated ticket's status (`open` → `in_progress` → `resolved`), and what endpoint should be added?
4. **Theme Token Discipline (Constitution Principle VII)**: How can we guarantee 100% adherence to semantic theme tokens (`bg-background`, `text-foreground`, `border-border`, `bg-card`, `text-muted-foreground`) with zero hard-coded color utilities?

---

## 2. Findings & Architectural Decisions

### 2.1 Master-Detail Layout & Mobile Drill-Down Pattern

- **Desktop (>= 768px)**:
  - Fixed 2-column flex or grid container:
    - **Left sidebar (360px–400px)**: Header with search input, filter tabs (`All` vs `Escalated`), scrollable conversation items list, and pagination controls.
    - **Right transcript pane (flex-1)**: Selected conversation header, customer escalation banner (if escalated), chronological message bubbles stream with citations, and ticket status transition control.
- **Mobile (< 768px)**:
  - If no conversation is selected (or user clicks "Back to list"), show the conversation list view.
  - When a conversation is selected (URL has `?id=...`), show the transcript detail view with a prominent "← Back" button to return to the list.
- **URL Synchronization**:
  - `useSearchParams` and `useRouter` from Next.js App Router:
  - Setting `?id=<conversation_id>` updates the browser history via `router.replace(..., { scroll: false })` to avoid full-page re-renders while allowing bookmarking and direct link sharing.

---

### 2.2 Background Polling & Non-Disruptive List Prepending

- **Polling Mechanism**:
  - A dedicated custom hook `useConversations` polls `GET /api/v1/conversations` every 30 seconds when the document tab is visible (`document.visibilityState === 'visible'`).
  - Manual "Refresh" button provides instant cache invalidation.
- **Non-Disruptive Prepend**:
  - Newly received conversations not present in the current state are prepended to the top with a `is_new: true` flag that renders a subtle pulse dot or "New" badge.
  - The currently active conversation ID and the transcript pane remain untouched; no scroll jumping occurs.

---

### 2.3 Backend Ticket Status Transition Support

- **Current Backend Analysis**:
  - `GET /api/v1/conversations`: Returns `ConversationListResponse` (`items: List[ConversationSummaryResponse]`, `total`, `limit`, `offset`).
  - `GET /api/v1/conversations/stats`: Returns `total_conversations`, `total_messages`, `total_escalated`, `active_last_24h`.
  - `GET /api/v1/conversations/{id}`: Returns `ConversationDetailResponse` with messages and citations.
- **Missing Mutation**:
  - We need a `PATCH /api/v1/conversations/{id}/ticket` endpoint that:
    1. Verifies the conversation belongs to `current_owner.organization_id`.
    2. Validates the status transition (`open` → `in_progress` → `resolved`).
    3. Updates the `Conversation` or associated ticket record.
    4. Returns the updated ticket status and timestamp.

---

### 2.4 Semantic Design Tokens & Theme Discipline

In strict compliance with **Constitution Principle VII**:
- Master list and detail surfaces use `bg-card` and `bg-background`.
- Borders use `border-border` and `border-border/60`.
- Text uses `text-foreground` and `text-muted-foreground`.
- Status badges use semantic variant mappings:
  - `open`: `bg-amber-500/10 text-amber-500 border-amber-500/20` (or `bg-warning/10 text-warning`).
  - `in_progress`: `bg-blue-500/10 text-blue-500 border-blue-500/20`.
  - `resolved`: `bg-emerald-500/10 text-emerald-500 border-emerald-500/20`.
- Zero raw hex values or hard-coded palette utilities (`slate-*`, `sky-*`) in component markup.

---

## 3. Technology Stack & Component Mapping

| Concern | Technology / Component | Responsibility |
|---|---|---|
| **Route Container** | `frontend/app/dashboard/conversations/page.tsx` | Main server/client layout wrapper with error/loading boundaries |
| **Inbox Shell** | `components/conversations/conversations-inbox.tsx` | Master-detail split-pane coordinator, URL query manager |
| **Conversations List** | `components/conversations/conversation-list.tsx` | Search, filter tabs, pagination, conversation item cards |
| **Transcript View** | `components/conversations/conversation-transcript.tsx` | Chronological message bubbles, citations, auto-scroll |
| **Ticket Details Banner**| `components/conversations/escalation-card.tsx` | Visitor email, copy button, `mailto:`, status dropdown selector |
| **Overview Metrics** | `components/conversations/conversation-stats-cards.tsx` | 4 summary metric cards (Total, Messages, Escalated, 24h) |
| **Backend Router** | `backend/app/routers/conversations.py` | Add `PATCH /{id}/ticket` endpoint with tenant isolation |
| **Backend Service** | `backend/app/services/owner_conversation_service.py` | Validate transition and commit status update |

---

## 4. Conclusion & Next Steps

All technical context is verified and no blockers remain. We proceed to **Phase 1: Data Model, Contracts, and Quickstart** generation.
