/**
* ResolvDesk Embeddable Customer Chat Widget
* Version: 1.0.0
* Lightweight, zero-dependency standalone script.
* Mounts via Native Shadow DOM for complete CSS isolation from host storefronts.
*/
(function () {
  "use strict";

  // Prevent multiple executions on the same host page
  if (window.__RESOLVDESK_WIDGET_INITIALIZED__) {
    return;
  }
  window.__RESOLVDESK_WIDGET_INITIALIZED__ = true;

  // 1. Script tag discovery and attribute extraction
  var scriptTag =
    document.currentScript ||
    document.querySelector("script[data-widget-key]") ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].getAttribute("data-widget-key")) {
          return scripts[i];
        }
      }
      return null;
    })();

  if (!scriptTag) {
    console.warn("[ResolvDesk] Script tag with 'data-widget-key' attribute not found.");
    return;
  }

  var widgetKey = scriptTag.getAttribute("data-widget-key");
  if (!widgetKey || !widgetKey.trim()) {
    console.warn("[ResolvDesk] 'data-widget-key' attribute cannot be empty.");
    return;
  }
  widgetKey = widgetKey.trim();

  // Determine API base URL
  var explicitApiBase = scriptTag.getAttribute("data-api-base");
  var apiBase = "";
  if (explicitApiBase) {
    apiBase = explicitApiBase.replace(/\/+$/, "");
  } else {
    try {
      var scriptUrl = new URL(scriptTag.src, window.location.href);
      apiBase = scriptUrl.origin;
    } catch (e) {
      apiBase = window.location.origin;
    }
  }

  var SESSION_STORAGE_KEY = "resolvdesk_session_" + widgetKey;
  var SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours sliding window

  // Helper: check domain authorization
  function isDomainAuthorized(allowedOriginsStr) {
    if (!allowedOriginsStr || allowedOriginsStr.trim() === "*") {
      return true;
    }
    var currentHost = window.location.hostname.toLowerCase();
    var allowedList = allowedOriginsStr.split(",");
    for (var i = 0; i < allowedList.length; i++) {
      var entry = allowedList[i].trim().toLowerCase();
      if (!entry) continue;
      if (entry === "*") return true;
      // Strip protocol if included
      entry = entry.replace(/^[a-z]+:\/\//, "").split("/")[0].split(":")[0];
      if (entry === currentHost) return true;
      if (entry.indexOf("*.") === 0) {
        var rootDomain = entry.slice(2);
        if (currentHost === rootDomain || currentHost.endsWith("." + rootDomain)) {
          return true;
        }
      }
    }
    return false;
  }

  // 2. Fetch public widget configuration with silent graceful degradation
  fetch(apiBase + "/api/v1/widget/config?key=" + encodeURIComponent(widgetKey), {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP status " + response.status);
      }
      return response.json();
    })
    .then(function (config) {
      // Domain whitelist verification
      if (!isDomainAuthorized(config.allowed_origins)) {
        console.warn("[ResolvDesk] Domain not authorized for widget: " + window.location.hostname);
        return;
      }
      initWidget(config);
    })
    .catch(function (error) {
      // Silent graceful failure: do no harm to merchant storefront
      console.warn("[ResolvDesk] Widget initialization paused: " + error.message);
    });

  // 3. Widget Initialization & Shadow DOM Mounting
  function initWidget(config) {
    var primaryColor = config.primary_color || "#059669";
    var botName = config.bot_display_name || "ResolvDesk Assistant";
    var welcomeGreeting = config.welcome_message || "Hello! How can we assist you today?";
    var placement = config.widget_placement === "bottom-left" ? "bottom-left" : "bottom-right";

    // Create host element
    var hostContainer = document.createElement("div");
    hostContainer.id = "resolvdesk-widget-root";
    hostContainer.setAttribute("aria-live", "polite");
    document.body.appendChild(hostContainer);

    // Attach native Shadow DOM
    var shadow = hostContainer.attachShadow({ mode: "open" });

    // State management
    var isOpen = false;
    var isSubmitting = false;
    var conversationId = null;
    var messages = [];
    var ticketData = null;

    // Load session from localStorage with 24h sliding window
    try {
      var storedRaw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedRaw) {
        var parsedSession = JSON.parse(storedRaw);
        var now = Date.now();
        if (parsedSession && parsedSession.last_active && now - parsedSession.last_active < SESSION_TTL_MS) {
          conversationId = parsedSession.conversation_id || null;
          messages = Array.isArray(parsedSession.messages) ? parsedSession.messages : [];
          ticketData = parsedSession.ticket_data || null;
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (e) {
      // Ignore localStorage read errors (e.g. strict privacy modes)
    }

    // Save session to localStorage
    function saveSession() {
      try {
        var payload = {
          conversation_id: conversationId,
          last_active: Date.now(),
          messages: messages,
          ticket_data: ticketData,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        // Ignore quota/storage errors
      }
    }

    // Inject Shadow DOM Styles
    var styleTag = document.createElement("style");
    styleTag.textContent = [
      ":host, .rd-chat-window {",
      "  --rd-primary: " + primaryColor + ";",
      "  --rd-primary-contrast: #ffffff;",
      "  --rd-bg: #ffffff;",
      "  --rd-surface: #f8fafc;",
      "  --rd-surface-border: #e2e8f0;",
      "  --rd-text: #0f172a;",
      "  --rd-text-muted: #64748b;",
      "  --rd-bubble-assistant-bg: #f1f5f9;",
      "  --rd-bubble-assistant-text: #0f172a;",
      "  --rd-bubble-assistant-border: #e2e8f0;",
      "  --rd-form-bg: #ffffff;",
      "  --rd-form-border: #cbd5e1;",
      "  --rd-input-bg: #ffffff;",
      "  --rd-input-border: #cbd5e1;",
      "  --rd-badge-bg: #e2e8f0;",
      "  --rd-badge-text: #334155;",
      "  --rd-ticket-bg: #f0fdf4;",
      "  --rd-ticket-border: #86efac;",
      "  --rd-ticket-text: #14532d;",
      "  --rd-window-border: transparent;",
      "  --rd-window-shadow: 0 12px 36px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);",
      "  --rd-radius: 16px;",
      "  --rd-z: 2147483647;",
      "  all: initial;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;",
      "}",
      ":host([data-theme='light']), .rd-chat-window.rd-light {",
      "  --rd-bg: #ffffff;",
      "  --rd-surface: #f8fafc;",
      "  --rd-surface-border: #e2e8f0;",
      "  --rd-text: #0f172a;",
      "  --rd-text-muted: #64748b;",
      "  --rd-bubble-assistant-bg: #f1f5f9;",
      "  --rd-bubble-assistant-text: #0f172a;",
      "  --rd-bubble-assistant-border: #e2e8f0;",
      "  --rd-form-bg: #ffffff;",
      "  --rd-form-border: #cbd5e1;",
      "  --rd-input-bg: #ffffff;",
      "  --rd-input-border: #cbd5e1;",
      "  --rd-badge-bg: #e2e8f0;",
      "  --rd-badge-text: #334155;",
      "  --rd-ticket-bg: #f0fdf4;",
      "  --rd-ticket-border: #86efac;",
      "  --rd-ticket-text: #14532d;",
      "  --rd-window-border: rgba(0, 0, 0, 0.08);",
      "  --rd-window-shadow: 0 12px 36px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);",
      "}",
      ":host([data-theme='dark']), .rd-chat-window.rd-dark {",
      "  --rd-bg: #0b0f19;",
      "  --rd-surface: #151d2f;",
      "  --rd-surface-border: #243048;",
      "  --rd-text: #f8fafc;",
      "  --rd-text-muted: #94a3b8;",
      "  --rd-bubble-assistant-bg: #151d2f;",
      "  --rd-bubble-assistant-text: #f8fafc;",
      "  --rd-bubble-assistant-border: #243048;",
      "  --rd-form-bg: #151d2f;",
      "  --rd-form-border: #243048;",
      "  --rd-input-bg: #0b0f19;",
      "  --rd-input-border: #243048;",
      "  --rd-badge-bg: #243048;",
      "  --rd-badge-text: #cbd5e1;",
      "  --rd-ticket-bg: rgba(34, 197, 94, 0.12);",
      "  --rd-ticket-border: rgba(34, 197, 94, 0.3);",
      "  --rd-ticket-text: #86efac;",
      "  --rd-window-border: #243048;",
      "  --rd-window-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);",
      "}",
      "@media (prefers-color-scheme: dark) {",
      "  :host(:not([data-theme='light'])) .rd-chat-window:not(.rd-light),",
      "  :host(:not([data-theme='light'])) {",
      "    --rd-bg: #0b0f19;",
      "    --rd-surface: #151d2f;",
      "    --rd-surface-border: #243048;",
      "    --rd-text: #f8fafc;",
      "    --rd-text-muted: #94a3b8;",
      "    --rd-bubble-assistant-bg: #151d2f;",
      "    --rd-bubble-assistant-text: #f8fafc;",
      "    --rd-bubble-assistant-border: #243048;",
      "    --rd-form-bg: #151d2f;",
      "    --rd-form-border: #243048;",
      "    --rd-input-bg: #0b0f19;",
      "    --rd-input-border: #243048;",
      "    --rd-badge-bg: #243048;",
      "    --rd-badge-text: #cbd5e1;",
      "    --rd-ticket-bg: rgba(34, 197, 94, 0.12);",
      "    --rd-ticket-border: rgba(34, 197, 94, 0.3);",
      "    --rd-ticket-text: #86efac;",
      "    --rd-window-border: #243048;",
      "    --rd-window-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);",
      "  }",
      "}",
      "*, *::before, *::after {",
      "  box-sizing: border-box !important;",
      "  margin: 0;",
      "  padding: 0;",
      "}",
      "/* Launcher Button */",
      ".rd-launcher {",
      "  position: fixed;",
      "  bottom: 24px;",
      placement === "bottom-left" ? "left: 24px;" : "right: 24px;",
      "  width: 60px;",
      "  height: 60px;",
      "  border-radius: 50%;",
      "  background: var(--rd-primary);",
      "  color: var(--rd-primary-contrast);",
      "  border: none;",
      "  cursor: pointer;",
      "  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  z-index: var(--rd-z);",
      "  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;",
      "  outline: none;",
      "}",
      ".rd-launcher:hover {",
      "  transform: scale(1.05);",
      "  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);",
      "}",
      ".rd-launcher:active {",
      "  transform: scale(0.95);",
      "}",
      ".rd-launcher svg {",
      "  width: 28px;",
      "  height: 28px;",
      "  fill: currentColor;",
      "  transition: transform 0.2s ease, opacity 0.2s ease;",
      "}",
      ".rd-launcher .rd-icon-close {",
      "  display: none;",
      "}",
      ".rd-launcher.rd-is-open .rd-icon-chat {",
      "  display: none;",
      "}",
      ".rd-launcher.rd-is-open .rd-icon-close {",
      "  display: block;",
      "}",
      "/* Chat Window */",
      ".rd-chat-window {",
      "  position: fixed;",
      "  bottom: 96px;",
      placement === "bottom-left" ? "left: 24px;" : "right: 24px;",
      "  width: 380px;",
      "  max-width: calc(100vw - 48px);",
      "  height: 600px;",
      "  max-height: calc(100vh - 120px);",
      "  background: var(--rd-bg);",
      "  color: var(--rd-text);",
      "  border: 1px solid var(--rd-window-border);",
      "  border-radius: var(--rd-radius);",
      "  box-shadow: var(--rd-window-shadow);",
      "  display: flex;",
      "  flex-direction: column;",
      "  overflow: hidden;",
      "  z-index: var(--rd-z);",
      "  opacity: 0;",
      "  transform: translateY(20px) scale(0.98);",
      "  pointer-events: none;",
      "  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease;",
      "}",
      ".rd-chat-window.rd-active {",
      "  opacity: 1;",
      "  transform: translateY(0) scale(1);",
      "  pointer-events: auto;",
      "}",
      "/* Header */",
      ".rd-header {",
      "  background: var(--rd-primary);",
      "  color: var(--rd-primary-contrast);",
      "  padding: 16px 20px;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: space-between;",
      "  flex-shrink: 0;",
      "}",
      ".rd-header-title-box {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 10px;",
      "}",
      ".rd-status-dot {",
      "  width: 10px;",
      "  height: 10px;",
      "  border-radius: 50%;",
      "  background: #22c55e;",
      "  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);",
      "  display: inline-block;",
      "}",
      ".rd-header-title {",
      "  font-size: 16px;",
      "  font-weight: 600;",
      "  letter-spacing: -0.01em;",
      "}",
      ".rd-header-actions {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 6px;",
      "}",
      ".rd-theme-toggle-btn {",
      "  background: transparent;",
      "  border: none;",
      "  color: var(--rd-primary-contrast);",
      "  cursor: pointer;",
      "  padding: 4px;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  opacity: 0.85;",
      "  border-radius: 4px;",
      "  transition: opacity 0.15s ease;",
      "}",
      ".rd-theme-toggle-btn:hover {",
      "  opacity: 1;",
      "}",
      ".rd-theme-toggle-btn svg {",
      "  width: 17px;",
      "  height: 17px;",
      "  fill: currentColor;",
      "}",
      ".rd-icon-sun {",
      "  display: none;",
      "}",
      ".rd-icon-moon {",
      "  display: block;",
      "}",
      ".rd-dark .rd-icon-moon,",
      ":host([data-theme='dark']) .rd-icon-moon {",
      "  display: none;",
      "}",
      ".rd-dark .rd-icon-sun,",
      ":host([data-theme='dark']) .rd-icon-sun {",
      "  display: block;",
      "}",
      ".rd-close-btn {",
      "  background: transparent;",
      "  border: none;",
      "  color: var(--rd-primary-contrast);",
      "  font-size: 24px;",
      "  line-height: 1;",
      "  cursor: pointer;",
      "  padding: 4px;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  opacity: 0.85;",
      "  border-radius: 4px;",
      "  transition: opacity 0.15s ease;",
      "}",
      ".rd-close-btn:hover {",
      "  opacity: 1;",
      "}",
      "/* Message Stream */",
      ".rd-messages-stream {",
      "  flex: 1;",
      "  overflow-y: auto;",
      "  padding: 20px 16px;",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: 14px;",
      "  background: var(--rd-bg);",
      "  transition: background-color 0.2s ease;",
      "}",
      ".rd-message-row {",
      "  display: flex;",
      "  flex-direction: column;",
      "  max-width: 85%;",
      "}",
      ".rd-message-row.rd-visitor {",
      "  align-self: flex-end;",
      "  align-items: flex-end;",
      "}",
      ".rd-message-row.rd-assistant {",
      "  align-self: flex-start;",
      "  align-items: flex-start;",
      "}",
      ".rd-bubble {",
      "  padding: 12px 16px;",
      "  border-radius: 14px;",
      "  font-size: 14.5px;",
      "  line-height: 1.5;",
      "  word-break: break-word;",
      "}",
      ".rd-visitor .rd-bubble {",
      "  background: var(--rd-primary);",
      "  color: var(--rd-primary-contrast);",
      "  border-bottom-right-radius: 4px;",
      "}",
      ".rd-assistant .rd-bubble {",
      "  background: var(--rd-bubble-assistant-bg);",
      "  color: var(--rd-bubble-assistant-text);",
      "  border-bottom-left-radius: 4px;",
      "  border: 1px solid var(--rd-bubble-assistant-border);",
      "  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;",
      "}",
      "/* Citations */",
      ".rd-citations-container {",
      "  display: flex;",
      "  flex-wrap: wrap;",
      "  gap: 6px;",
      "  margin-top: 6px;",
      "}",
      ".rd-citation-badge {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 4px;",
      "  font-size: 11.5px;",
      "  background: var(--rd-badge-bg);",
      "  color: var(--rd-badge-text);",
      "  padding: 4px 8px;",
      "  border-radius: 6px;",
      "  text-decoration: none;",
      "  font-weight: 500;",
      "  transition: background-color 0.2s ease, color 0.2s ease;",
      "}",
      "/* Typing Indicator */",
      ".rd-typing-dots {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 4px;",
      "  padding: 8px 12px;",
      "}",
      ".rd-dot {",
      "  width: 6px;",
      "  height: 6px;",
      "  border-radius: 50%;",
      "  background: var(--rd-text-muted);",
      "  animation: rd-bounce 1.2s infinite ease-in-out;",
      "}",
      ".rd-dot:nth-child(2) { animation-delay: 0.2s; }",
      ".rd-dot:nth-child(3) { animation-delay: 0.4s; }",
      "@keyframes rd-bounce {",
      "  0%, 80%, 100% { transform: scale(0); }",
      "  40% { transform: scale(1); }",
      "}",
      "/* Escalation Prompts & Cards */",
      ".rd-escalate-action {",
      "  margin-top: 8px;",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: 6px;",
      "  width: 100%;",
      "}",
      ".rd-escalate-trigger-btn {",
      "  background: var(--rd-surface);",
      "  border: 1px solid var(--rd-surface-border);",
      "  color: var(--rd-text);",
      "  padding: 8px 12px;",
      "  border-radius: 8px;",
      "  font-size: 13px;",
      "  font-weight: 500;",
      "  cursor: pointer;",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 6px;",
      "  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;",
      "}",
      ".rd-escalate-trigger-btn:hover {",
      "  background: var(--rd-surface-border);",
      "}",
      ".rd-escalate-form {",
      "  margin-top: 8px;",
      "  background: var(--rd-form-bg);",
      "  border: 1px solid var(--rd-form-border);",
      "  border-radius: 10px;",
      "  padding: 12px;",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: 8px;",
      "  transition: background-color 0.2s ease, border-color 0.2s ease;",
      "}",
      ".rd-form-title {",
      "  font-size: 13px;",
      "  font-weight: 600;",
      "  color: var(--rd-text);",
      "}",
      ".rd-escalate-input,",
      ".rd-escalate-textarea {",
      "  width: 100%;",
      "  padding: 8px 10px;",
      "  background: var(--rd-input-bg);",
      "  color: var(--rd-text);",
      "  border: 1px solid var(--rd-input-border);",
      "  border-radius: 6px;",
      "  font-size: 13px;",
      "  outline: none;",
      "  font-family: inherit;",
      "  transition: border-color 0.15s ease, background-color 0.2s ease, color 0.2s ease;",
      "}",
      ".rd-escalate-input::placeholder,",
      ".rd-escalate-textarea::placeholder {",
      "  color: var(--rd-text-muted);",
      "}",
      ".rd-escalate-input:focus,",
      ".rd-escalate-textarea:focus {",
      "  border-color: var(--rd-primary);",
      "}",
      ".rd-escalate-submit-btn {",
      "  background: var(--rd-primary);",
      "  color: var(--rd-primary-contrast);",
      "  border: none;",
      "  padding: 8px 12px;",
      "  border-radius: 6px;",
      "  font-size: 13px;",
      "  font-weight: 600;",
      "  cursor: pointer;",
      "  transition: opacity 0.15s ease;",
      "}",
      ".rd-escalate-submit-btn:disabled {",
      "  opacity: 0.6;",
      "  cursor: not-allowed;",
      "}",
      ".rd-ticket-card {",
      "  margin-top: 8px;",
      "  background: var(--rd-ticket-bg);",
      "  border: 1px solid var(--rd-ticket-border);",
      "  border-radius: 8px;",
      "  padding: 12px;",
      "  display: flex;",
      "  gap: 10px;",
      "  align-items: flex-start;",
      "  color: var(--rd-ticket-text);",
      "  transition: background-color 0.2s ease, border-color 0.2s ease;",
      "}",
      ".rd-ticket-check {",
      "  width: 20px;",
      "  height: 20px;",
      "  background: #22c55e;",
      "  color: #ffffff;",
      "  border-radius: 50%;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  font-weight: bold;",
      "  font-size: 12px;",
      "  flex-shrink: 0;",
      "}",
      ".rd-ticket-content strong {",
      "  display: block;",
      "  font-size: 13.5px;",
      "  margin-bottom: 2px;",
      "  color: var(--rd-ticket-text);",
      "}",
      ".rd-ticket-content p {",
      "  font-size: 12.5px;",
      "  line-height: 1.4;",
      "  color: var(--rd-ticket-text);",
      "  opacity: 0.95;",
      "}",
      "/* Footer / Input Area */",
      ".rd-footer {",
      "  border-top: 1px solid var(--rd-surface-border);",
      "  background: var(--rd-bg);",
      "  padding: 12px 16px;",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: 6px;",
      "  flex-shrink: 0;",
      "  transition: background-color 0.2s ease, border-color 0.2s ease;",
      "}",
      ".rd-input-row {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 8px;",
      "  background: var(--rd-surface);",
      "  border: 1px solid var(--rd-surface-border);",
      "  border-radius: 24px;",
      "  padding: 6px 6px 6px 14px;",
      "  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.2s ease;",
      "}",
      ".rd-input-row:focus-within {",
      "  border-color: var(--rd-primary);",
      "  box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.12);",
      "}",
      ".rd-text-input {",
      "  flex: 1;",
      "  border: none;",
      "  background: transparent;",
      "  outline: none;",
      "  font-size: 14px;",
      "  font-family: inherit;",
      "  color: var(--rd-text);",
      "}",
      ".rd-text-input::placeholder {",
      "  color: var(--rd-text-muted);",
      "}",
      ".rd-send-btn {",
      "  width: 34px;",
      "  height: 34px;",
      "  border-radius: 50%;",
      "  background: var(--rd-primary);",
      "  color: var(--rd-primary-contrast);",
      "  border: none;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  cursor: pointer;",
      "  transition: opacity 0.15s ease, transform 0.1s ease;",
      "  flex-shrink: 0;",
      "}",
      ".rd-send-btn:disabled {",
      "  opacity: 0.4;",
      "  cursor: not-allowed;",
      "}",
      ".rd-send-btn:not(:disabled):active {",
      "  transform: scale(0.92);",
      "}",
      ".rd-send-btn svg {",
      "  width: 16px;",
      "  height: 16px;",
      "  fill: currentColor;",
      "}",
      ".rd-branding-footer {",
      "  text-align: center;",
      "  font-size: 11px;",
      "  color: var(--rd-text-muted);",
      "  letter-spacing: 0.02em;",
      "}",
      "/* Mobile Breakpoint (< 640px) */",
      "@media (max-width: 640px) {",
      "  .rd-chat-window {",
      "    position: fixed !important;",
      "    inset: 0 !important;",
      "    width: 100vw !important;",
      "    height: 100vh !important;",
      "    max-width: 100vw !important;",
      "    max-height: 100vh !important;",
      "    border-radius: 0 !important;",
      "    bottom: 0 !important;",
      "    right: 0 !important;",
      "    left: 0 !important;",
      "    top: 0 !important;",
      "  }",
      "  .rd-header {",
      "    padding: 16px;",
      "    border-radius: 0;",
      "  }",
      "  .rd-close-btn {",
      "    width: 44px;",
      "    height: 44px;",
      "    font-size: 28px;",
      "  }",
      "}",
    ].join("\n");
    shadow.appendChild(styleTag);

    // Build DOM structure
    var launcherBtn = document.createElement("button");
    launcherBtn.className = "rd-launcher";
    launcherBtn.setAttribute("aria-label", "Toggle customer support chat");
    launcherBtn.innerHTML = [
      '<svg class="rd-icon-chat" viewBox="0 0 24 24">',
      '  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>',
      "</svg>",
      '<svg class="rd-icon-close" viewBox="0 0 24 24">',
      '  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
      "</svg>",
    ].join("");
    shadow.appendChild(launcherBtn);

    var chatWindow = document.createElement("div");
    chatWindow.className = "rd-chat-window";
    chatWindow.setAttribute("role", "dialog");
    chatWindow.setAttribute("aria-label", "ResolvDesk Customer Support Chat");
    chatWindow.innerHTML = [
      '<header class="rd-header">',
      '  <div class="rd-header-title-box">',
      '    <span class="rd-status-dot" aria-hidden="true"></span>',
      '    <span class="rd-header-title">' + escapeHtml(botName) + "</span>",
      "  </div>",
      '  <div class="rd-header-actions">',
      '    <button class="rd-theme-toggle-btn" aria-label="Toggle theme" title="Toggle theme">',
      '      <svg class="rd-icon-moon" viewBox="0 0 24 24"><path d="M12.3 4.9c.4-.2.6-.7.5-1.1-.1-.5-.6-.8-1.1-.8C6.2 3.3 2 7.8 2 13.5 2 19.3 6.7 24 12.5 24c5.7 0 10.2-4.2 10.5-9.7.1-.5-.3-1-.8-1.1-.5-.1-.9.1-1.1.5-1.1 2.3-3.5 3.8-6.1 3.8-3.9 0-7-3.1-7-7 0-2.6 1.5-5 3.8-6.1z"/></svg>',
      '      <svg class="rd-icon-sun" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.29 1.29c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.29 1.29c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-1.29-1.29zm0-10.96l1.29-1.29c.39-.39.39-1.02 0-1.41a.996.996 0 00-1.41 0l-1.29 1.29c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0zM7.28 17.66l-1.29 1.29c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.29-1.29c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0z"/></svg>',
      '    </button>',
      '    <button class="rd-close-btn" aria-label="Close chat">×</button>',
      '  </div>',
      "</header>",
      '<main class="rd-messages-stream" id="rd-messages"></main>',
      '<footer class="rd-footer">',
      '  <form class="rd-input-row" id="rd-form">',
      '    <input type="text" class="rd-text-input" placeholder="Type your message..." maxlength="1000" />',
      '    <button type="submit" class="rd-send-btn" aria-label="Send message">',
      '      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
      "    </button>",
      "  </form>",
      '  <div class="rd-branding-footer">Powered by ResolvDesk</div>',
      "</footer>",
    ].join("");
    shadow.appendChild(chatWindow);

    var messageContainer = chatWindow.querySelector("#rd-messages");
    var inputForm = chatWindow.querySelector("#rd-form");
    var textInput = chatWindow.querySelector(".rd-text-input");
    var sendBtn = chatWindow.querySelector(".rd-send-btn");
    var closeBtn = chatWindow.querySelector(".rd-close-btn");
    var themeToggleBtn = chatWindow.querySelector(".rd-theme-toggle-btn");

    // --- Automatic Theme Detection & Reactive Syncing ---
    // Clean up any stale permanent localStorage override from testing so auto-detection works
    try {
      localStorage.removeItem("resolvdesk_theme_mode");
    } catch (e) {}

    var userSessionOverride = null;
    try {
      userSessionOverride = sessionStorage.getItem("resolvdesk_theme_mode");
    } catch (e) {}

    var _themeCanvasCtx = null;
    function getRgbFromColor(colorStr) {
      if (!colorStr || colorStr === "transparent" || colorStr === "rgba(0, 0, 0, 0)") {
        return null;
      }
      var m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m) {
        var a = m[4] !== undefined ? parseFloat(m[4]) : 1;
        if (a < 0.1) return null;
        return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10), a: a };
      }
      try {
        if (!_themeCanvasCtx) {
          var c = document.createElement("canvas");
          c.width = 1;
          c.height = 1;
          _themeCanvasCtx = c.getContext("2d", { willReadFrequently: true });
        }
        if (_themeCanvasCtx) {
          _themeCanvasCtx.clearRect(0, 0, 1, 1);
          _themeCanvasCtx.fillStyle = colorStr;
          _themeCanvasCtx.fillRect(0, 0, 1, 1);
          var px = _themeCanvasCtx.getImageData(0, 0, 1, 1).data;
          if (px[3] < 20) return null;
          return { r: px[0], g: px[1], b: px[2], a: px[3] / 255 };
        }
      } catch (e) {}
      return null;
    }

    function calcLuminance(r, g, b) {
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function detectHostTheme() {
      var docEl = document.documentElement;
      var body = document.body;

      // 1. Check classes on <html>, <body>, or any top-level dark container
      if (
        (docEl && docEl.classList.contains("dark")) ||
        (body && body.classList.contains("dark")) ||
        document.querySelector(".dark") !== null
      ) {
        return "dark";
      }

      // 2. Check color-scheme (style attribute or computed style on <html> and <body>)
      try {
        var docCs = (docEl && (docEl.style.colorScheme || window.getComputedStyle(docEl).colorScheme)) || "";
        var bodyCs = (body && (body.style.colorScheme || window.getComputedStyle(body).colorScheme)) || "";
        if (docCs === "dark" || bodyCs === "dark") {
          return "dark";
        }
        if (docCs === "light" || bodyCs === "light") {
          return "light";
        }
      } catch (e) {}

      // 3. Check data attributes (daisyUI, chakra, next-themes, github)
      var themeAttr =
        (docEl && (docEl.getAttribute("data-theme") || docEl.getAttribute("data-mode") || docEl.getAttribute("data-color-mode") || docEl.getAttribute("theme"))) ||
        (body && (body.getAttribute("data-theme") || body.getAttribute("data-mode") || body.getAttribute("data-color-mode")));

      if (themeAttr) {
        var lower = themeAttr.toLowerCase();
        if (lower.indexOf("dark") !== -1) return "dark";
        if (lower.indexOf("light") !== -1) return "light";
      }

      // 4. Check host localStorage (next-themes, tailwind, etc.)
      try {
        var hostSavedTheme = 
          localStorage.getItem("theme") || 
          localStorage.getItem("color-theme") || 
          localStorage.getItem("chakra-ui-color-mode") ||
          localStorage.getItem("mantine-color-scheme-value");
        if (hostSavedTheme) {
          var hLower = hostSavedTheme.toLowerCase();
          if (hLower.indexOf("dark") !== -1) return "dark";
          if (hLower.indexOf("light") !== -1) return "light";
        }
      } catch (e) {}

      // 5. Check computed background color or text luminance across key elements
      try {
        var candidates = [
          body,
          docEl,
          document.querySelector("main"),
          document.querySelector("#__next"),
          document.querySelector("#root"),
          body ? body.firstElementChild : null
        ];
        for (var i = 0; i < candidates.length; i++) {
          var el = candidates[i];
          if (!el) continue;
          var computed = window.getComputedStyle(el);
          if (computed) {
            var bg = getRgbFromColor(computed.backgroundColor);
            if (bg && bg.a > 0.1) {
              var bgLum = calcLuminance(bg.r, bg.g, bg.b);
              if (bgLum < 128) return "dark";
              if (bgLum >= 128) return "light";
            }
            var fg = getRgbFromColor(computed.color);
            if (fg && fg.a > 0.5) {
              var fgLum = calcLuminance(fg.r, fg.g, fg.b);
              if (fgLum > 180) return "dark";
              if (fgLum < 70) return "light";
            }
          }
        }
      } catch (e) {}

      // 6. Check explicit class="light" on root
      if (
        (docEl && docEl.classList.contains("light")) ||
        (body && body.classList.contains("light"))
      ) {
        return "light";
      }

      // 7. Fallback to OS prefers-color-scheme
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }

      return "light";
    }

    function applyTheme(theme) {
      hostContainer.setAttribute("data-theme", theme);
      if (theme === "dark") {
        chatWindow.classList.add("rd-dark");
        chatWindow.classList.remove("rd-light");
      } else {
        chatWindow.classList.add("rd-light");
        chatWindow.classList.remove("rd-dark");
      }
    }

    function syncTheme(forceHost) {
      if (!forceHost && userSessionOverride) {
        applyTheme(userSessionOverride);
        return;
      }
      var detected = detectHostTheme();
      applyTheme(detected);
    }

    // Initial theme sync
    syncTheme();

    // Re-check theme on hydration intervals (for host React/Next-themes hydration)
    setTimeout(function () { syncTheme(); }, 150);
    setTimeout(function () { syncTheme(); }, 600);
    setTimeout(function () { syncTheme(); }, 1600);

    // Theme toggle button handler
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var currentTheme = hostContainer.getAttribute("data-theme") || detectHostTheme();
        var nextTheme = currentTheme === "dark" ? "light" : "dark";
        userSessionOverride = nextTheme;
        try {
          sessionStorage.setItem("resolvdesk_theme_mode", nextTheme);
        } catch (err) {}
        applyTheme(nextTheme);
      });
    }

    // Live reactive theme sync via MutationObserver
    try {
      var themeObserver = new MutationObserver(function () {
        // When host website changes theme, reset user session override and follow host
        userSessionOverride = null;
        try {
          sessionStorage.removeItem("resolvdesk_theme_mode");
        } catch (err) {}
        syncTheme(true);
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "data-mode", "data-color-mode", "style"],
      });
      if (document.body) {
        themeObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ["class", "data-theme", "data-mode", "data-color-mode", "style"],
        });
      }
    } catch (e) {}

    if (window.matchMedia) {
      try {
        var mql = window.matchMedia("(prefers-color-scheme: dark)");
        if (mql.addEventListener) {
          mql.addEventListener("change", function () {
            userSessionOverride = null;
            syncTheme(true);
          });
        } else if (mql.addListener) {
          mql.addListener(function () {
            userSessionOverride = null;
            syncTheme(true);
          });
        }
      } catch (e) {}
    }

    // Toggle Chat Window
    function toggleChat(forceOpen) {
      if (typeof forceOpen === "boolean") {
        isOpen = forceOpen;
      } else {
        isOpen = !isOpen;
      }
      if (isOpen) {
        launcherBtn.classList.add("rd-is-open");
        chatWindow.classList.add("rd-active");
        setTimeout(function () {
          textInput.focus();
        }, 100);
        scrollToBottom();
      } else {
        launcherBtn.classList.remove("rd-is-open");
        chatWindow.classList.remove("rd-active");
      }
    }

    launcherBtn.addEventListener("click", function () {
      toggleChat();
    });
    closeBtn.addEventListener("click", function () {
      toggleChat(false);
    });

    function escapeHtml(str) {
      if (!str) return "";
      var div = document.createElement("div");
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
    }

    function scrollToBottom() {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    // Render message turn in UI
    function renderMessage(role, content, citations, suggestEscalation) {
      var row = document.createElement("div");
      row.className = "rd-message-row " + (role === "visitor" ? "rd-visitor" : "rd-assistant");

      var bubble = document.createElement("div");
      bubble.className = "rd-bubble";
      bubble.textContent = content;
      row.appendChild(bubble);

      // Render citations if provided
      if (citations && citations.length > 0) {
        var citBox = document.createElement("div");
        citBox.className = "rd-citations-container";
        for (var i = 0; i < citations.length; i++) {
          var c = citations[i];
          var badge = document.createElement("span");
          badge.className = "rd-citation-badge";
          badge.textContent = "📄 " + (c.title || "Document");
          citBox.appendChild(badge);
        }
        row.appendChild(citBox);
      }

      // Render reactive escalation button if low confidence / fallback
      if (suggestEscalation && !ticketData) {
        var escActionBox = document.createElement("div");
        escActionBox.className = "rd-escalate-action";

        var escTriggerBtn = document.createElement("button");
        escTriggerBtn.className = "rd-escalate-trigger-btn";
        escTriggerBtn.innerHTML = "<span>🙋</span> Speak with a Human Support Agent";

        var escForm = document.createElement("form");
        escForm.className = "rd-escalate-form";
        escForm.style.display = "none";
        escForm.innerHTML = [
          '<div class="rd-form-title">Request Human Support</div>',
          '<input type="email" class="rd-escalate-input" placeholder="Your email (e.g. shopper@example.com)" required />',
          '<textarea class="rd-escalate-textarea" placeholder="Describe your issue or order number..." rows="2"></textarea>',
          '<button type="submit" class="rd-escalate-submit-btn">Submit Ticket</button>',
        ].join("");

        escTriggerBtn.addEventListener("click", function () {
          escTriggerBtn.style.display = "none";
          escForm.style.display = "flex";
          escForm.querySelector("input").focus();
          scrollToBottom();
        });

        escForm.addEventListener("submit", function (e) {
          e.preventDefault();
          var emailInput = escForm.querySelector(".rd-escalate-input");
          var reasonInput = escForm.querySelector(".rd-escalate-textarea");
          var subBtn = escForm.querySelector(".rd-escalate-submit-btn");

          var emailVal = emailInput.value.trim();
          var reasonVal = reasonInput.value.trim();
          if (!emailVal) return;

          subBtn.disabled = true;
          subBtn.textContent = "Submitting...";

          fetch(apiBase + "/api/v1/widget/chat/escalate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              widget_key: widgetKey,
              conversation_id: conversationId,
              visitor_email: emailVal,
              reason: reasonVal || null,
            }),
          })
            .then(function (res) {
              if (!res.ok) throw new Error("Escalation failed: " + res.status);
              return res.json();
            })
            .then(function (resData) {
              ticketData = resData;
              saveSession();
              escForm.innerHTML = [
                '<div class="rd-ticket-card">',
                '  <div class="rd-ticket-check">✓</div>',
                '  <div class="rd-ticket-content">',
                "    <strong>Ticket #" + escapeHtml(resData.ticket_id) + " Submitted</strong>",
                "    <p>Our store support team will follow up via email at <em>" +
                escapeHtml(resData.visitor_email) +
                "</em>.</p>",
                "  </div>",
                "</div>",
              ].join("");
              scrollToBottom();
            })
            .catch(function (err) {
              subBtn.disabled = false;
              subBtn.textContent = "Retry Submit";
              alert("Could not submit ticket. Please check your network and try again.");
            });
        });

        escActionBox.appendChild(escTriggerBtn);
        escActionBox.appendChild(escForm);
        row.appendChild(escActionBox);
      }

      messageContainer.appendChild(row);
      scrollToBottom();
      return bubble;
    }

    // Initialize messages stream
    if (messages.length === 0) {
      renderMessage("assistant", welcomeGreeting);
    } else {
      for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        renderMessage(m.role, m.content, m.citations, m.suggestEscalation);
      }
      if (ticketData) {
        var tRow = document.createElement("div");
        tRow.className = "rd-message-row rd-assistant";
        tRow.innerHTML = [
          '<div class="rd-ticket-card">',
          '  <div class="rd-ticket-check">✓</div>',
          '  <div class="rd-ticket-content">',
          "    <strong>Ticket #" + escapeHtml(ticketData.ticket_id) + " Submitted</strong>",
          "    <p>Our store support team will follow up at <em>" +
          escapeHtml(ticketData.visitor_email) +
          "</em>.</p>",
          "  </div>",
          "</div>",
        ].join("");
        messageContainer.appendChild(tRow);
      }
    }

    // Submit user message and stream response via SSE
    inputForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = textInput.value.trim();
      if (!text || isSubmitting) return;

      // Check max length
      if (text.length > 1000) {
        text = text.slice(0, 1000);
      }

      isSubmitting = true;
      sendBtn.disabled = true;
      textInput.value = "";

      // 1. Render visitor turn
      renderMessage("visitor", text);
      messages.push({ role: "visitor", content: text });
      saveSession();

      // 2. Render typing indicator
      var assistantRow = document.createElement("div");
      assistantRow.className = "rd-message-row rd-assistant";
      var assistantBubble = document.createElement("div");
      assistantBubble.className = "rd-bubble";
      assistantBubble.innerHTML =
        '<div class="rd-typing-dots"><span class="rd-dot"></span><span class="rd-dot"></span><span class="rd-dot"></span></div>';
      assistantRow.appendChild(assistantBubble);
      messageContainer.appendChild(assistantRow);
      scrollToBottom();

      var accumulatedText = "";
      var accumulatedCitations = [];
      var shouldSuggestEscalation = false;
      var hasStreamedToken = false;

      fetch(apiBase + "/api/v1/widget/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          widget_key: widgetKey,
          message: text,
          conversation_id: conversationId,
        }),
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Chat request failed: " + response.status);
          }
          if (!response.body || !response.body.getReader) {
            throw new Error("Streaming not supported in this browser");
          }

          var reader = response.body.getReader();
          var decoder = new TextDecoder("utf-8");
          var buffer = "";

          function readStream() {
            return reader.read().then(function (result) {
              if (result.done) {
                finishTurn();
                return;
              }

              buffer += decoder.decode(result.value, { stream: true });
              var lines = buffer.split("\n");
              buffer = lines.pop(); // Retain incomplete remainder

              var currentEvent = "message";
              for (var j = 0; j < lines.length; j++) {
                var line = lines[j];
                if (line.indexOf("event:") === 0) {
                  currentEvent = line.slice(6).trim();
                } else if (line.indexOf("data:") === 0) {
                  var dataStr = line.slice(5).trim();
                  try {
                    var dataObj = JSON.parse(dataStr);
                    handleSSE(currentEvent, dataObj);
                  } catch (parseErr) {
                    // Ignore malformed line
                  }
                }
              }

              return readStream();
            });
          }

          function handleSSE(event, data) {
            if (event === "start" && data.conversation_id) {
              conversationId = data.conversation_id;
            } else if (event === "token" && data.token) {
              if (!hasStreamedToken) {
                hasStreamedToken = true;
                assistantBubble.textContent = "";
              }
              accumulatedText += data.token;
              assistantBubble.textContent = accumulatedText;
              scrollToBottom();
            } else if (event === "citation" && Array.isArray(data.citations)) {
              accumulatedCitations = data.citations;
            } else if (event === "escalate_suggestion") {
              shouldSuggestEscalation = true;
            } else if (event === "done") {
              if (data.conversation_id) {
                conversationId = data.conversation_id;
              }
            } else if (event === "error") {
              assistantBubble.textContent = "Sorry, an error occurred while generating an answer.";
            }
          }

          function finishTurn() {
            isSubmitting = false;
            sendBtn.disabled = false;
            textInput.focus();

            if (!accumulatedText) {
              accumulatedText = assistantBubble.textContent || "No response received.";
            }

            // Render citations
            if (accumulatedCitations.length > 0) {
              var citBox = document.createElement("div");
              citBox.className = "rd-citations-container";
              for (var k = 0; k < accumulatedCitations.length; k++) {
                var badge = document.createElement("span");
                badge.className = "rd-citation-badge";
                badge.textContent = "📄 " + (accumulatedCitations[k].title || "Documentation");
                citBox.appendChild(badge);
              }
              assistantRow.appendChild(citBox);
            }

            // Render escalation prompt if fallback or suggested
            if (shouldSuggestEscalation && !ticketData) {
              var escActionBox = document.createElement("div");
              escActionBox.className = "rd-escalate-action";

              var escTriggerBtn = document.createElement("button");
              escTriggerBtn.className = "rd-escalate-trigger-btn";
              escTriggerBtn.innerHTML = "<span>🙋</span> Speak with a Human Support Agent";

              var escForm = document.createElement("form");
              escForm.className = "rd-escalate-form";
              escForm.style.display = "none";
              escForm.innerHTML = [
                '<div class="rd-form-title">Request Human Support</div>',
                '<input type="email" class="rd-escalate-input" placeholder="Your email (e.g. shopper@example.com)" required />',
                '<textarea class="rd-escalate-textarea" placeholder="Describe your issue or order number..." rows="2"></textarea>',
                '<button type="submit" class="rd-escalate-submit-btn">Submit Ticket</button>',
              ].join("");

              escTriggerBtn.addEventListener("click", function () {
                escTriggerBtn.style.display = "none";
                escForm.style.display = "flex";
                escForm.querySelector("input").focus();
                scrollToBottom();
              });

              escForm.addEventListener("submit", function (ev) {
                ev.preventDefault();
                var emailVal = escForm.querySelector(".rd-escalate-input").value.trim();
                var reasonVal = escForm.querySelector(".rd-escalate-textarea").value.trim();
                if (!emailVal) return;

                var sBtn = escForm.querySelector(".rd-escalate-submit-btn");
                sBtn.disabled = true;
                sBtn.textContent = "Submitting...";

                fetch(apiBase + "/api/v1/widget/chat/escalate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    widget_key: widgetKey,
                    conversation_id: conversationId,
                    visitor_email: emailVal,
                    reason: reasonVal || null,
                  }),
                })
                  .then(function (r) {
                    if (!r.ok) throw new Error("Status: " + r.status);
                    return r.json();
                  })
                  .then(function (rData) {
                    ticketData = rData;
                    saveSession();
                    escForm.innerHTML = [
                      '<div class="rd-ticket-card">',
                      '  <div class="rd-ticket-check">✓</div>',
                      '  <div class="rd-ticket-content">',
                      "    <strong>Ticket #" + escapeHtml(rData.ticket_id) + " Submitted</strong>",
                      "    <p>Our store support team will follow up via email at <em>" +
                      escapeHtml(rData.visitor_email) +
                      "</em>.</p>",
                      "  </div>",
                      "</div>",
                    ].join("");
                    scrollToBottom();
                  })
                  .catch(function (e) {
                    sBtn.disabled = false;
                    sBtn.textContent = "Retry Submit";
                    alert("Could not submit ticket. Please check network and retry.");
                  });
              });

              escActionBox.appendChild(escTriggerBtn);
              escActionBox.appendChild(escForm);
              assistantRow.appendChild(escActionBox);
            }

            messages.push({
              role: "assistant",
              content: accumulatedText,
              citations: accumulatedCitations,
              suggestEscalation: shouldSuggestEscalation,
            });
            saveSession();
            scrollToBottom();
          }

          return readStream();
        })
        .catch(function (streamErr) {
          isSubmitting = false;
          sendBtn.disabled = false;
          assistantBubble.textContent = "Connection interrupted. Please check your internet and retry.";

          // Retry button
          var retryBtn = document.createElement("button");
          retryBtn.className = "rd-escalate-trigger-btn";
          retryBtn.style.marginTop = "6px";
          retryBtn.textContent = "🔄 Retry Message";
          retryBtn.addEventListener("click", function () {
            assistantRow.remove();
            textInput.value = text;
            inputForm.dispatchEvent(new Event("submit"));
          });
          assistantRow.appendChild(retryBtn);
          scrollToBottom();
        });
    });
  }
})();
