# Feature Specification: Widget Customizer UI & Configuration Management

**Feature Branch**: `007-widget-customizer-ui`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Feature 007 (Widget Customizer UI)"

## Clarifications

### Session 2026-09-05
- Q: Which preset color swatches should be offered by default? → A: Curated 6-color palette (`#4F46E5` Indigo, `#2563EB` Blue, `#059669` Emerald, `#7C3AED` Violet, `#EA580C` Orange, `#0F172A` Slate Dark) + native HTML5 color picker + custom hex input.
- Q: Should the form provide a distinct radio toggle between 'Allow on all websites (*)' vs 'Restricted domains list'? → A: Dedicated toggle between "Allow on all websites (*)" and "Specific domains" with domain list input.
- Q: What should owners be able to do inside the preview box on /dashboard/widget? → A: Visual preview only: open/close the bubble to preview bot name, brand color, and welcome greeting without simulated test chatting.
- Q: Should the widget customizer form include a 'Reset to Defaults' action alongside Save? → A: Yes, include a "Reset to Defaults" button (with confirmation dialog) that resets inputs to standard platform defaults (`#4F46E5`, "Support Assistant", "Hi! How can I help you today?", `bottom-right`, `*`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customize Widget Branding & Appearance (Priority: P1)

As a business owner, I want to customize my customer-facing support widget's name, greeting message, brand accent color, placement, and allowed domains from my dashboard, so that the embedded assistant matches my website's identity and security requirements.

**Why this priority**: Without the ability to configure bot identity, store owners cannot deploy a professional, brand-aligned assistant to their storefront.

**Independent Test**: An owner navigates to `/dashboard/widget`, changes the bot display name from "Support Assistant" to "Mobeen Concierge", selects a brand color `#059669`, sets placement to `bottom-left`, and clicks Save. Reloading the page or querying the backend configuration confirms the new settings persist.

**Acceptance Scenarios**:

1. **Given** an authenticated owner on `/dashboard/widget`, **When** the page loads, **Then** the form fields are pre-populated with the organization's existing widget configuration (bot name, welcome greeting, primary color, placement, and allowed origins).
2. **Given** valid modifications (e.g., bot name, greeting, valid hex color `#4F46E5`, placement `bottom-right`), **When** the owner submits the form, **Then** changes are persisted, a success notification appears, and form state stays synchronized.
3. **Given** invalid input (e.g., empty bot name, invalid hex color `xyz`, or text exceeding 500 characters for welcome greeting), **When** the owner attempts to save, **Then** client-side validation errors are displayed immediately with helpful guidance and no backend request is dispatched.

---

### User Story 2 - Live Real-Time Interactive Widget Preview (Priority: P2)

As a business owner, I want to see a live visual preview of the chat widget directly next to the configuration form as I type, so that I can instantly verify how my bot looks and feels before deploying it to my live website.

**Why this priority**: A live preview provides immediate visual feedback, prevents trial-and-error deployments on production storefronts, and elevates the user experience to a premium standard.

**Independent Test**: While modifying the bot name, welcome greeting, or brand color in the form inputs, the interactive preview canvas dynamically updates its header text, greeting speech bubble, and launcher button color in real time without requiring a save action.

**Acceptance Scenarios**:

1. **Given** the owner is editing the primary color, **When** a new color or preset swatch is selected, **Then** the preview launcher button and header background update dynamically in real time.
2. **Given** the owner is editing the bot display name or welcome message, **When** text is typed into the input fields, **Then** the preview reflects the typed text with reactive fallback to sensible defaults if inputs are cleared.
3. **Given** the preview container, **When** the owner clicks the preview launcher bubble, **Then** the preview toggles between collapsed (bubble icon) and expanded (chat window) states to simulate the customer journey.

---

### User Story 3 - Embed Snippet Generation & Safe Key Rotation (Priority: P3)

As a business owner, I want to easily copy the HTML embed snippet and securely rotate my public widget key if needed, while benefiting from a 24-hour grace period so that my active website visitors experience zero downtime.

**Why this priority**: Secure deployment and key hygiene are vital for production websites. Owners need seamless copying and safe rotation without breaking live storefront chats.

**Independent Test**: The owner clicks "Copy Embed Code", pastes it into a clipboard viewer to verify the formatted `<script>` snippet containing their active key, and tests the "Rotate Key" flow, confirming a new key is issued while the previous key remains valid for 24 hours.

**Acceptance Scenarios**:

1. **Given** the Embed Snippet card, **When** the owner clicks "Copy Snippet", **Then** the full HTML `<script>` tag is copied to the clipboard and a "Copied!" feedback tooltip is displayed.
2. **Given** an active widget key, **When** the owner clicks "Rotate Key", **Then** a confirmation dialog opens warning that a new key will be generated while the old key remains supported for a 24-hour grace window.
3. **Given** confirmation in the rotation dialog, **When** rotation completes, **Then** the new key and updated snippet are displayed, and an active grace period banner shows the expiration timestamp of the previous key.

---

### Edge Cases

- **Invalid Hex Codes**: What happens when an owner enters a 3-character hex code (`#fff`), an 8-character hex code with alpha channel (`#4F46E5AA`), or an invalid string? The system strictly validates and normalizes 6-character hex strings (`^#([A-Fa-f0-9]{6})$`).
- **Domain Authorization Formatting**: What happens when an owner enters URLs with protocols (e.g. `https://example.com/`) instead of pure origins (`example.com, localhost:3000`)? The input parser automatically strips protocols, trailing slashes, and whitespace before saving.
- **Concurrent Session Rotation**: What happens if an owner opens two tabs and rotates the key twice within minutes? The backend atomically updates keys; each rotation resets the previous key to the one immediately prior and updates the grace window.
- **Network Failure During Save**: What happens if saving widget settings fails due to an intermittent network error? An error alert appears with the server message, and existing form inputs are preserved without data loss.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated route at `/dashboard/widget` protected by owner authentication.
- **FR-002**: System MUST expose a backend API endpoint (`PATCH /api/v1/organization/widget`) allowing authenticated owners to update their organization's widget configuration.
- **FR-003**: System MUST validate that `bot_display_name` is between 1 and 100 characters and `welcome_message` is between 1 and 500 characters.
- **FR-004**: System MUST validate that `primary_color` is a valid 6-character hexadecimal color code (e.g. `#4F46E5`).
- **FR-005**: System MUST allow owners to configure widget placement to either `bottom-right` or `bottom-left`.
- **FR-006**: System MUST allow owners to configure allowed domains using a distinct toggle between "Allow on all websites (*)" and "Specific domains" (revealing a domain list input that automatically strips protocols and slashes).
- **FR-007**: System MUST render an interactive visual preview component that dynamically reflects the owner's chosen name, greeting, placement, and primary color, with interactive toggle between collapsed floating bubble and open chat window.
- **FR-008**: System MUST provide a curated 6-color preset palette (`#4F46E5` Indigo, `#2563EB` Blue, `#059669` Emerald, `#7C3AED` Violet, `#EA580C` Orange, `#0F172A` Slate Dark) alongside a native HTML5 color picker and custom hex input.
- **FR-009**: System MUST display the live embed `<script>` code block with one-click clipboard copy functionality.
- **FR-010**: System MUST provide a key rotation modal that requires explicit confirmation and displays the 24-hour dual-key grace window status.
- **FR-011**: All frontend components MUST strictly adhere to semantic CSS tokens (`bg-card`, `text-foreground`, `border-border`, `text-primary`) without hard-coded color palette classes per Constitution Principle VII.
- **FR-012**: System MUST provide explicit Server Component boundaries, route loading skeletons (`loading.tsx`), and error boundaries (`error.tsx`).
- **FR-013**: System MUST provide a "Reset to Defaults" button (with confirmation dialog) allowing owners to restore all appearance fields to standard factory defaults.

### Key Entities *(include if feature involves data)*

- **WidgetConfiguration**: Represents the stored widget appearance and security settings for an Organization. Key attributes:
  - `id`: Unique identifier (UUID).
  - `organization_id`: Organization ownership reference.
  - `widget_key`: Active public key (`rd_live_*`).
  - `previous_widget_key`: Grace period key during rotation (`rd_live_*` or null).
  - `grace_expires_at`: Timestamp when the previous key permanently expires.
  - `primary_color`: Hex code representing the primary theme color.
  - `bot_display_name`: Display name of the assistant (e.g., "Support Assistant").
  - `welcome_message`: Greeting message shown when chat opens.
  - `widget_placement`: Position on screen (`bottom-right` or `bottom-left`).
  - `allowed_origins`: Allowed domain origins (e.g. `*` or `mystore.com, store.myshopify.com`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Owners can customize and save their complete widget branding in under 30 seconds.
- **SC-002**: Live preview updates instantly (< 50ms) as the owner types or changes colors with zero latency.
- **SC-003**: 100% of invalid inputs (empty names, invalid hex colors, malformed origins) are caught client-side before any network request is initiated.
- **SC-004**: Owners can copy the embed snippet with a single click and receive confirmation feedback within 100ms.
- **SC-005**: Key rotation maintains 100% visitor chat uptime via the 24-hour dual-key grace window.

## Assumptions

- Owners customize their widget from desktop or tablet displays, but the dashboard route remains fully responsive on mobile devices.
- The public embed script will be hosted at `https://resolvdesk.com/widget.js` (or relative `/widget.js` in development environments).
- Default widget placement defaults to `bottom-right` if unspecified.
- The organization's existing widget key is provisioned automatically upon tenant registration.
