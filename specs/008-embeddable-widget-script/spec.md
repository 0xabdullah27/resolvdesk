# Feature Specification: Embeddable Customer Chat Widget Script

**Feature Branch**: `008-embeddable-widget-script`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "Feature 009 – Embeddable Customer Chat Widget Script (public/widget.js)"

---

## 1. Overview & Business Value

Online merchants embedding ResolvDesk need a lightweight, secure, and drop-in chat widget script on their public storefronts (Shopify, WooCommerce, Webflow, custom websites). 

The widget must automatically adapt to the merchant's customized branding (display name, welcome greeting, brand accent color, and screen placement), stream instant grounded AI responses directly to visitors, protect against unauthorized domain scraping, and provide a continuous safety net with human support escalation when an answer cannot be determined.

---

## Clarifications

### Session 2026-09-05

- Q: How should visitors be able to initiate human escalation within the chat widget? (FR-011) → A: Reactive only: Escalation prompts appear inline within the chat stream when the AI fails to find an answer, detects low confidence, or when the visitor explicitly asks for human assistance (no persistent header escalation button).
- Q: How should the widget behave on the host storefront if the configuration request fails or times out? (FR-003) → A: Fail silently: Keep the widget completely hidden and log a discreet diagnostic console warning, preventing broken visual artifacts or errors on the merchant store.
- Q: Once a visitor submits an escalation ticket, what should the conversation state become in the widget? (FR-011) → A: Interactive with confirmation card: Display an inline confirmation card with the ticket reference number in the chat feed, keeping the message input open and active for subsequent visitor questions.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor Floating Launcher & Customized Greeting (Priority: P1) 🎯 MVP

As an online shopper visiting a merchant's store,  
I want to see a branded floating chat launcher in the corner of the website that opens an assistant greeting when clicked,  
So that I can quickly seek customer support without disrupting my browsing experience.

**Why this priority**: Without the launcher and chat container rendering reliably on arbitrary third-party websites, no communication can occur. This forms the essential customer-facing deliverable.

**Independent Test**: Embed the snippet `<script src=".../widget.js" data-widget-key="rd_live_..."></script>` on a test HTML page. The widget loads the merchant's custom accent color, bot name, and welcome greeting, and allows toggling open/closed.

**Acceptance Scenarios**:
1. **Given** a merchant has configured brand color `#059669`, bot name `"Velvet Concierge"`, and placement `"bottom-right"`,  
   **When** a visitor loads the merchant's store page,  
   **Then** a circular floating chat launcher appears in the bottom-right corner styled with `#059669`.
2. **Given** the chat launcher is visible,  
   **When** the visitor clicks or taps the bubble,  
   **Then** the chat window opens with a smooth animation, displaying the title `"Velvet Concierge"` and the merchant's welcome greeting bubble.
3. **Given** the chat window is open,  
   **When** the visitor clicks the close button (or taps the bubble again),  
   **Then** the chat window collapses and returns to the floating launcher bubble.
4. **Given** the widget key is embedded on an unauthorized domain not included in the merchant's allowed list,  
   **When** the script executes,  
   **Then** the widget rejects initialization and does not display on the unauthorized site.

---

### User Story 2 - Real-Time AI Streaming & Knowledge Base Citations (Priority: P2)

As an online shopper,  
I want to ask product, shipping, or policy questions and receive instant, word-by-word streaming answers with verifiable source citations,  
So that I get immediate, accurate answers while knowing where the information came from.

**Why this priority**: Real-time streaming satisfies the sub-2-second response requirement and delivers the primary AI value proposition.

**Independent Test**: Type a question regarding the merchant's return policy. The assistant streams the answer token-by-token and shows a clickable citation link referencing the return policy document.

**Acceptance Scenarios**:
1. **Given** the chat window is open,  
   **When** the visitor types a question and presses enter (or clicks send),  
   **Then** the visitor's message appears immediately in the conversation stream, and an animated thinking indicator appears.
2. **Given** an answer is being generated,  
   **When** the first response tokens arrive from the server,  
   **Then** the assistant's message bubble streams the text progressively without waiting for the full response to finish.
3. **Given** the answer is grounded in knowledge base documents,  
   **When** the response completes,  
   **Then** verifiable source citation badges (e.g. `[1] Return & Refund Policy`) are displayed beneath the answer.
4. **Given** the visitor is having an ongoing conversation,  
   **When** the visitor navigates to another page on the same store or refreshes the page,  
   **Then** the existing conversation history is retained and re-hydrated seamlessly.

---

### User Story 3 - Human Escalation & Support Ticket Handoff (Priority: P3)

As an online shopper whose issue cannot be resolved by the AI,  
I want a clear, automated option to submit my contact details and request human escalation,  
So that I am never left stranded without a solution.

**Why this priority**: Adheres strictly to Constitution Principle III ("Continuous Human Safety Net") ensuring visitors never get trapped in unhelpful loops.

**Independent Test**: Ask an ungrounded or complex query (e.g., "I need a manager right now"). The assistant presents an escalation action, collects visitor email, and generates a support ticket confirmation.

**Acceptance Scenarios**:
1. **Given** the AI assistant has low confidence or the visitor asks for a human agent,  
   **When** the response completes,  
   **Then** an "Escalate to Human Agent" button appears alongside the assistant's message.
2. **Given** the visitor clicks "Escalate to Human Agent",  
   **When** the escalation prompt expands,  
   **Then** an inline form prompts for the visitor's email address and message summary.
