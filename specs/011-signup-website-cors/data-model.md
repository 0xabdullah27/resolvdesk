# Data Model: Enforce Required Website URL on Signup & Restrict Widget CORS Origins

**Feature**: `011-signup-website-cors` | **Date**: 2026-09-06

---

## 1. Entity Changes & Schema Definitions

### Organization Entity (Modified)

*Table*: `organizations`

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `uuid4()` | Primary Key |
| `display_name` | `VARCHAR(200)` | No | - | Organization / business name |
| `website_url` | `VARCHAR(500)` | Yes (legacy) / Required on Signup | `None` | Primary website or store address |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Organization creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Last update timestamp |

**SQLModel Definition**:
```python
class OrganizationBase(SQLModel):
    display_name: str = Field(max_length=200, nullable=False)
    website_url: Optional[str] = Field(default=None, max_length=500, nullable=True)

class Organization(OrganizationBase, table=True):
    __tablename__ = "organizations"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True, nullable=False)
    created_at: datetime = Field(default_factory=utc_now, sa_type=sa.DateTime(timezone=True), nullable=False)
    updated_at: datetime = Field(default_factory=utc_now, sa_type=sa.DateTime(timezone=True), nullable=False)
```

---

### WidgetConfiguration Entity (Behavioral / Data State Change)

*Table*: `widget_configurations`

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `uuid4()` | Primary Key |
| `organization_id` | `UUID` | No | - | Foreign Key -> `organizations.id` (Indexed, Unique) |
| `widget_key` | `VARCHAR(64)` | No | - | Public key with `rd_live_` prefix (Unique, Indexed) |
| `primary_color` | `VARCHAR(32)` | No | `#4F46E5` | Hex brand color |
| `bot_display_name` | `VARCHAR(100)` | No | `Support Assistant` | Chat header title |
| `welcome_message` | `TEXT` | No | `Hi! How can I help you today?` | Initial greeting |
| `widget_placement` | `VARCHAR(20)` | No | `bottom-right` | Screen position |
| `allowed_origins` | `TEXT` | No | `f"{domain}, localhost"` *(previously "*")* | Whitelisted domains for cross-origin access |

---

## 2. Validation & Normalization Rules

1. **Website Address Submission**:
   - Must be between 1 and 500 characters.
   - Whitespace trimmed automatically.
   - Must conform to a valid web address format (`https://...`, `http://...`, or bare domain `example.com`).
2. **Domain Extraction**:
   - Leading `http://` or `https://` is prepended if absent during parse.
   - Hostname extracted: lowercased, path stripped, query parameters stripped.
3. **Provisioning State Transition**:
   - When a new account is registered:
     - `organizations.website_url = payload.website_url`
     - `widget_configurations.allowed_origins = f"{normalized_domain}, localhost"`
   - Result: Widget rejects requests from unapproved domains with `403 Forbidden`, while allowing merchant's domain and local development testing.
