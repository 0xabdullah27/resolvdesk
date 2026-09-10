# Interface Contract: SSE Chat Events & Intent Signals

**Feature**: `014-chat-intent-handling`  
**Date**: 2026-09-10  
**Status**: Active

## 1. Public Visitor Chat SSE Endpoint
- **URL**: `POST /api/v1/widget/chat`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: text/event-stream`
- **Request Body**:
  ```json
  {
    "widget_key": "wdgt_live_019283...",
    "message": "Hello there!",
    "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
  ```

---

## 2. Server-Sent Events (SSE) Stream Specification

### 2.1 Event: `start`
Emitted immediately when conversation session is established.
```http
event: start
data: {"conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"}
```

### 2.2 Event: `token`
Emitted progressively for each generated chunk. For Tier 1 greetings, words are yielded with a tiny delay or single chunk for instant responsiveness.
```http
event: token
data: {"token": "Hello! "}
```

### 2.3 Event: `intent`
New SSE event emitted alongside the response to signal the client UI about the classified intent.
```http
event: intent
data: {
  "intent": "GREETING",
  "tier": 1,
  "confidence": 1.0
}
```

### 2.4 Event: `escalate_suggestion`
Emitted when explicit escalation intent or ungrounded knowledge fallback triggers.
```http
event: escalate_suggestion
data: {
  "suggest_escalation": true,
  "reason": "explicit_request"
}
```

### 2.5 Event: `done`
Emitted at the conclusion of the stream.
```http
event: done
data: {
  "citations": [],
  "intent": "GREETING",
  "total_tokens": 24
}
```
