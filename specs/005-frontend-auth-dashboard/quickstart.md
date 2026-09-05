# Quickstart & Verification Guide: Frontend Authentication & Dashboard Shell

**Feature**: `005-frontend-auth-dashboard`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This guide details the step-by-step validation scenarios to verify that the authentication client, onboarding registration, protected routes, and responsive dashboard shell function properly end-to-end.

---

## 1. Prerequisites

1. **FastAPI Backend Server**:
   Ensure the backend is running and reachable at `http://localhost:8000`:
   ```bash
   cd backend
   uv run uvicorn app.main:app --port 8000
   ```
2. **Next.js Frontend Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 2. Validation Scenarios

### Scenario 1: Self-Service Owner Registration (US1 - MVP)
1. Navigate to `http://localhost:3000/register`.
2. Enter valid test values:
   - **Full Name**: `Sarah Connor`
   - **Email**: `sarah@skynetdefense.com`
   - **Password**: `SecurePass123!`
   - **Business Name**: `Cyberdyne Security`
   - **Website URL**: `https://cyberdyne.example.com`
3. Click **Create Account**.
4. **Expected Outcome**:
   - Submit button displays a loading spinner and is disabled.
   - Form creates credentials via Better Auth and calls `POST /api/v1/registration/complete`.
   - The browser redirects immediately to `http://localhost:3000/dashboard`.
   - The workspace header renders `"Cyberdyne Security"`.

---

### Scenario 2: Server-Side Route Protection (US3)
1. Open a new **Incognito / Private Window** (no active cookies).
2. Attempt navigating directly to `http://localhost:3000/dashboard`.
3. **Expected Outcome**:
   - The server intercepts the request before rendering any dashboard content.
   - The browser is redirected to `http://localhost:3000/login?callbackUrl=%2Fdashboard`.
4. Attempt navigating to `http://localhost:3000/dashboard/documents`.
5. **Expected Outcome**:
   - Redirection to `http://localhost:3000/login?callbackUrl=%2Fdashboard%2Fdocuments`.

---

### Scenario 3: Owner Login & Session Persistence (US2)
1. In the incognito window, navigate to `http://localhost:3000/login`.
2. Enter invalid credentials (`sarah@skynetdefense.com` / `WrongPassword999`).
3. Click **Sign In**.
4. **Expected Outcome**:
   - Generic alert appears: *"Invalid email or password"*.
5. Now enter the correct password (`SecurePass123!`).
6. Click **Sign In**.
7. **Expected Outcome**:
   - Successful authentication; redirects directly to `/dashboard`.
   - Refreshing the page keeps the owner logged in.

---

### Scenario 4: Secure Sign-Out (US2)
1. From the dashboard top-right header, click the user profile menu.
2. Click **Sign Out**.
3. **Expected Outcome**:
   - Better Auth session cookie is cleared.
   - Browser navigates to `http://localhost:3000/login`.
   - Pressing the browser "Back" button does NOT restore dashboard access; it redirects to `/login`.

---

### Scenario 5: Semantic Theming & Dark Mode Toggle (US4 / Principle VII)
1. In the dashboard header, click the **Theme Toggle** button.
2. Select **Dark**.
3. **Expected Outcome**:
   - Root `<html>` element adds class `dark`.
   - Background changes to dark neutral (`--background`), text changes to high-contrast white (`--foreground`), borders to `--border`.
   - Zero hard-coded color clashes or unreadable text.
4. Toggle back to **Light**.
5. **Expected Outcome**:
   - Instant smooth transition back to light mode.

---

### Scenario 6: Production Build & Type Integrity
Run the automated production build to verify zero compile or hydration errors:
```bash
cd frontend
npm run build
```
**Expected Outcome**: Build exits with code 0.
