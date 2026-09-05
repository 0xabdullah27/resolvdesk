# API & UI Contracts: Feature 007 (Widget Customizer UI)

**Feature**: `007-widget-customizer-ui`  
**Date**: 2026-09-05  
**Spec**: [spec.md](../spec.md)

---

## 1. REST Endpoints (FastAPI)

### 1.1 Update Widget Configuration
- **Method / Path**: `PATCH /api/v1/organization/widget`
- **Auth**: Authenticated Owner (Bearer JWT in `Authorization` header)
- **Status Codes**:
  - `200 OK`: Configuration updated successfully.
  - `400 Bad Request`: Validation failure (e.g. malformed hex code, invalid placement).
  - `401 Unauthorized`: Missing or invalid bearer token.
  - `404 Not Found`: Organization widget configuration not found.

#### Request Body (`application/json`)
```json
{
  "bot_display_name": "Mobeen Assistant",
  "welcome_message": "Welcome! Ask me anything about our products.",
  "primary_color": "#059669",
  "widget_placement": "bottom-left",
  "allowed_origins": "mystore.com, staging.mystore.com"
}
```

#### Response Body (`200 OK`)
```json
{
  "widget_key": "rd_live_1234567890abcdef1234567890abcdef",
  "primary_color": "#059669",
  "bot_display_name": "Mobeen Assistant",
  "welcome_message": "Welcome! Ask me anything about our products.",
  "widget_placement": "bottom-left",
  "allowed_origins": "mystore.com, staging.mystore.com",
  "has_grace_key": false,
  "embed_snippet": "<script src=\"https://resolvdesk.com/widget.js\" data-widget-key=\"rd_live_1234567890abcdef1234567890abcdef\" defer></script>"
}
```

---

### 1.2 Rotate Widget Key (Existing)
- **Method / Path**: `POST /api/v1/organization/widget/rotate-key`
- **Auth**: Authenticated Owner (Bearer JWT)
- **Status Codes**:
  - `200 OK`: Key rotated and 24-hour grace period started.
  - `401 Unauthorized`: Missing or invalid bearer token.

#### Response Body (`200 OK`)
```json
{
  "new_widget_key": "rd_live_9876543210fedcba9876543210fedcba",
  "previous_widget_key": "rd_live_1234567890abcdef1234567890abcdef",
  "grace_expires_at": "2026-09-06T11:00:00Z",
  "embed_snippet": "<script src=\"https://resolvdesk.com/widget.js\" data-widget-key=\"rd_live_9876543210fedcba9876543210fedcba\" defer></script>"
}
```

---

### 1.3 Get Organization Profile & Widget Config (Existing)
- **Method / Path**: `GET /api/v1/organization/profile`
- **Auth**: Authenticated Owner (Bearer JWT)
- **Status Codes**: `200 OK`, `401 Unauthorized`.

---

## 2. Frontend Server Actions (`frontend/actions/widget-actions.ts`)

```typescript
export async function getWidgetConfigAction(): Promise<{
  success: boolean;
  data?: WidgetConfig;
  error?: string;
}>;

export async function updateWidgetConfigAction(
  payload: WidgetUpdatePayload
): Promise<{
  success: boolean;
  data?: WidgetConfig;
  error?: string;
}>;

export async function rotateWidgetKeyAction(): Promise<{
  success: boolean;
  data?: {
    new_widget_key: string;
    previous_widget_key: string;
    grace_expires_at: string;
    embed_snippet: string;
  };
  error?: string;
}>;
```

---

## 3. UI Component Contract (`frontend/components/widget/`)

| Component | Props | Responsibility |
|---|---|---|
| `<WidgetCustomizerView />` | `initialConfig: WidgetConfig` | Client container managing form state, tabbed/split layout, and action dispatch. |
| `<WidgetAppearanceForm />` | `form: UseFormReturn<WidgetFormValues>`, `onSave: () => void`, `onReset: () => void`, `isSaving: boolean` | Form inputs for bot name, greeting, placement, and color picker with preset swatches. |
| `<WidgetDomainsCard />` | `form: UseFormReturn<WidgetFormValues>` | Radio toggle between "All domains (*)" and "Specific domains" with domain list textarea. |
| `<WidgetLivePreview />` | `botName: string`, `greeting: string`, `primaryColor: string`, `placement: WidgetPlacement` | Visual interactive canvas showing floating bubble and open mock chat window. |
| `<WidgetEmbedCard />` | `widgetKey: string`, `embedSnippet: string`, `hasGraceKey: boolean`, `graceExpiresAt?: string \| null`, `onRotate: () => void` | Code snippet with one-click copy, current key display, and key rotation trigger. |
| `<WidgetRotateDialog />` | `isOpen: boolean`, `onClose: () => void`, `onConfirm: () => Promise<void>`, `isRotating: boolean` | Confirmation dialog detailing the 24-hour grace period before rotating. |
| `<WidgetResetDialog />` | `isOpen: boolean`, `onClose: () => void`, `onConfirm: () => void` | Confirmation dialog before resetting fields to platform defaults. |
