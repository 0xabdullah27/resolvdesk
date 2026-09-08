# Phase 0 Research: Platform Admin & User Management Dashboard

**Feature Branch**: `013-platform-admin-dashboard`
**Created**: 2026-09-09
**Status**: Completed

## 1. Administrative Authorization & Role Architecture

### Decision
Add a `role` field to the `Owner` model (`role: str = Field(default="owner", max_length=20, nullable=False)`) with enum values `OwnerRole.OWNER = "owner"` and `OwnerRole.SUPERADMIN = "superadmin"`.
Configure an environment variable `PLATFORM_OWNER_EMAIL` (e.g., `creator@resolvdesk.com`). During database initialization or application startup, if an owner with this email exists, ensure their role is set to `superadmin`. Provide a FastAPI dependency `get_current_superadmin` that verifies `owner.role == OwnerRole.SUPERADMIN.value`, raising `HTTPException(status_code=403, detail="Administrative privileges required.")` for unauthorized users.

### Rationale
- Leverages the existing Better Auth JWKS stateless authentication pipeline and `get_current_owner` dependency.
- Avoids dual authentication systems (e.g., separate admin table or separate auth provider) while maintaining strict role-based access control.
- Allows seamless switching between personal tenant workspace and platform admin portal for the platform creator.

### Alternatives Considered
- **Separate `super_admins` database table**: Increases schema complexity, requires separate JWT issuance and login endpoints, and complicates session management.
- **Hard-coded email checks in routers**: Brittle, untracked, and violates separation of concerns between authentication and business logic.

---

## 2. Account Suspension Lifecycle & Token Drain Protection

### Decision
When an account is suspended by the platform administrator:
1. `Owner.status` is updated to `"suspended"`.
2. Existing active sessions in Better Auth's `"session"` table are revoked (`DELETE FROM "session" WHERE "userId" = :user_id`).
3. Subsequent backend requests by the user will be blocked with `403 Forbidden` via `get_current_owner` (which already verifies `owner.status == OwnerStatus.ACTIVE.value`).
4. Next.js edge middleware prevents access to `/dashboard` for suspended users.
5. **Widget Suspension Hook**:
   - `GET /api/v1/widget/config?key=...` returns `is_active: false` when the organization owner is suspended.
   - The embeddable widget (`widget.js`) checks `config.is_active`. If `false`, it displays a polite notice (`"Support is temporarily offline"`) and disables the message input and submit button.
   - The chat streaming endpoint (`POST /api/v1/widget/chat`) checks owner/organization status in `validate_widget_access` and terminates attempts with `403 Forbidden` if suspended, preventing LLM token consumption.

### Rationale
- Completely fulfills User Scenario 3 and user clarification Q2.
- Protects the platform creator from AI token drain caused by rogue or unpaid high-volume deployments.
- Ensures a polite and professional degradation on merchant storefronts without breaking the host page.

### Alternatives Considered
- **Complete widget silent failure (no-op)**: Merchants or their visitors might assume the widget crashed or had a technical glitch rather than understanding support is offline.
- **Immediate account deletion**: Destructive and unrecoverable; suspension allows investigation, dispute resolution, or reactivation.

---

## 3. Data Confidentiality & Tenant Isolation Boundary

### Decision
The administrative API exposes only aggregated workspace health metrics and metadata:
- Account details: User ID, Name, Email, Status, Role, Created Date.
- Organization details: Org ID, Display Name, Website URL.
- Workspace counters: Total uploaded documents, total visitor chat conversations, total support tickets.
Visitor chat messages, private customer transcripts, and LLM prompt internals are strictly excluded from all platform admin responses.

### Rationale
- Satisfies Constitution Principle I (Multi-Tenant Isolation) and user clarification Q3.
- Guarantees that end-customer privacy on tenant storefronts is honored while providing the platform creator with the operational metrics necessary to monitor platform growth, usage volume, and system health.

### Alternatives Considered
- **Full transcript inspection by superadmin**: Violates privacy commitments made to business owners and their visitors.

---

## 4. Frontend Architecture & Design Token Compliance

### Decision
Create a dedicated route group `frontend/app/admin/` with:
- `layout.tsx`: Server component enforcing super-admin authorization, rendering the platform admin header, navigation links, and theme toggle.
- `page.tsx`: Server-first dashboard rendering KPI metric cards and streaming the interactive client directory.
- `loading.tsx` and `error.tsx`: Providing instant skeleton transitions and error boundaries per Constitution standards.
- Component structure:
  - `components/admin/metrics-overview.tsx`: Grid of KPI cards.
  - `components/admin/user-directory-table.tsx`: Filterable, searchable, paginated table.
  - `components/admin/suspend-user-modal.tsx`: Accessible dialog with confirmation to suspend/reactivate.
  - `components/admin/workspace-metrics-modal.tsx`: Detailed read-only workspace resource counters.
- **Styling**: Strictly utilize semantic design tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-muted`, etc.) to guarantee zero hardcoded color utilities and full dark/light theme support per Constitution Principle VII.

### Rationale
- Complies with Next.js App Router best practices and ResolvDesk's global development standards.
- Keeps client-side bundle lean by fetching data server-side and using interactive client islands only where necessary.
