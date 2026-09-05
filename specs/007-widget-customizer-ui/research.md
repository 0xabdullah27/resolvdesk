# Research & Technical Decisions: Feature 007 (Widget Customizer UI)

**Feature**: `007-widget-customizer-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Context & Scope

Feature 007 equips store owners with a dedicated, brand-aligned widget customizer at `/dashboard/widget`. Owners can configure bot identity (name, welcome greeting, brand color, placement, and authorized domains), preview changes in real time through an interactive simulation component, copy their production embed snippet, and securely rotate public keys with a 24-hour dual-key grace window.

---

## 2. Research Decisions & Technical Tradeoffs

### Decision 1: Backend Update API Endpoint & Layering
- **Decision**: Introduce `PATCH /api/v1/organization/widget` in `app/routers/organizations.py` adhering to the 3-layer architecture (router -> service -> repo).
- **Rationale**:
  - Router handles HTTP auth via `CurrentOwner` dependency.
  - Service (`WidgetService.update_config`) enforces domain validation and business rules.
  - Repository (`WidgetRepo.update_config`) executes atomic SQLModel updates filtered strictly by `WHERE organization_id = :org_id` per Constitution Principle I & V.
- **Alternatives Considered**:
  - `PUT /api/v1/organization/widget`: Rejected because partial updates (e.g., changing only color or only bot name) are cleaner with `PATCH`.
  - Storing config in client cookies or local storage: Rejected; multi-tenant configuration must be canonical in PostgreSQL.

---

### Decision 2: Form Management & Instant Live Preview Reactivity
- **Decision**: Use `react-hook-form` paired with `@hookform/resolvers/zod` and `watch()` subscription for instantaneous (< 50ms) preview updates.
- **Rationale**:
  - `watch()` enables the adjacent `<WidgetLivePreview />` component to react immediately to keystrokes and color changes without triggering full form re-renders or page state flickers.
  - Zod schema (`widgetConfigSchema`) validates hex codes (`^#([A-Fa-f0-9]{6})$`), text lengths (name: 1–100 chars, greeting: 1–500 chars), and origin strings client-side before dispatching Server Actions.
- **Alternatives Considered**:
  - Uncontrolled inputs with debounce: Adds perceptible lag (> 300ms) to the visual preview, degrading the responsive feel.
  - Controlled inputs with separate React `useState` hooks for each field: More boilerplate; lacks unified schema validation.

---

### Decision 3: Visual-Only Preview Canvas Architecture
- **Decision**: Build `<WidgetLivePreview />` as a purely client-side interactive visual sandbox that mimics the chat widget container without connecting to the backend SSE chat stream.
- **Rationale**:
  - Satisfies user clarification (Option A: Visual simulation only).
  - Toggles between the floating launcher bubble (bottom-right/bottom-left) and an expanded mock window showing the customized header with bot name, dynamic brand background color, and greeting speech bubble.
  - Generates zero artificial backend load, zero vector search costs, and zero rate-limiting consumption on the dashboard.
- **Alternatives Considered**:
  - Live iframe loading the actual `widget.js`: High complexity, requires cross-origin iframe messaging and backend session creation just to view appearance changes.

---

### Decision 4: Allowed Domains Parsing & Formatting UX
- **Decision**: Provide a distinct radio toggle between "Allow on all websites (`*`)" and "Specific domains". When "Specific domains" is active, a textarea accepts comma- or newline-separated domains.
- **Rationale**:
  - Satisfies user clarification (Option A: Distinct toggle).
  - Client-side parser strips protocols (`http://`, `https://`), trailing slashes (`/`), and leading/trailing whitespace automatically before saving.
  - Prevents common user errors (e.g. entering `https://myshop.com/` which fails hostname origin matching).
- **Alternatives Considered**:
  - Single raw text input: Error-prone for non-technical owners who might accidentally delete `*` or paste malformed URLs.

---

### Decision 5: Brand Color Selection & Semantic Theming (Constitution Principle VII)
- **Decision**: Combine a 6-color curated preset palette (`#4F46E5`, `#2563EB`, `#059669`, `#7C3AED`, `#EA580C`, `#0F172A`) with a native HTML5 `<input type="color">` and an uppercase hex text input.
- **Rationale**:
  - Satisfies user clarification (Option A: Curated 6-color presets).
  - Dashboard container, cards, inputs, and buttons consume 100% semantic design tokens (`bg-card`, `text-foreground`, `border-border`, `bg-primary`).
  - The custom brand color selected by the owner is applied strictly to the widget preview elements via inline style / CSS variable (`style={{ backgroundColor: primaryColor }}`) as customer branding data, never violating the dashboard application's semantic theming.
- **Alternatives Considered**:
  - Heavy third-party color picker libraries (e.g., `react-color`): Increases bundle size by ~40 KB for functionality native browser `<input type="color">` handles natively.

---

### Decision 6: Key Rotation & 24-Hour Grace Period Visibility
- **Decision**: Use an `AlertDialog` confirmation modal before calling `rotateWidgetKeyAction()`. Upon success, show the new key, update the embed `<script>` tag immediately, and display an active grace banner with expiration countdown.
- **Rationale**:
  - Key rotation is a sensitive operation; explicit modal confirmation prevents accidental clicks.
  - The 24-hour grace window (already built into the backend `WidgetRepo.get_by_public_key`) ensures live storefronts do not break while owners update their website `<script>` tags.
- **Alternatives Considered**:
  - Instant one-click rotation with no confirmation: Dangerous; high risk of storefront downtime if an owner misclicks.

---

### Decision 7: Factory "Reset to Defaults" Action
- **Decision**: Include a secondary button "Reset to Defaults" that triggers a confirmation dialog and resets all form inputs to platform defaults (`#4F46E5`, "Support Assistant", "Hi! How can I help you today?", `bottom-right`, `*`).
- **Rationale**:
  - Satisfies user clarification (FR-013).
  - Gives owners a quick, risk-free way to restore the standard baseline configuration.
