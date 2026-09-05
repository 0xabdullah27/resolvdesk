# Interface Contracts: Frontend Authentication & Dashboard Shell

**Feature**: `005-frontend-auth-dashboard`  
**Date**: 2026-09-05  
**Spec**: [spec.md](../spec.md)

---

## 1. Route Map & Access Control Contracts

| Route | Access Level | Component Type | Redirection Rules |
|---|---|---|---|
| `/` | Public | Server Component | If authenticated $\rightarrow$ redirect `/dashboard` |
| `/login` | Public (Guests Only) | Server Component (with Client Form) | If authenticated $\rightarrow$ redirect `/dashboard` |
| `/register` | Public (Guests Only) | Server Component (with Client Form) | If authenticated $\rightarrow$ redirect `/dashboard` |
| `/dashboard` | Protected (Owner Only) | Server Component | If unauthenticated $\rightarrow$ redirect `/login?callbackUrl=/dashboard` |
| `/dashboard/documents` | Protected (Owner Only) | Server Component | If unauthenticated $\rightarrow$ redirect `/login?callbackUrl=...` |
| `/dashboard/conversations` | Protected (Owner Only) | Server Component | If unauthenticated $\rightarrow$ redirect `/login?callbackUrl=...` |
| `/dashboard/widget` | Protected (Owner Only) | Server Component | If unauthenticated $\rightarrow$ redirect `/login?callbackUrl=...` |

---

## 2. API Contract: Atomic Registration Handshake

### Endpoint: `POST /api/v1/registration/complete`
Called immediately after Better Auth issues credentials to provision PostgreSQL workspace rows in a single atomic transaction.

#### Request Body
```json
{
  "owner_name": "Alice Johnson",
  "email": "alice@watchstore.com",
  "password": "Password123!",
  "business_name": "Chronos Watch Co.",
  "website_url": "https://chronoswatches.com"
}
```

#### Success Response (`HTTP 201 Created`)
```json
{
  "owner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "organization_id": "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
  "organization_name": "Chronos Watch Co.",
  "email": "alice@watchstore.com",
  "message": "Registration complete and workspace provisioned."
}
```

#### Error Response (`HTTP 409 Conflict`)
```json
{
  "detail": "An account with this email already exists."
}
```

---

## 3. API Contract: Current Owner Context Resolution

### Endpoint: `GET /api/v1/me`
Resolves the active owner identity and links to their tenant organization.

#### Request Headers
```http
Authorization: Bearer <RS256_JWT_TOKEN>
```

#### Success Response (`HTTP 200 OK`)
```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "email": "alice@watchstore.com",
  "name": "Alice Johnson",
  "status": "active",
  "organization_id": "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
  "organization_name": "Chronos Watch Co.",
  "created_at": "2026-09-05T04:00:00Z"
}
```

#### Error Response (`HTTP 401 Unauthorized`)
```json
{
  "detail": "Invalid or expired authorization token."
}
```

---

## 4. Server Action Contracts (`frontend/actions/auth-actions.ts`)

### 1. `registerOwnerAction(values: RegisterFormValues)`
- **Input**: Validated `RegisterFormValues` (fullName, email, password, businessName, websiteUrl).
- **Execution**:
  1. Calls Better Auth `auth.api.signUpEmail` on Next.js server.
  2. Acquires signed RS256 token via `auth.api.getToken`.
  3. Executes server-to-server call to FastAPI `POST /api/v1/registration/complete`.
  4. Calls `revalidatePath("/dashboard")`.
- **Return**: `{ success: true }` or `{ success: false, error: string }`.

### 2. `loginOwnerAction(values: LoginFormValues)`
- **Input**: Validated `LoginFormValues` (email, password).
- **Execution**:
  1. Calls Better Auth `auth.api.signInEmail` on Next.js server.
  2. Sets httpOnly session cookie.
  3. Calls `revalidatePath("/dashboard")`.
- **Return**: `{ success: true }` or `{ success: false, error: string }`.

### 3. `signOutOwnerAction()`
- **Input**: None.
- **Execution**: Calls `auth.api.signOut` and clears session cookie.
- **Return**: `{ success: true }`.

---

## 5. UI Shell Component Contracts

### 1. `DashboardSidebar` (`frontend/components/dashboard/sidebar.tsx`)
- **Props**:
  - `organizationName`: `string`
  - `currentPath`: `string`
  - `navItems`: `NavItem[]`
- **Output**: Collapsible sidebar with brand logo, organization badge, and active route highlights using semantic tokens (`bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`).

### 2. `DashboardHeader` (`frontend/components/dashboard/header.tsx`)
- **Props**:
  - `ownerName`: `string`
  - `ownerEmail`: `string`
  - `onSignOut`: `() => Promise<void>`
- **Output**: App bar with sidebar toggle trigger, dynamic route breadcrumb, theme toggle button, and user dropdown menu.

### 3. `ThemeToggle` (`frontend/components/theme-toggle.tsx`)
- **Props**: None
- **Output**: Dropdown or toggle button switching between `Light`, `Dark`, and `System` modes via `next-themes`.
