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
    function parseWidgetPlacement(raw) {
      var fallback = { corner: "bottom-right", offsetX: 24, offsetY: 24 };
      if (!raw || typeof raw !== "string") return fallback;
      var parts = raw.trim().split(":");
      var corner = parts[0];
      var validCorners = ["bottom-right", "bottom-left", "top-right", "top-left"];
      if (validCorners.indexOf(corner) === -1) {
        return fallback;
      }
      var ox = parts.length > 1 ? parseInt(parts[1], 10) : 24;
      var oy = parts.length > 2 ? parseInt(parts[2], 10) : 24;
      return {
        corner: corner,
        offsetX: !isNaN(ox) && ox >= 0 ? ox : 24,
        offsetY: !isNaN(oy) && oy >= 0 ? oy : 24,
      };
    }
    var parsedPlacement = parseWidgetPlacement(config.widget_placement);
    var vSide = (parsedPlacement.corner === "top-left" || parsedPlacement.corner === "top-right") ? "top" : "bottom";
    var hSide = (parsedPlacement.corner === "top-left" || parsedPlacement.corner === "bottom-left") ? "left" : "right";
    var launcherOffset = parsedPlacement.offsetY;
    var chatOffset = parsedPlacement.offsetY + 72;
    var initialTransform = vSide === "top" ? "translateY(-20px) scale(0.98)" : "translateY(20px) scale(0.98)";

    // Create host element
    var hostContainer = document.createElement("div");
    hostContainer.id = "resolvdesk-widget-root";
    hostContainer.setAttribute("aria-live", "polite");
    // Lenis smooth scroll and host scroll interception prevention
    hostContainer.setAttribute("data-lenis-prevent", "true");
    hostContainer.setAttribute("data-lenis-prevent-wheel", "true");
    hostContainer.setAttribute("data-lenis-prevent-touch", "true");
    hostContainer.setAttribute("data-scroll-prevent", "true");
    document.body.appendChild(hostContainer);

    // Attach native Shadow DOM
    var shadow = hostContainer.attachShadow({ mode: "open" });

    // Helper functions for dynamic contrast & color extraction
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

    // Dynamic contrast calculation for primaryColor
    var primaryRgb = getRgbFromColor(primaryColor);
    var primaryContrast = "#ffffff";
    if (primaryRgb) {
      var pLum = calcLuminance(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      if (pLum > 155) {
        primaryContrast = "#09090b";
      }
    }

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
      "  --rd-primary-contrast: " + primaryContrast + ";",
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
      "  --rd-bg: #09090b;",
      "  --rd-surface: #141416;",
      "  --rd-surface-border: rgba(255, 255, 255, 0.09);",
      "  --rd-text: #f4f4f5;",
      "  --rd-text-muted: #a1a1aa;",
      "  --rd-bubble-assistant-bg: #18181b;",
      "  --rd-bubble-assistant-text: #f4f4f5;",
      "  --rd-bubble-assistant-border: rgba(255, 255, 255, 0.08);",
      "  --rd-form-bg: #141416;",
      "  --rd-form-border: rgba(255, 255, 255, 0.1);",
      "  --rd-input-bg: #09090b;",
      "  --rd-input-border: rgba(255, 255, 255, 0.12);",
      "  --rd-badge-bg: #27272a;",
      "  --rd-badge-text: #e4e4e7;",
      "  --rd-ticket-bg: rgba(34, 197, 94, 0.12);",
      "  --rd-ticket-border: rgba(34, 197, 94, 0.3);",
      "  --rd-ticket-text: #86efac;",
      "  --rd-window-border: rgba(255, 255, 255, 0.1);",
      "  --rd-window-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);",
      "}",
      "@media (prefers-color-scheme: dark) {",
      "  :host(:not([data-theme='light'])) .rd-chat-window:not(.rd-light),",
      "  :host(:not([data-theme='light'])) {",
      "    --rd-bg: #09090b;",
      "    --rd-surface: #141416;",
      "    --rd-surface-border: rgba(255, 255, 255, 0.09);",
      "    --rd-text: #f4f4f5;",
      "    --rd-text-muted: #a1a1aa;",
      "    --rd-bubble-assistant-bg: #18181b;",
      "    --rd-bubble-assistant-text: #f4f4f5;",
      "    --rd-bubble-assistant-border: rgba(255, 255, 255, 0.08);",
      "    --rd-form-bg: #141416;",
      "    --rd-form-border: rgba(255, 255, 255, 0.1);",
      "    --rd-input-bg: #09090b;",
      "    --rd-input-border: rgba(255, 255, 255, 0.12);",
      "    --rd-badge-bg: #27272a;",
      "    --rd-badge-text: #e4e4e7;",
      "    --rd-ticket-bg: rgba(34, 197, 94, 0.12);",
      "    --rd-ticket-border: rgba(34, 197, 94, 0.3);",
      "    --rd-ticket-text: #86efac;",
      "    --rd-window-border: rgba(255, 255, 255, 0.1);",
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
      "  " + vSide + ": " + launcherOffset + "px;",
      "  " + hSide + ": " + parsedPlacement.offsetX + "px;",
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
      "  stroke: currentColor;",
      "  fill: none;",
      "  stroke-width: 2;",
      "  stroke-linecap: round;",
      "  stroke-linejoin: round;",
      "  transition: transform 0.2s ease, opacity 0.2s ease;",
      "}",
      ".rd-launcher .rd-icon-close {",
      "  stroke-width: 2.5;",
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
      "  " + vSide + ": " + chatOffset + "px;",
      "  " + hSide + ": " + parsedPlacement.offsetX + "px;",
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
      "  overscroll-behavior: contain;",
      "  -webkit-overflow-scrolling: touch;",
      "  z-index: var(--rd-z);",
      "  opacity: 0;",
      "  transform: " + initialTransform + ";",
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
      "  padding: 14px 18px;",
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
      ".rd-header-avatar {",
      "  width: 34px;",
      "  height: 34px;",
      "  border-radius: 50%;",
      "  background: rgba(255, 255, 255, 0.2);",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  flex-shrink: 0;",
      "  color: inherit;",
      "}",
      ".rd-header-avatar svg {",
      "  width: 20px;",
      "  height: 20px;",
      "  stroke: currentColor;",
      "  fill: none;",
      "  stroke-width: 2;",
      "  stroke-linecap: round;",
      "  stroke-linejoin: round;",
      "}",
      ".rd-header-status-row {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 5px;",
      "  margin-top: 2px;",
      "}",
      ".rd-status-dot {",
      "  width: 7px;",
      "  height: 7px;",
      "  border-radius: 50%;",
      "  background: #22c55e;",
      "  display: inline-block;",
      "}",
      ".rd-status-text {",
      "  font-size: 11px;",
      "  opacity: 0.85;",
      "  line-height: 1;",
      "}",
      ".rd-header-title {",
      "  font-size: 15px;",
      "  font-weight: 600;",
      "  letter-spacing: -0.01em;",
      "  line-height: 1.2;",
      "}",
      ".rd-header-actions {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 6px;",
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
      "  overscroll-behavior: contain;",
      "  -webkit-overflow-scrolling: touch;",
      "  touch-action: pan-y;",
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
      "  font-size: 14px;",
      "  line-height: 1.55;",
      "  word-break: break-word;",
      "  white-space: pre-wrap;",
      "}",
      ".rd-bubble strong {",
      "  font-weight: 600;",
      "}",
      ".rd-bubble em {",
      "  font-style: italic;",
      "}",
      ".rd-bubble code {",
      "  background: rgba(0, 0, 0, 0.08);",
      "  padding: 2px 5px;",
      "  border-radius: 4px;",
      "  font-size: 13px;",
      "  font-family: monospace;",
      "}",
      ".rd-dark .rd-bubble code {",
      "  background: rgba(255, 255, 255, 0.12);",
      "}",
      ".rd-bubble a.rd-link {",
      "  color: inherit;",
      "  text-decoration: underline;",
      "  text-underline-offset: 2px;",
      "  font-weight: 500;",
      "}",
      ".rd-assistant .rd-bubble a.rd-link {",
      "  color: var(--rd-primary);",
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
      "/* Contact Card / Offline State */",
      ".rd-contact-card {",
      "  margin-top: 6px;",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: 8px;",
      "  width: 100%;",
      "}",
      ".rd-contact-support-btn {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  gap: 8px;",
      "  background: var(--rd-primary);",
      "  color: var(--rd-primary-contrast);",
      "  text-decoration: none;",
      "  font-size: 13px;",
      "  font-weight: 500;",
      "  padding: 10px 14px;",
      "  border-radius: 8px;",
      "  transition: opacity 0.15s ease, transform 0.1s ease;",
      "  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);",
      "}",
      ".rd-contact-support-btn:hover {",
      "  opacity: 0.92;",
      "  transform: translateY(-1px);",
      "}",
      ".rd-contact-support-btn:active {",
      "  transform: translateY(0);",
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
      '<svg class="rd-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '  <path d="M12 8V4H8"></path>',
      '  <rect width="16" height="12" x="4" y="8" rx="2"></rect>',
      '  <path d="M2 14h2"></path>',
      '  <path d="M20 14h2"></path>',
      '  <path d="M15 13v2"></path>',
      '  <path d="M9 13v2"></path>',
      "</svg>",
      '<svg class="rd-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
      '  <path d="M18 6 6 18"></path>',
      '  <path d="m6 6 12 12"></path>',
      "</svg>",
    ].join("");
    shadow.appendChild(launcherBtn);

    var chatWindow = document.createElement("div");
    chatWindow.className = "rd-chat-window";
    chatWindow.setAttribute("role", "dialog");
    chatWindow.setAttribute("aria-label", "ResolvDesk Customer Support Chat");
    // Lenis smooth scroll and host scroll interception prevention
    chatWindow.setAttribute("data-lenis-prevent", "true");
    chatWindow.setAttribute("data-lenis-prevent-wheel", "true");
    chatWindow.setAttribute("data-lenis-prevent-touch", "true");
    chatWindow.setAttribute("data-scroll-prevent", "true");
    chatWindow.innerHTML = [
      '<header class="rd-header">',
      '  <div class="rd-header-title-box">',
      '    <div class="rd-header-avatar">',
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>',
      '    </div>',
      '    <div>',
      '      <div class="rd-header-title">' + escapeHtml(botName) + "</div>",
      '      <div class="rd-header-status-row">',
      '        <span class="rd-status-dot" aria-hidden="true"></span>',
      '        <span class="rd-status-text">Online &bull; Instant AI</span>',
      '      </div>',
      '    </div>',
      "  </div>",
      '  <div class="rd-header-actions">',
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

    if (messageContainer) {
      messageContainer.setAttribute("data-lenis-prevent", "true");
      messageContainer.setAttribute("data-lenis-prevent-wheel", "true");
      messageContainer.setAttribute("data-lenis-prevent-touch", "true");
      messageContainer.setAttribute("data-scroll-prevent", "true");
    }

    // Scroll isolation: prevent host page scroll hijacking (Lenis, Locomotive, native chaining)
    chatWindow.addEventListener(
      "wheel",
      function (e) {
        e.stopPropagation();
        if (messageContainer) {
          var canScrollUp = messageContainer.scrollTop > 0;
          var canScrollDown =
            messageContainer.scrollTop + messageContainer.clientHeight <
            messageContainer.scrollHeight - 1;

          if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
            messageContainer.scrollTop += e.deltaY;
          }
          // Always prevent default when hovering over the widget so the host page never moves
          e.preventDefault();
        }
      },
      { passive: false }
    );

    var touchStartY = 0;
    chatWindow.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches && e.touches[0]) {
          touchStartY = e.touches[0].clientY;
        }
        e.stopPropagation();
      },
      { passive: true }
    );

    chatWindow.addEventListener(
      "touchmove",
      function (e) {
        e.stopPropagation();
        if (messageContainer && e.touches && e.touches[0]) {
          var touchCurrentY = e.touches[0].clientY;
          var deltaY = touchStartY - touchCurrentY;
          touchStartY = touchCurrentY;

          var canScrollUp = messageContainer.scrollTop > 0;
          var canScrollDown =
            messageContainer.scrollTop + messageContainer.clientHeight <
            messageContainer.scrollHeight - 1;

          if ((deltaY < 0 && canScrollUp) || (deltaY > 0 && canScrollDown)) {
            messageContainer.scrollTop += deltaY;
            e.preventDefault();
          } else {
            e.preventDefault();
          }
        }
      },
      { passive: false }
    );

    // --- Automatic Theme Detection & Reactive Syncing ---

    function extractHostColors() {
      var candidates = [
        document.body,
        document.documentElement,
        document.querySelector("main"),
        document.querySelector("#__next"),
        document.querySelector("#root"),
        document.body ? document.body.firstElementChild : null,
      ];
      var hostBg = null;
      var hostFg = null;
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (!el) continue;
        var computed = window.getComputedStyle(el);
        if (computed) {
          if (!hostBg) {
            var bg = getRgbFromColor(computed.backgroundColor);
            if (bg && bg.a > 0.2) {
              hostBg = bg;
            }
          }
          if (!hostFg) {
            var fg = getRgbFromColor(computed.color);
            if (fg && fg.a > 0.5) {
              hostFg = fg;
            }
          }
        }
        if (hostBg && hostFg) break;
      }
      return { bg: hostBg, fg: hostFg };
    }

    function applyAdaptiveHostPalette(theme) {
      var host = extractHostColors();
      if (!host.bg) {
        chatWindow.style.removeProperty("--rd-bg");
        chatWindow.style.removeProperty("--rd-surface");
        chatWindow.style.removeProperty("--rd-surface-border");
        chatWindow.style.removeProperty("--rd-bubble-assistant-bg");
        chatWindow.style.removeProperty("--rd-bubble-assistant-border");
        chatWindow.style.removeProperty("--rd-bubble-assistant-text");
        chatWindow.style.removeProperty("--rd-form-bg");
        chatWindow.style.removeProperty("--rd-form-border");
        chatWindow.style.removeProperty("--rd-input-bg");
        chatWindow.style.removeProperty("--rd-text");
        chatWindow.style.removeProperty("--rd-text-muted");
        return;
      }

      var bgLum = calcLuminance(host.bg.r, host.bg.g, host.bg.b);
      if (theme === "dark" && bgLum < 128) {
        var r = host.bg.r;
        var g = host.bg.g;
        var b = host.bg.b;

        var sR = Math.min(255, r + 14);
        var sG = Math.min(255, g + 14);
        var sB = Math.min(255, b + 14);

        var bubR = Math.min(255, r + 22);
        var bubG = Math.min(255, g + 22);
        var bubB = Math.min(255, b + 22);

        chatWindow.style.setProperty("--rd-bg", "rgb(" + r + "," + g + "," + b + ")");
        chatWindow.style.setProperty("--rd-surface", "rgb(" + sR + "," + sG + "," + sB + ")");
        chatWindow.style.setProperty("--rd-surface-border", "rgba(255, 255, 255, 0.09)");
        chatWindow.style.setProperty("--rd-bubble-assistant-bg", "rgb(" + bubR + "," + bubG + "," + bubB + ")");
        chatWindow.style.setProperty("--rd-bubble-assistant-border", "rgba(255, 255, 255, 0.08)");
        chatWindow.style.setProperty("--rd-form-bg", "rgb(" + sR + "," + sG + "," + sB + ")");
        chatWindow.style.setProperty("--rd-form-border", "rgba(255, 255, 255, 0.1)");
        chatWindow.style.setProperty("--rd-input-bg", "rgb(" + r + "," + g + "," + b + ")");

        if (host.fg) {
          chatWindow.style.setProperty("--rd-text", "rgb(" + host.fg.r + "," + host.fg.g + "," + host.fg.b + ")");
          chatWindow.style.setProperty("--rd-bubble-assistant-text", "rgb(" + host.fg.r + "," + host.fg.g + "," + host.fg.b + ")");
          chatWindow.style.setProperty("--rd-text-muted", "rgba(" + host.fg.r + "," + host.fg.g + "," + host.fg.b + ", 0.65)");
        }
      } else if (theme === "light" && bgLum >= 128) {
        if (bgLum < 248) {
          chatWindow.style.setProperty("--rd-bg", "rgb(" + host.bg.r + "," + host.bg.g + "," + host.bg.b + ")");
        } else {
          chatWindow.style.removeProperty("--rd-bg");
        }
        chatWindow.style.removeProperty("--rd-surface");
        chatWindow.style.removeProperty("--rd-surface-border");
        chatWindow.style.removeProperty("--rd-bubble-assistant-bg");
        chatWindow.style.removeProperty("--rd-bubble-assistant-border");
        chatWindow.style.removeProperty("--rd-bubble-assistant-text");
        chatWindow.style.removeProperty("--rd-form-bg");
        chatWindow.style.removeProperty("--rd-form-border");
        chatWindow.style.removeProperty("--rd-input-bg");
        if (host.fg) {
          chatWindow.style.setProperty("--rd-text", "rgb(" + host.fg.r + "," + host.fg.g + "," + host.fg.b + ")");
          chatWindow.style.setProperty("--rd-bubble-assistant-text", "rgb(" + host.fg.r + "," + host.fg.g + "," + host.fg.b + ")");
          chatWindow.style.setProperty("--rd-text-muted", "rgba(" + host.fg.r + "," + host.fg.g + "," + host.fg.b + ", 0.65)");
        }
      }
    }

    function detectHostTheme() {
      // Check explicit data-theme attribute on widget script tag
      var scriptTheme = scriptTag ? scriptTag.getAttribute("data-theme") : null;
      if (scriptTheme) {
        var stLower = scriptTheme.trim().toLowerCase();
        if (stLower === "dark" || stLower === "light") {
          return stLower;
        }
      }

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

      // 4. Check host localStorage (standard-theme-mode, next-themes, tailwind, etc.)
      try {
        var hostSavedTheme = 
          localStorage.getItem("standard-theme-mode") ||
          localStorage.getItem("next-theme") ||
          localStorage.getItem("theme") || 
          localStorage.getItem("theme-mode") ||
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
      applyAdaptiveHostPalette(theme);
    }

    function syncTheme() {
      var detected = detectHostTheme();
      applyTheme(detected);
    }

    // Initial theme sync
    syncTheme();

    // Re-check theme on hydration intervals (for host React/Next-themes hydration)
    setTimeout(function () { syncTheme(); }, 150);
    setTimeout(function () { syncTheme(); }, 600);
    setTimeout(function () { syncTheme(); }, 1600);

    // Live reactive theme sync via MutationObserver
    try {
      var themeObserver = new MutationObserver(function () {
        syncTheme();
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
            syncTheme();
          });
        } else if (mql.addListener) {
          mql.addListener(function () {
            syncTheme();
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

    function formatMarkdown(str) {
      if (!str) return "";
      var escaped = escapeHtml(str);
      // Bold: **text**
      escaped = escaped.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
      // Italic: *text* (excluding already matched bold)
      escaped = escaped.replace(/(^|[^\*])\*([^\*\n]+?)\*([^\*]|$)/g, "$1<em>$2</em>$3");
      // Inline code: `code`
      escaped = escaped.replace(/`([^`\n]+)`/g, "<code>$1</code>");
      // Links: [text](url)
      escaped = escaped.replace(
        /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s\)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="rd-link">$1</a>'
      );
      return escaped;
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
      if (role === "visitor") {
        bubble.textContent = content;
      } else {
        bubble.innerHTML = formatMarkdown(content);
      }
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

    // Check if widget is active or offline
    var isWidgetActive = config.is_active !== false;

    if (!isWidgetActive) {
      var statusDot = chatWindow.querySelector(".rd-status-dot");
      var statusText = chatWindow.querySelector(".rd-status-text");
      if (statusDot) statusDot.style.background = "#ef4444";
      if (statusText) statusText.textContent = "Offline";

      textInput.disabled = true;
      textInput.placeholder = "Support is temporarily offline...";
      sendBtn.disabled = true;

      var contactEmail = config.support_email || "mabdullahqureshi583@gmail.com";

      renderMessage(
        "assistant",
        "Support is temporarily offline. We are unable to accept new messages at this time. Please contact our support team directly for assistance."
      );

      var contactRow = document.createElement("div");
      contactRow.className = "rd-message-row rd-assistant";
      contactRow.innerHTML = [
        '<div class="rd-contact-card">',
        '  <a href="mailto:' + escapeHtml(contactEmail) + '" class="rd-contact-support-btn">',
        '    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '      <rect width="20" height="16" x="2" y="4" rx="2"/>',
        '      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
        '    </svg>',
        '    <span>Contact Support (' + escapeHtml(contactEmail) + ')</span>',
        '  </a>',
        '</div>',
      ].join("");
      messageContainer.appendChild(contactRow);
      scrollToBottom();
    } else {
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
    }

    // Submit user message and stream response via SSE
    inputForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!isWidgetActive) return;
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
            if (response.status === 403) {
              textInput.disabled = true;
              textInput.placeholder = "Support is temporarily offline...";
              sendBtn.disabled = true;
              throw new Error("Support is temporarily offline.");
            }
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
              assistantBubble.innerHTML = formatMarkdown(accumulatedText);
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
            assistantBubble.innerHTML = formatMarkdown(accumulatedText);

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

          if (streamErr.message && streamErr.message.indexOf("Support is temporarily offline") !== -1) {
            assistantBubble.textContent = "Support is temporarily offline. We are unable to take messages at this time.";
            textInput.disabled = true;
            sendBtn.disabled = true;
            return;
          }

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
