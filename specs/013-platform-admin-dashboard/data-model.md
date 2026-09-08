# Phase 1 Data Model: Platform Admin & User Management Dashboard

**Feature Branch**: `013-platform-admin-dashboard`
**Created**: 2026-09-09
**Status**: Completed

## 1. Entities & Schema Changes

### 1.1 `Owner` (Modified Entity)
Represents a registered user on ResolvDesk. Extended with a `role` attribute to differentiate regular business owners from platform administrators.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `uuid.UUID` | Primary Key, Indexed | Unique identifier (matches Better Auth `user.id`) |
| `email` | `str` | Max 320, Unique, Indexed | User email address |
| `full_name` | `str` | Max 200, Not Null | User full name |
| `role` | `str` | Max 20, Not Null, Default: `"owner"` | Role enum (`"owner"`, `"superadmin"`) |
| `status` | `str` | Max 20, Not Null, Default: `"active"` | Status enum (`"active"`, `"suspended"`) |
| `organization_id` | `uuid.UUID` | Foreign Key (`organizations.id`), Indexed | Linked tenant organization |
| `created_at` | `datetime` | UTC, Indexed | Account creation timestamp |
| `updated_at` | `datetime` | UTC | Account last updated timestamp |

**Alembic Migration**:
- Add column `role` to `owners` table (`VARCHAR(20)`, nullable=False, server_default='owner').
- Add index on `owners.role`.

---

### 1.2 `AdminAuditLog` (New Entity)
Immutable audit trail capturing all administrative actions executed by platform super-admins.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `uuid.UUID` | Primary Key, Indexed | Unique audit record identifier |
| `admin_id` | `uuid.UUID` | Foreign Key (`owners.id`), Indexed | Admin who performed the action |
| `target_user_id` | `uuid.UUID` | Foreign Key (`owners.id`), Indexed | Target user affected |
| `action` | `str` | Max 50, Not Null, Indexed | Action type (`"suspend_user"`, `"reactivate_user"`) |
| `reason` | `Optional[str]` | Text, Nullable | Optional justification provided by admin |
| `created_at` | `datetime` | UTC, Default `now()`, Indexed | Event timestamp |

---

## 2. API Transfer Schemas (Pydantic / SQLModel)

### 2.1 `PlatformMetricsResponse`
Aggregated platform-wide summary counters:
```json
{
  "total_users": 142,
  "active_users": 139,
  "suspended_users": 3,
  "total_organizations": 135,
  "total_documents": 842,
  "total_conversations": 12890
}
```

### 2.2 `PlatformUserItem`
Single item in the paginated user directory:
```json
{
  "id": "b3e04771-5fa9-445a-bf98-0c2d1b821422",
  "email": "sarah@storefront.com",
  "full_name": "Sarah Jenkins",
  "role": "owner",
  "status": "active",
  "organization_id": "76974020-f5a6-444f-8360-15cbceaa0d3c",
  "organization_name": "Jenkins Apparel",
  "website_url": "https://jenkinsapparel.com",
  "created_at": "2026-08-14T10:15:30Z",
  "documents_count": 12,
  "conversations_count": 340,
  "tickets_count": 8
}
```

### 2.3 `PlatformUserListResponse`
Paginated directory response:
```json
{
  "items": [ /* PlatformUserItem */ ],
  "total": 142,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

### 2.4 `UserStatusUpdateRequest`
Payload for toggling account access:
```json
{
  "status": "suspended",
  "reason": "Suspected spam generation"
}
```

---

## 3. State Transitions & Lifecycle

### Account Status State Machine
```
   [ Registered ]
         │
         ▼
     ( ACTIVE ) ◄─────────────┐
         │                    │
         │ (Admin Suspend)    │ (Admin Reactivate)
         ▼                    │
    ( SUSPENDED ) ────────────┘
```

1. **Active -> Suspended**:
   - Updates `Owner.status = "suspended"`.
   - Purges active sessions in Better Auth `"session"` table.
   - Immediately blocks API requests via `get_current_owner`.
   - Widget `/config` returns `is_active = false`.
   - Logs entry in `admin_audit_logs`.
2. **Suspended -> Active**:
   - Updates `Owner.status = "active"`.
   - Restores login and API access.
   - Widget `/config` returns `is_active = true`.
   - Logs entry in `admin_audit_logs`.
