# Quickstart & Verification Guide: Conversations Inbox & Ticket Management UI

**Feature Branch**: `009-conversations-inbox-ui`  
**Date**: 2026-09-06  
**Status**: Ready for Implementation

---

## 1. Prerequisites & Environment Setup

Before validating the conversations inbox, ensure both services are operational:

1. **Backend Service** (FastAPI):
   ```bash
   cd backend
   # Activate virtualenv and run migrations
   .venv\Scripts\activate
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   ```
2. **Frontend Service** (Next.js):
   ```bash
   cd frontend
   npm run dev
   ```
3. **Seed Data / Session**:
   - Ensure an active business owner session exists (e.g., login at `http://localhost:3000/login`).
   - Run existing contract and widget test suites to generate test conversations and escalated tickets:
     ```bash
     pytest backend/tests/test_widget_escalate.py backend/tests/integration/test_owner_conversations_isolation.py -v
     ```

---

## 2. Validation Scenarios

### Scenario 1: Desktop Master-Detail Split-View & Transcript Navigation
1. Open Chrome or any browser at `http://localhost:3000/dashboard/conversations`.
2. **Expected**:
   - Page renders a 4-card metric overview header (Total Chats, Total Messages, Escalations, 24h Volume).
   - Below header, a split-pane layout displays the conversation list on the left and the active transcript on the right.
   - The first conversation in the list is automatically selected and highlighted.
   - The URL reflects the selected ID: `?id=<conversation_id>`.
3. Click a different conversation row in the list:
   - Detail pane smoothly updates to display the new transcript without page reload.
   - URL updates to `?id=<new_id>`.
   - Visitor questions appear on the right/accent side, assistant answers on the left, and citations appear as clickable badges beneath grounded turns.

---

### Scenario 2: Escalation Filter & Contact Tooling
1. Click the **"Escalated"** tab in the sidebar header.
2. **Expected**:
   - List filters to only show conversations with `is_escalated === true` (displaying amber "Escalated" badge).
3. Select an escalated conversation:
   - The transcript header presents an **Escalation Details Banner**.
   - Visitor's email address is displayed alongside two action buttons:
     - **Copy Button**: Clicking it copies the email to clipboard and renders a temporary checkmark confirmation.
     - **Mailto Button**: Clicking it opens the default mail client addressed to the customer.

---

### Scenario 3: Interactive Ticket Status Lifecycle
1. On the selected escalated conversation, observe the status selector (default: `open`).
2. Select **"In Progress"**:
   - UI reflects `in_progress` immediately (optimistic update).
   - Backend `PATCH /api/v1/conversations/{id}/ticket` persists the transition.
   - Conversation row in the master list updates its status indicator.
3. Select **"Resolved"**:
   - Status updates to `resolved` (emerald badge).
   - Re-fetch or page refresh confirms the resolved state persists in the database.

---

### Scenario 4: Mobile Drill-Down Responsiveness
1. Resize browser viewport to `< 768px` (or open Chrome DevTools device mode at 375px width).
2. **Expected**:
   - Full-width list view is visible initially.
   - Clicking a conversation slides/swaps into the full-width Transcript Detail view.
   - A **"← Back to conversations"** header button is displayed.
   - Clicking back returns to the list view without page reloads.

---

### Scenario 5: Non-Disruptive Background Polling
1. While viewing a conversation transcript, simulate an incoming chat turn or new conversation in another window via the chat widget.
2. After the 30-second polling cycle (or clicking the manual **"Refresh"** icon):
   - The new conversation is prepended to the top of the master list with a subtle "New" indicator.
   - The currently active conversation and scroll position in the transcript pane remain completely undisturbed.

---

## 3. Automated Test Execution

Run backend integration and contract tests:
```bash
d:\AbdullahQureshi\workspace\resolvdesk\backend\.venv\Scripts\pytest.exe -v backend/tests/test_widget_escalate.py backend/tests/contract/test_owner_conversations_contract.py backend/tests/integration/test_owner_conversations_isolation.py
```

Run frontend linting and type-checking:
```bash
cd frontend
npm run lint
npx tsc --noEmit
```
