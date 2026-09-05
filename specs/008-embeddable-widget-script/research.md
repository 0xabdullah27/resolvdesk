# Research & Architecture Decisions: Embeddable Customer Chat Widget Script

**Feature**: Embeddable Customer Chat Widget Script (`public/widget.js`)  
**Branch**: `008-embeddable-widget-script`  
**Date**: 2026-09-05  

---

## 1. Research Overview & Objectives

The goal of this feature is to deliver a zero-dependency, ultra-lightweight (< 40 KB gzipped), drop-in chat widget script hosted at `frontend/public/widget.js`. The script must execute seamlessly when embedded on arbitrary third-party storefronts (Shopify, WooCommerce, Webflow, custom HTML) via:

```html
<script src="https://resolvdesk.com/widget.js" data-widget-key="rd_live_..." defer></script>
```

This research resolves the key technical decisions regarding DOM encapsulation, session persistence, streaming transport, mobile responsiveness, failure degradation, and escalation backend contracts.

---

## 2. Technical Decisions & Tradeoffs

### Decision 1: DOM & CSS Encapsulation (Shadow DOM vs. iframe)

- **Decision**: Native Shadow DOM (`attachShadow({ mode: "open" })`) attached to a host container `<div id="resolvdesk-widget-root"></div>`.
- **Rationale**:
  - **Zero Frame Overhead**: An `<iframe>` requires loading a separate HTML document, spawning a new browser browsing context, initializing separate JavaScript runtimes, and dealing with complex postMessage cross-origin communication for resizing.
  - **Complete Style Encapsulation**: Shadow DOM creates a strict CSS boundary preventing host page stylesheets (including CSS resets, universal `* { box-sizing: content-box }`, or aggressive `!important` tags) from bleeding into the widget UI.
  - **Dynamic Theming**: CSS custom properties (variables) like `--rd-primary: #059669` and `--rd-primary-contrast: #ffffff` penetrate the shadow boundary naturally, allowing instant branding customization based on merchant configuration.
  - **Bundle Footprint**: Shadow DOM requires zero extra network requests or iframe bundles, ensuring the script remains well under 40 KB gzipped.
- **Alternatives Evaluated**:
  - *Full iframe embed*: Guarantees style isolation, but introduces latency, iframe rendering jank, mobile keyboard viewport resizing issues, and complex postMessage window resizing handshakes.
  - *BEM prefixed classes in light DOM*: Highly vulnerable to aggressive global CSS resets on merchant themes (e.g. Tailwind reset or Bootstrap).

---

### Decision 2: Conversation Session Persistence & Storage Strategy

- **Decision**: `localStorage` with a 24-hour sliding expiration window, keyed by merchant widget key (`resolvdesk_session_${widgetKey}`).
- **Rationale**:
  - **Multi-Page & Multi-Tab Shopper Continuity**: Traditional ecommerce stores trigger full page reloads upon clicking products, categories, or navigating pagination. `sessionStorage` is lost when opening links in new tabs. `localStorage` preserves the shopper's active chat session seamlessly across browsing journeys.
  - **Sliding 24-Hour Expiration**: To uphold data privacy and prevent stale sessions from lingering indefinitely on shared computers, the widget timestamps every interaction (`last_active`). On initialization, if `Date.now() - last_active > 24 * 60 * 60 * 1000`, the stale session is discarded and a clean welcome state is initialized.
  - **Zero Server Session Cookie Dependencies**: Keeps the public widget stateless and CORS-friendly without requiring third-party cookies (which modern browsers block by default under ITP/Privacy Sandbox).
- **Alternatives Evaluated**:
  - *`sessionStorage`*: Breaks conversation continuity when shoppers open links in new tabs or navigate across subdomains.
  - *Third-party cookies*: Blocked by default in Safari, Chrome, and Firefox; completely non-viable for embeddable widgets.

---

### Decision 3: Streaming Communication Transport (SSE over Fetch vs. WebSockets)

