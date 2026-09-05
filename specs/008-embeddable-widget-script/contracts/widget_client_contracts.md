# Client Contract & Shadow DOM Specifications: Embeddable Customer Chat Widget

**Feature**: Embeddable Customer Chat Widget Script (`public/widget.js`)  
**Target Asset**: `frontend/public/widget.js`  
**Execution Environment**: Third-party ecommerce storefronts (cross-origin browser context)

---

## 1. Script Tag Embed Specification

Merchants copy-paste this standard HTML snippet into their storefront theme (`theme.liquid`, footer template, or `<head>`):

```html
<script 
  src="https://resolvdesk.com/widget.js" 
  data-widget-key="rd_live_9876543210fedcba9876543210fedcba" 
  defer>
</script>
```

### Optional Test / Dev Overrides

For local testing or staging environments, developers can override the target API host:

```html
<script 
  src="http://localhost:3000/widget.js" 
  data-widget-key="rd_live_test123" 
  data-api-base="http://localhost:8000" 
  defer>
</script>
```

---

## 2. DOM & Shadow Root Structure

When initialized, the script mounts a single root `<div>` to `document.body` and creates an open Shadow DOM root:

```html
<!-- In Host DOM (Document Body) -->
<div id="resolvdesk-widget-root" aria-live="polite">
  #shadow-root (open)
    <style>
      /* Encapsulated CSS reset, layout, and scoped theme tokens */
    </style>
    
    <!-- Floating Launcher Bubble -->
    <button 
      id="rd-launcher" 
      class="rd-launcher rd-placement-bottom-right" 
      aria-label="Open support chat" 
      aria-expanded="false">
      <!-- Chat Icon SVG / Close Icon SVG -->
    </button>

    <!-- Chat Container Window -->
    <div 
      id="rd-chat-window" 
      class="rd-chat-window rd-hidden rd-placement-bottom-right" 
      role="dialog" 
      aria-modal="false" 
      aria-label="Customer Support Chat">
      
      <!-- Sticky Header -->
      <header class="rd-header">
        <div class="rd-header-branding">
          <span class="rd-status-dot" aria-hidden="true"></span>
          <span class="rd-bot-title">Velvet Concierge</span>
        </div>
        <button id="rd-close-btn" class="rd-close-btn" aria-label="Close chat window">×</button>
      </header>

      <!-- Message History Stream -->
      <main class="rd-message-list" id="rd-message-list">
        <!-- Message Bubbles: Assistant Welcome, User Messages, AI Answers, Citations, Escalation Cards -->
      </main>

      <!-- Sticky Footer / Input Form -->
      <footer class="rd-footer">
        <form id="rd-input-form" class="rd-input-form">
          <input 
            type="text" 
            id="rd-input-box" 
            class="rd-input-box" 
            placeholder="Ask a question..." 
            maxlength="1000" 
            autocomplete="off" 
            aria-label="Type your message" />
          <button type="submit" id="rd-send-btn" class="rd-send-btn" aria-label="Send message">
            <!-- Send Arrow SVG -->
          </button>
        </form>
        <div class="rd-branding-badge">Powered by ResolvDesk</div>
      </footer>
    </div>
</div>
```

---

## 3. Dynamic CSS Theming Contract

The Shadow DOM dynamically defines custom properties derived from the merchant's fetched branding:

```css
:host {
  --rd-primary: #059669; /* Injected from primary_color */
  --rd-primary-hover: color-mix(in srgb, var(--rd-primary) 85%, black);
  --rd-primary-contrast: #ffffff;
  --rd-bg: #ffffff;
  --rd-surface: #f8fafc;
  --rd-border: #e2e8f0;
  --rd-text: #0f172a;
  --rd-text-muted: #64748b;
  --rd-radius-lg: 16px;
  --rd-radius-sm: 8px;
  --rd-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  --rd-z-index: 2147483647; /* Maximum browser z-index */
  font-family: inherit;
}
```

---

## 4. Mobile Breakpoint Contract (< 640px)

```css
@media (max-width: 640px) {
  .rd-chat-window {
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    border-radius: 0 !important;
    bottom: 0 !important;
    right: 0 !important;
    left: 0 !important;
    top: 0 !important;
  }

  .rd-header {
    padding: 16px;
    border-radius: 0;
  }

  .rd-close-btn {
    width: 44px;
    height: 44px; /* Accessible touch target */
  }
}
```

---

## 5. LocalStorage Storage Key Contract

- Key: `resolvdesk_session_${widgetKey}`
- TTL: 24 hours (86,400,000 ms) sliding window from `last_active`.
- Clear trigger: Purged automatically if stale upon script load or if user clears browser storage.
