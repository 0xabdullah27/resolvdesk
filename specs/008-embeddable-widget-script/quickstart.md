# Quickstart & Verification Guide: Embeddable Customer Chat Widget Script

**Feature**: Embeddable Customer Chat Widget Script (`public/widget.js`)  
**Branch**: `008-embeddable-widget-script`  
**Date**: 2026-09-05  

---

## 1. Overview & Prerequisites

This quickstart guides developers through verifying the standalone `widget.js` script end-to-end, including:
1. Backend automated contract tests (`pytest`).
2. Live interactive testing using a local test HTML fixture (`test-widget.html`).
3. Verifying Shadow DOM style isolation, SSE streaming, knowledge citations, and ticket escalation.

### Prerequisites

- **Backend**: Python 3.11+ with `uv` package manager installed (`cd backend && uv run pytest`).
- **Frontend**: Node.js 20+ with `npm` installed (`cd frontend && npm run build`).

---

## 2. Automated Backend Contract Verification

Run the automated backend test suite to verify public widget configuration, chat streaming, and the new escalation endpoint:

```bash
# In repo root:
cd backend
uv run pytest tests/test_widget.py tests/test_widget_escalate.py -v
```

**Expected Outcomes**:
- `GET /api/v1/widget/config` returns 200 with branding data when given a valid key.
- `GET /api/v1/widget/config` returns 403 when origin header does not match whitelist.
- `POST /api/v1/widget/chat` streams SSE events (`start`, `token`, `citation`, `done`).
- `POST /api/v1/widget/chat/escalate` updates `conversation.is_escalated = True` and returns ticket confirmation `TK-XXXXXX`.

---

## 3. Local Interactive Test Fixture

A standalone test HTML fixture is provided at `frontend/public/test-widget.html` simulating an ecommerce storefront:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Storefront Embed Test - ResolvDesk Widget</title>
  <style>
    /* Aggressive global CSS reset to test Shadow DOM style isolation */
    * {
      box-sizing: content-box !important;
      font-family: "Comic Sans MS", cursive !important;
      color: red !important;
    }
    body {
      margin: 40px;
      background: #f1f5f9;
    }
    h1 {
      font-size: 32px;
    }
  </style>
</head>
<body>
  <h1>Merchant Storefront Demo</h1>
  <p>This test page applies global red Comic Sans styles to verify that ResolvDesk's Shadow DOM encapsulates styles completely without bleeding.</p>

  <!-- Embed ResolvDesk Widget -->
  <script 
    src="/widget.js" 
    data-widget-key="rd_live_test_key" 
    data-api-base="http://localhost:8000" 
    defer>
  </script>
</body>
</html>
```

### Steps to Run Interactive Test

1. **Start Backend Server**:
   ```bash
   cd backend
   uv run uvicorn app.main:app --reload --port 8000
   ```

2. **Start Frontend Server (or static server)**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to Test Page**:
   Open browser at `http://localhost:3000/test-widget.html`.

---

## 4. End-to-End Validation Scenarios

### Scenario 1: Launcher & Customized Branding (FR-001 - FR-006)
1. Observe the bottom-right corner of `http://localhost:3000/test-widget.html`.
2. Confirm the circular launcher bubble appears in < 300ms styled with the merchant's primary color.
3. Confirm the launcher is unaffected by the host page's red font style (proves Shadow DOM isolation).
4. Click the launcher bubble:
   - Chat window opens with smooth entrance transition.
   - Header displays configured `bot_display_name`.
   - Welcome greeting appears in an assistant bubble.

---

### Scenario 2: Real-Time SSE Streaming & Citations (FR-008, FR-009)
1. Type: *"What is your return policy?"* and press Enter.
2. Observe:
   - User bubble appears immediately.
   - Animated typing indicator displays.
   - First token streams in under 2 seconds.
   - Assistant answers word-by-word.
   - Verifiable document citation badge appears beneath the message.

---

### Scenario 3: Reactive Human Escalation & Ticket Confirmation (FR-011)
1. Type: *"I need to speak with a human manager about a damaged item."*
2. Assistant responds with fallback or human escalation suggestion.
3. An inline **"Escalate to Human Agent"** button appears.
4. Click the button:
   - Inline form expands requesting email and optional notes.
5. Enter `shopper@example.com` and submit:
   - Form transforms into an inline **Confirmation Card**:
     `✅ Ticket #TK-XXXXXX Submitted`
   - Typing input box remains active for further questions.

---

### Scenario 4: Session Continuity Across Reloads (FR-007)
1. Refresh the browser page (`F5`).
2. Open the launcher bubble:
   - Full conversation history (questions, streamed answers, citation badges, and ticket confirmation) is preserved and instantly re-rendered from `localStorage`.

---

### Scenario 5: Mobile Viewport Responsiveness (FR-010)
1. Open Chrome DevTools (`F12`) and toggle device toolbar (`Ctrl+Shift+M`).
2. Select iPhone 14 (390px width).
3. Open the widget:
   - Chat expands into full-screen immersive view covering 100% of viewport.
   - Sticky top bar displays assistant name and 44x44px close button.
   - Virtual keyboard does not cause horizontal scrolling or clipping.
