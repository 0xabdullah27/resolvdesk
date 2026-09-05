# Quickstart & Verification Guide: Feature 007 (Widget Customizer UI)

**Feature**: `007-widget-customizer-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Prerequisites
- Backend environment active (`uv run uvicorn app.main:app --port 8000`).
- Frontend development server running (`npm run dev` in `frontend/` on port 3000).
- Registered business owner account with an active organization.

---

## 2. Automated Test Verification

### 2.1 Backend Contract & Integration Tests
Verify that the `PATCH /api/v1/organization/widget` endpoint works with tenant query isolation and validation:

```powershell
cd backend
uv run pytest tests/contract/test_widget_contract.py -v
uv run pytest
```

Expected result: All tests pass (including new widget update tests).

### 2.2 Frontend Build & Typecheck
Verify zero TypeScript and bundle compilation errors:

```powershell
cd frontend
npm run build
```

Expected result: `✓ Compiled successfully in Turbopack` with 0 type errors.

---

## 3. Manual End-to-End Validation Scenarios

### Scenario 1: Update Appearance & Verify Live Preview
1. Log in to [`http://localhost:3000/login`](http://localhost:3000/login).
2. Navigate to **Widget Customizer** at [`/dashboard/widget`](http://localhost:3000/dashboard/widget).
3. In the form:
   - Change **Bot Name** to `Acme Support`.
   - Change **Welcome Message** to `Hello! How can we assist you today?`.
   - Click the Emerald preset color `#059669`.
   - Select placement **Bottom Left**.
4. Observe the **Live Preview** pane:
   - Notice that the preview header, greeting bubble, and floating bubble immediately update to reflect the new text and color without needing to click Save.
   - Click the preview bubble to toggle between collapsed and open states.
5. Click **Save Changes**. Verify a success toast notification appears and changes persist upon page reload.

### Scenario 2: Copy Embed Code
1. On the **Embed Snippet** card, click **Copy Code**.
2. Verify visual feedback ("Copied!" checkmark or tooltip).
3. Paste into any text editor to verify the snippet matches:
   ```html
   <script src="https://resolvdesk.com/widget.js" data-widget-key="rd_live_..." defer></script>
   ```

### Scenario 3: Rotate Public Key
1. Click **Rotate Key** on the Embed card.
2. Verify an `AlertDialog` appears explaining the 24-hour dual-key grace window.
3. Click **Confirm Rotation**.
4. Verify the new `rd_live_*` key is displayed, the embed snippet updates immediately, and an active grace period banner shows the expiration timestamp.

### Scenario 4: Reset to Defaults
1. Click **Reset to Defaults**.
2. Confirm in the dialog.
3. Verify form inputs revert to `#4F46E5`, "Support Assistant", "Hi! How can I help you today?", `bottom-right`, and `*`.
