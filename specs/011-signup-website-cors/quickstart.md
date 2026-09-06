# Quickstart Validation: Enforce Required Website URL on Signup & Restrict Widget CORS Origins

**Feature**: `011-signup-website-cors` | **Date**: 2026-09-06

---

## 1. Prerequisites

- PostgreSQL database running (Neon / local)
- Backend virtual environment active (`backend/.venv`)
- Frontend development server running (`npm run dev` in `frontend/`)

---

## 2. Automated Test Verification

Run backend unit and contract tests covering registration and origin validation:

```powershell
# Navigate to backend
cd backend

# Run registration unit tests
& .venv\Scripts\pytest tests/unit/test_registration.py -v

# Run widget origin contract tests
& .venv\Scripts\pytest tests/contract/test_widget_contract.py -v
```

---

## 3. End-to-End Manual Verification Scenarios

### Scenario A: Registration Form Validation
1. Navigate to `http://localhost:3000/register`.
2. Fill in:
   - Full Name: `Test Merchant`
   - Email: `merchant@storetest.com`
   - Password: `Password123!`
   - Business Name: `Store Test`
   - Website URL: *(Leave Blank)*
3. Click **Create Account & Workspace**.
4. **Expected Outcome**: Submission is blocked; an inline error shows `"Store or website URL is required"`.

---

### Scenario B: Successful Signup with Automatic Origin Lock
1. In the Website URL field, enter: `https://storetest.com`.
2. Click **Create Account & Workspace**.
3. **Expected Outcome**:
   - Registration completes smoothly; user is redirected to `/dashboard`.
   - In PostgreSQL, `organizations` table has `website_url = 'https://storetest.com'`.
   - In `widget_configurations` table, `allowed_origins` is set to `'storetest.com, localhost'`.
   - Navigating to `/dashboard/widget` displays `storetest.com, localhost` under **Allowed Domains (CORS)**.

---

### Scenario C: Origin Enforcement for Storefront Visitor
1. Simulate a request with authorized origin:
   ```bash
   curl -X POST http://localhost:8000/api/v1/widget/chat \
     -H "Origin: https://storetest.com" \
     -H "Content-Type: application/json" \
     -d '{"widget_key": "<PROVISIONED_KEY>", "message": "hello"}'
   ```
   **Expected Outcome**: Request accepted; streaming starts.

2. Simulate a request from an unauthorized domain:
   ```bash
   curl -X POST http://localhost:8000/api/v1/widget/chat \
     -H "Origin: https://unauthorized-domain.com" \
     -H "Content-Type: application/json" \
     -d '{"widget_key": "<PROVISIONED_KEY>", "message": "hello"}'
   ```
   **Expected Outcome**: `HTTP 403 Forbidden: Domain not authorized for this widget.`, protecting the merchant's AI quota.
