# Quickstart & Validation Guide: Knowledge Base & Document Management UI

**Feature Branch**: `006-knowledge-base-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md) | **Contracts**: [knowledge_base_ui_contracts.md](./contracts/knowledge_base_ui_contracts.md)

---

## 1. Prerequisites & Environment Setup

Ensure both the backend API and Next.js frontend are running locally:

```bash
# Terminal 1: Backend FastAPI Service (with Qdrant and DB initialized)
cd backend
uv run uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend Next.js Development Server
cd frontend
npm run dev
```

1. Navigate to [http://localhost:3000/login](http://localhost:3000/login) and log into an active business owner account.
2. Open the Knowledge Base page at [http://localhost:3000/dashboard/documents](http://localhost:3000/dashboard/documents).

---

## 2. End-to-End Validation Scenarios

### Scenario 1: Multi-Format File Upload & Status Polling
1. In the **Document Upload Card** above the table, ensure the **File Upload** tab is active.
2. Drag and drop a sample text or markdown file (e.g. `policies.txt` or `faq.md`) under 10 MB into the drop zone.
3. **Verify**:
   - The drop zone displays an active uploading progress bar.
   - A success toast announces `"File uploaded for processing"`.
   - The document appears immediately in the table with status badge `"processing"` and a subtle spinner.
   - Within 5 to 15 seconds, the status badge automatically transitions to `"ready"` (green badge) with a positive chunk count without refreshing the browser.

### Scenario 2: Manual Text / FAQ Snippet Ingestion
1. In the upload card, switch to the **Manual Entry** tab.
2. Enter:
   - **Title**: `Store Hours & Return Policy`
   - **Content**: `Our physical store is open Monday through Saturday from 9 AM to 8 PM. Returns are accepted within 30 days of purchase with receipt.`
3. Click **"Ingest Text"**.
4. **Verify**:
   - The button enters a loading state.
   - The form clears upon success and displays a confirmation toast.
   - A new row appears with badge format `MANUAL`, transitioning to `ready`.

### Scenario 3: Real-Time Search & Status Filtering
1. With multiple documents in the table:
2. Type a matching keyword in the **Search documents...** input.
   - **Verify**: Only documents matching the title in real time are shown.
3. Clear the search input and change the **Status** dropdown from `All Statuses` to `Ready`.
   - **Verify**: Only documents in `ready` state are displayed.

### Scenario 4: Content Inspection & Metadata Preview Sheet
1. On any `ready` document row, click the row actions menu (`...`) and select **"Preview"**.
2. **Verify**:
   - A slide-over Sheet smoothly animates from the right edge.
   - Displays document metadata: format badge, formatted size, chunk count, and upload date.
   - Displays the first 500 characters of extracted plain text in a scrollable preview area.
3. Click the close button or press `Escape` to dismiss the sheet.

### Scenario 5: Permanent Deletion with Safety Confirmation
1. On a document row, click `...` and select **"Delete"**.
2. **Verify**:
   - An `AlertDialog` opens with destructive styling warning that the document and vector embeddings will be permanently removed.
3. Click **"Cancel"**; verify the document remains.
4. Click **"Delete"** again and click **"Delete Document"**.
5. **Verify**:
   - Deletion executes; the row disappears from the table with a confirmation toast.
   - The capacity counter (e.g. `X / 50 Documents`) updates immediately.

### Scenario 6: Client-Side Validation & Quota Boundaries
1. Attempt to drag a `.png` or `.exe` file into the drop zone.
   - **Verify**: File is rejected immediately with an alert toast `"Unsupported file format"`.
2. Attempt to upload a duplicate filename already existing in your list.
   - **Verify**: Backend returns `409 Conflict`; UI displays `"A document named '[filename]' already exists"`.
