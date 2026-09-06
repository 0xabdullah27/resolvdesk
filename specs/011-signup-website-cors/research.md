# Research & Technical Decisions: Enforce Required Website URL on Signup & Restrict Widget CORS Origins

**Feature**: `011-signup-website-cors` | **Date**: 2026-09-06

---

## 1. Domain & URL Normalization

### Decision
Both frontend (TypeScript/Zod) and backend (Python/Pydantic) will accept either full URLs (e.g. `https://my-store.com/shop`) or bare domains (e.g. `my-store.com`). The backend will normalize the input to a clean, lowercase hostname for widget origin configuration.

### Implementation Details
- **Normalization Algorithm**:
  ```python
  from urllib.parse import urlparse

  def extract_domain(raw_url: str) -> str:
      cleaned = raw_url.strip()
      if not cleaned.startswith(("http://", "https://")):
          cleaned = "https://" + cleaned
      parsed = urlparse(cleaned)
      hostname = (parsed.hostname or "").lower()
      # Strip port if standard or extract clean domain
      return hostname
  ```
- **Allowed Origins String**:
  If the extracted domain is `my-store.myshopify.com`, the widget's initial `allowed_origins` string will be:
  `f"{hostname}, localhost"`
  This satisfies the requirement that live storefront visits match the domain, while developers/merchants previewing the embed locally (`localhost`) are not blocked.

### Alternatives Considered
- **Strict URL-only requirement (`https://...` only)**: Rejected during clarification because business owners frequently type `store.com` or `shop.myshopify.com`, and rejecting it introduces form friction.
- **Auto-including wildcard subdomains (`*.domain.com`)**: Considered, but rejected for initial setup to maintain tight tenant isolation. Merchants with multiple subdomains can easily add `*.domain.com` in the Widget Customizer.

---

## 2. Database Schema & Migration for Organization Website

### Decision
Add a `website_url` column to the `organizations` table (`VARCHAR(500)`, nullable for existing legacy rows, required on new signups).

### Implementation Details
- **SQLModel Entity**:
  Update [`backend/app/models/organization.py`](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/models/organization.py):
  ```python
  class OrganizationBase(SQLModel):
      display_name: str = Field(max_length=200, nullable=False)
      website_url: Optional[str] = Field(default=None, max_length=500, nullable=True)
  ```
- **Alembic Migration**:
  Create `backend/alembic/versions/006_add_website_url_to_organizations.py`:
  - `op.add_column("organizations", sa.Column("website_url", sa.String(length=500), nullable=True))`
  - Safe, non-locking migration on PostgreSQL.
- **Repository Layer**:
  Update `OrganizationRepo.create_organization` to accept and persist `website_url: Optional[str] = None`.

### Alternatives Considered
- **Storing website only in WidgetConfiguration (`allowed_origins`)**: Rejected during clarification. The merchant's website is a first-class business attribute that belongs to the Organization workspace.

---

## 3. Frontend Registration UX & Validation

### Decision
Update [`frontend/lib/validations/auth.ts`](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/lib/validations/auth.ts) and [`frontend/components/auth/register-form.tsx`](file:///d:/AbdullahQureshi/workspace/resolvdesk/frontend/components/auth/register-form.tsx) to make Website URL a required field with friendly validation and clear contextual guidance.

### Implementation Details
- **Zod Schema**:
  ```typescript
  websiteUrl: z
    .string()
    .min(1, "Store or website URL is required")
    .max(500, "Website URL must be under 500 characters")
    .refine(
      (val) => {
        // Accepts full URLs with protocol or bare hostnames
        const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
        return pattern.test(val.trim());
      },
      { message: "Please enter a valid store address (e.g. yourstore.com or https://yourstore.com)" }
    )
  ```
- **Form UI**:
  Remove "Optional" label, replace with an informative helper:
  *"Your store or website address. ResolvDesk locks your chat widget to this domain."*

---

## 4. Architectural Boundary & Transaction Defense

### Decision
Adhere strictly to Constitution Principle V (Layered Architecture) and Constitution Principle I (Multi-Tenant Isolation):
- **Router Layer** ([`backend/app/routers/auth.py`](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/routers/auth.py)): Validates incoming request using `RegistrationCompleteRequest(website_url=...)`. No database operations in router.
- **Service Layer** ([`backend/app/services/registration_service.py`](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/services/registration_service.py)): Normalizes domain, orchestrates multi-table transaction (`organizations`, `owners`, `widget_configurations`), and rollback on failure.
- **Repo Layer** ([`backend/app/repos/organization_repo.py`](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/repos/organization_repo.py), [`backend/app/repos/widget_repo.py`](file:///d:/AbdullahQureshi/workspace/resolvdesk/backend/app/repos/widget_repo.py)): Pure SQLModel queries and session flushes.