- **Decision**: Server-Sent Events (SSE) via native `fetch()` and `ReadableStreamDefaultReader` / `TextDecoder`.
- **Rationale**:
  - **Alignment with ResolvDesk Backend**: `backend/app/routers/widget.py` already exposes `POST /api/v1/widget/chat` delivering `text/event-stream` responses.
  - **Lightweight & HTTP/2-Native**: Native `fetch` with streaming response body requires zero external libraries (unlike WebSocket client packages or Socket.io), operates seamlessly through corporate firewalls and standard HTTP CDNs, and reuses existing HTTP connection pooling.
  - **Structured Protocol**: Emits standard event streams (`event: start`, `event: token`, `event: citation`, `event: escalate_suggestion`, `event: done`, `event: error`).
- **Alternatives Evaluated**:
  - *WebSockets (`wss://`)*: Requires maintaining persistent stateful TCP connections, dedicated WebSocket gateways, and complex reconnection backoff logic.
  - *Polling / Long-Polling*: Unacceptable latency and server load; violates the sub-2-second time-to-first-token requirement.

---

### Decision 4: Storefront Failure Mode & Resilience

- **Decision**: Silent graceful failure with non-intrusive console diagnostic.
- **Rationale**:
  - A third-party script embedded on an ecommerce storefront must follow the strict "Do No Harm" rule. If ResolvDesk's API is unreachable, times out, or the merchant's subscription is suspended, the script must fail silently without mounting empty launcher boxes, broken image icons, or raising uncaught JS exceptions that could break the merchant's checkout or product pages.
  - Emits a discreet debug warning: `console.warn("[ResolvDesk] Widget initialization paused: " + error.message)`.
- **Alternatives Evaluated**:
  - *Error placeholder bubble*: Degrades merchant store aesthetic and alarms shoppers unnecessarily.
  - *Continuous polling retry*: Creates stampeding herds and wastes visitor device battery.

---

### Decision 5: Visitor Escalation API Contract

- **Decision**: Dedicated endpoint `POST /api/v1/widget/chat/escalate` paired with `Conversation.is_escalated`.
- **Rationale**:
  - Adheres strictly to Constitution Principle V (Layered Architecture: router -> service -> repo) and Principle III (Continuous Human Safety Net).
  - Validates widget key, domain origin, and message length.
  - Updates `Conversation.is_escalated = True` and appends an escalation message to the conversation history.
  - Returns a clean ticket confirmation reference: `{"ticket_id": "TK-...", "conversation_id": "...", "visitor_email": "...", "status": "submitted"}`.
- **Alternatives Evaluated**:
  - *Reusing `/api/v1/tickets` owner endpoint*: Violates tenant boundary defenses; owner endpoints require session cookies/JWTs, whereas visitors are anonymous and authenticated only via public widget key + domain origin.

---

### Decision 6: Mobile Viewport Experience (< 640px)

- **Decision**: Fixed full-screen overlay with sticky header bar and accessible touch targets.
- **Rationale**:
  - On mobile viewports (< 640px), floating corner popups cause layout overflow, horizontal scrolling, and touch occlusion when mobile virtual keyboards pop up.
  - When expanded on mobile, CSS applies:
    ```css
    @media (max-width: 640px) {
      .rd-chat-window {
        position: fixed;
        inset: 0;
        width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        border-radius: 0 !important;
      }
    }
    ```
  - Includes a sticky top bar with assistant name, active status dot, and a prominent 44x44px touch-friendly close button (`×`).
- **Alternatives Evaluated**:
  - *Floating bottom sheet*: On smaller smartphones (e.g. iPhone SE), virtual keyboards obscure the input box entirely.

---

## 3. Summary of Resolved Clarifications

| Topic | Selected Strategy | Rationale |
|---|---|---|
| **DOM Isolation** | Native Shadow DOM | Zero iframe overhead, complete style encapsulation, dynamic CSS vars. |
| **Session Persistence** | `localStorage` (24h sliding) | Multi-tab/page continuity for ecommerce shoppers; privacy-preserving expiration. |
| **Mobile Experience** | Full-screen view (< 640px) | Optimal touch typing and virtual keyboard compatibility. |
| **Escalation Mode** | Reactive inline prompt | Header remains clean; prompt triggers when AI has low confidence or user asks. |
| **Storefront Failure** | Silent graceful degradation | Zero disruption to merchant store UX during outages. |
| **Post-Escalation State**| Interactive card + active input | Ticket reference displayed; user can still ask follow-up questions. |