3. **Given** valid contact details are submitted,  
   **When** the submission succeeds,  
   **Then** an inline confirmation card appears in the chat stream displaying the generated ticket reference number and follow-up email notice, while the chat message input remains active for further questions.

---

### Edge Cases

- **Slow or Disconnected Internet**: If the network drops while streaming an AI response, an inline retry prompt appears rather than crashing the chat.
- **Configuration Fetch Failure**: If the backend API is unreachable or returns an error during widget bootstrapping, the widget MUST fail gracefully and silently remain unmounted, logging a discreet diagnostic warning to the browser console without throwing uncaught exceptions.
- **Maximum Input Length**: If a visitor attempts to paste more than 1,000 characters, the input is capped and an inline character limit warning is shown.
- **Host Website Style Conflicts**: Third-party CSS resets (e.g. universal box-sizing or aggressive `!important` font styles) on the host site must NOT alter or break the chat widget's typography, colors, or positioning.
- **Rapid Clicking**: Multiple rapid clicks on the send button are debounced to prevent duplicate requests.
- **Rotated Keys**: If a merchant rotated their key within the last 24 hours, both the old key and new key continue to resolve without breaking the visitor's chat.

---

## 3. Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The widget script MUST self-execute upon inclusion via a standard HTML `<script>` tag and extract its active public key from the `data-widget-key` attribute.
- **FR-002**: The widget MUST isolate its styles and markup from the host website using a native Shadow DOM root (`attachShadow({ mode: "open" })`), ensuring complete style encapsulation against host page CSS conflicts while allowing typography inheritance and dynamic injection of the merchant's brand accent color via CSS custom properties.
- **FR-003**: The widget MUST retrieve the merchant's public branding configuration (bot display name, welcome greeting, accent color, placement, and domain whitelist) prior to mounting the chat window; if this configuration request fails or times out, the widget MUST fail silently and remain completely hidden without disturbing host page rendering.
- **FR-004**: The widget MUST enforce domain authorization: if the host site's hostname is not authorized by the merchant's configuration, the widget MUST refuse execution.
- **FR-005**: The widget launcher bubble and chat header MUST render using the merchant's chosen brand accent color, with high-contrast text and icons.
- **FR-006**: The widget MUST support both `bottom-right` and `bottom-left` corner anchoring based on the merchant's configured placement setting.
- **FR-007**: The widget MUST maintain visitor conversation sessions across page navigation on the merchant's website using browser `localStorage` with a 24-hour sliding expiration window, preserving conversation continuity across page transitions and multi-tab shopping.
- **FR-008**: The widget MUST stream assistant answers progressively token-by-token using Server-Sent Events (SSE) with a time-to-first-token under 2 seconds.
- **FR-009**: The widget MUST render source citation badges under AI answers whenever documents are cited.
- **FR-010**: The widget MUST adapt responsively for mobile viewports: on screens under 640px width, opening the widget MUST expand into an immersive full-screen view with a top navigation bar (bot name, online status, and close button) for optimal touch typing.
- **FR-011**: The widget MUST provide a reactive inline human escalation option directly in the chat message stream whenever the AI answer engine returns an escalation trigger, low confidence, or an explicit visitor request (keeping the header uncluttered without a persistent escalation button). Upon ticket submission, the widget MUST render an inline confirmation card with the ticket reference ID in the chat stream while keeping the message input active for subsequent visitor questions.
- **FR-012**: The widget MUST enforce rate limits and input validation (rejecting messages over 1,000 characters).
- **FR-013**: The widget script MUST be self-contained and zero-dependency, keeping the initial bundle size under 40 KB gzipped.

---

### Key Entities

- **Public Widget Configuration**:
  - `widget_key`: Public merchant identifier (`rd_live_...`).
  - `bot_display_name`: Assistant title displayed in the header.
  - `welcome_message`: First automated message shown when opened.
  - `primary_color`: Hex color code for branding.
  - `widget_placement`: Corner anchoring (`bottom-right` or `bottom-left`).
  - `allowed_origins`: Comma-separated allowed domain list or `*`.
- **Visitor Chat Session**:
  - `session_id` / `conversation_id`: Unique conversation identifier.
  - `messages`: Chronological list of user questions and assistant responses with citations.
  - `is_escalated`: Boolean flag indicating whether human intervention was requested.
- **Support Ticket Escalation**:
  - `ticket_id`: Generated confirmation reference.
  - `visitor_email`: Customer email address for email follow-up.
  - `reason`: Escalation trigger reason.

---

## 4. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The widget script initializes and displays the launcher bubble in **under 300 milliseconds** after host page load.
- **SC-002**: Total script asset payload is **under 40 KB gzipped**, preventing performance penalties on host ecommerce storefronts.
- **SC-003**: Streaming answers begin displaying the first token within **2 seconds** of user message submission.
- **SC-004**: 100% of host website CSS styling conflicts (including aggressive global resets) are prevented from bleeding into the widget UI.
- **SC-005**: 100% of unauthorized domain embed attempts are rejected before establishing a chat session.
- **SC-006**: Visitors navigating between multiple pages on the same store retain their active chat history without interruption.

---

## 5. Assumptions

- Store visitors have standard modern web browsers supporting ES2020+ and the Fetch API.
- The merchant's backend API is accessible over HTTPS with appropriate CORS headers for allowed client origins.
- Visitor authentication is not required to begin chatting; anonymous conversation sessions are isolated by session identifiers.
- The widget operates strictly as a customer support assistant without executing financial transactions directly inside the chat window.
