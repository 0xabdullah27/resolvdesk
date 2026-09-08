# Quickstart Validation Guide: Platform Admin & User Management Dashboard

**Feature Branch**: `013-platform-admin-dashboard`
**Created**: 2026-09-09
**Status**: Ready

This guide outlines runnable verification steps to validate the Platform Creator Dashboard feature end-to-end across backend and frontend services.

---

## 1. Prerequisites & Environment Setup

1. **Backend Environment**:
   - PostgreSQL database accessible via `DATABASE_URL`.
   - Ensure `PLATFORM_OWNER_EMAIL` is configured in `backend/.env` (e.g. `PLATFORM_OWNER_EMAIL=admin@resolvdesk.online`).
   - Run Alembic migration to add `role` column to `owners`:
     ```bash
     cd backend
     poetry run alembic upgrade head
     ```

2. **Frontend Environment**:
   - Better Auth configured in `frontend/.env.local`.
   - Install dependencies and ensure Next.js compiles:
     ```bash
     cd frontend
     npm run build
     ```

---

## 2. Automated Test Scenarios

Run the backend test suite verifying superadmin authorization, user directory search, and suspension enforcement:

```bash
cd backend
poetry run pytest tests/test_admin_router.py -v
```

**Expected Results**:
- `test_non_admin_cannot_access_admin_endpoints`: Asserts HTTP 403 Forbidden when an owner with `role="owner"` calls `/api/v1/admin/metrics`.
- `test_superadmin_can_view_metrics`: Asserts HTTP 200 and valid metric counters when called by an owner with `role="superadmin"`.
- `test_search_and_filter_users`: Asserts query parameter filtering by status and text search across organizations.
- `test_admin_cannot_suspend_self`: Asserts HTTP 400 Bad Request when admin attempts to suspend their own account.
- `test_suspended_user_token_and_api_blocked`: Asserts HTTP 403 when a suspended user makes requests to `/api/v1/documents` or other workspace endpoints.
- `test_widget_config_reflects_suspension`: Asserts `GET /api/v1/widget/config` returns `is_active=False` for suspended organizations.

---

## 3. Manual End-to-End Walkthrough

### Scenario 1: Platform Overview & Metrics
1. Log in with the account matching `PLATFORM_OWNER_EMAIL`.
2. Navigate to `http://localhost:3000/admin`.
3. Verify that the Platform Admin header displays with high-level KPI cards:
   - Total Users
   - Total Organizations
   - Active Users vs Suspended Users
   - Total Ingested Documents
   - Total Conversations
4. Verify that loading states (`loading.tsx`) display during route navigation.

### Scenario 2: Search & Filter User Directory
1. In the User Directory table on `/admin`, type a registered organization or user name into the search box.
2. Confirm results update within 500ms using debounced search.
3. Filter by "Suspended". Confirm that only suspended users appear in the list.
4. Click "Clear filters" to return to the full directory.

### Scenario 3: Suspend & Reactivate User
1. Locate a test user row in the directory.
2. Click "Suspend Account". An accessible modal opens requesting confirmation.
3. Confirm suspension.
4. Verify:
   - User badge immediately reflects "Suspended".
   - The user cannot access `http://localhost:3000/dashboard` on their browser session.
   - Deployed widget for that user displays `"Support is temporarily offline"` and message sending is disabled.
5. In the admin directory, click "Reactivate Account" and confirm.
6. Verify:
   - User badge returns to "Active".
   - Dashboard access and widget chat are restored.

### Scenario 4: Authorization Gating for Regular Owners
1. Log in as a regular merchant owner (`role="owner"`).
2. Manually navigate to `http://localhost:3000/admin`.
3. Verify that the user is immediately denied access (redirected to `/dashboard` with an unauthorized alert).
