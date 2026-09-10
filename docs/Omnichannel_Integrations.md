# 🌐 ResolvDesk: Omnichannel Messaging Architecture & Execution Plan

> **Vision**: Decouple the core ResolvDesk AI knowledge and escalation engine from the web widget so businesses can provide instant, document-grounded support across **WhatsApp**, **Telegram**, **Instagram**, and **Email** from a single unified workspace.

---

## 🏗️ 1. How Real Production Systems Manage This Behind the Scenes

In real-world enterprise platforms (like Zendesk Sunshine, Twilio Flex, MessageBird, or Intercom), you **never** build a separate AI engine for each platform.

Instead, the system uses an **Adapter Pattern (Channel-Agnostic Core)**:

```
                  ┌──────────────────────┐
                  │ External Platforms   │
                  └──────────┬───────────┘
                             │
     ┌───────────────┬───────┴───────┬───────────────┐
     ▼               ▼               ▼               ▼
[WhatsApp Meta] [Telegram Bot] [Instagram Graph] [Inbound Email]
 (Webhook JSON)  (Webhook JSON)  (Webhook JSON)   (SendGrid/SES)
     │               │               │               │
     └───────────────┼───────────────┼───────────────┘
                     ▼
       ┌───────────────────────────┐
       │   Channel Inbound Adapter │
       │  (Normalizes to Standard  │
       │    InboundMessage Schema) │
       └─────────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │ Core ResolvDesk Engine    │
       │ - Intent Classification   │
       │ - Session & User Linking  │
       │ - RAG Vector Search       │
       │ - LLM Generation          │
       │ - Human Ticket Escalation │
       └─────────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │  Channel Outbound Adapter │
       │  (Formats for WhatsApp/   │
       │   Telegram/Instagram/Mail)│
       └───────────────────────────┘
```

### The 4 Core Architectural Principles:

1. **Normalized Message Object**:
   Regardless of whether a message arrives via a WhatsApp payload, Telegram update, or incoming email, the adapter translates it into one internal data model:
   ```json
   {
     "organization_id": "org_123",
     "channel": "telegram", // "whatsapp" | "telegram" | "instagram" | "email"
     "external_user_id": "+923001234567", // Phone number, Telegram chat_id, or email
     "sender_name": "Abdullah",
     "content": "Do you deliver to Lahore?",
     "session_id": "conv_abc"
   }
   ```

2. **Session / Identity Mapping**:
   The system maps the external user identifier (`phone_number`, `chat_id`, or `email`) to an active `Conversation` session in the database. If a conversation was idle for >24 hours, a new session begins.

3. **Asynchronous Webhook Acknowledgement**:
   WhatsApp and Telegram require webhook responses within **2–3 seconds**, otherwise they retry and spam your server.
   * Real systems acknowledge the webhook immediately (`HTTP 200 OK`).
   * The RAG retrieval + LLM generation is handed off to a background task/worker.
   * Once generated, the reply is dispatched via an outbound API call (`POST https://api.telegram.org/...` or Meta Graph API).

4. **Channel-Specific Formatting**:
   * **Telegram**: Supports MarkdownV2 / HTML formatting and inline buttons.
   * **WhatsApp**: Supports simple bold/italic (`*bold*`, `_italic_`) and interactive quick-reply buttons (limited to 3 buttons or list menus).
   * **Email**: Requires HTML email formatting with branded signature and ticket thread headers (`Re: [Ticket #492]`).

---

## 🎯 2. The 4 Channels in Detail

### Channel 1: ✈️ Telegram Bot Integration
* **How it works**:
  * The business owner creates a Telegram bot via `@BotFather` in 30 seconds and gets a `BOT_TOKEN`.
  * In ResolvDesk dashboard, the owner pastes their `BOT_TOKEN`.
  * ResolvDesk registers a webhook: `https://api.resolvdesk.online/api/v1/webhooks/telegram/{org_id}`.
  * When any customer texts the Telegram bot, ResolvDesk receives the update, runs RAG, and replies via `sendMessage`.
* **Escalation**:
  * When human escalation is triggered, ResolvDesk captures the visitor's Telegram handle (`@username`) and creates a dashboard ticket.

### Channel 2: 📱 WhatsApp Business API (Meta Cloud API)
* **How it works**:
  * Uses Meta Cloud API (official WhatsApp Business Platform).
  * Webhook listener receives `messages` payloads from Meta.
  * ResolvDesk verifies the Meta webhook signature (`hub.verify_token` & `hub.challenge`).
  * ResolvDesk queries the organization's knowledge base and replies using `messages` endpoint.
* **Customer Service Window**:
  * WhatsApp allows free-form bot replies within a **24-hour service window** following the customer's last message.
* **Escalation**:
  * The visitor's verified phone number is captured automatically without them needing to type it.

### Channel 3: 📸 Instagram Direct Messages (DMs)
* **How it works**:
  * Leverages Meta Graph API for Instagram Messaging.
  * Connects the business owner's Instagram Professional / Creator account.
  * Webhooks listen for `messaging_postbacks` and incoming direct messages.
  * Answers frequent customer DMs regarding pricing, store hours, shipping, and order inquiries.

### Channel 4: ✉️ Inbound Support Email Channel
* **How it works**:
  * Each organization gets a unique inbound address (e.g., `support+{org_id}@resolvdesk.online` or a forwarding rule from `support@merchant.com`).
  * An email parser (SendGrid Inbound Parse, AWS SES, or Postmark) forwards incoming customer emails as webhook JSON.
  * ResolvDesk parses email body, extracts clean thread text, and performs RAG retrieval.
  * System can operate in two modes:
    1. **Auto-Reply Mode**: Dispatches grounded answer back to the customer's email.
    2. **Draft & Review Mode**: Pre-drafts an answer with document citations and leaves it in the owner dashboard for 1-click approval.

---

## 🚀 3. Where Should We Start?

### 🏆 Recommended First Step: **Telegram Bot Integration**

| Factor | Telegram Bot | WhatsApp Business | Instagram DMs | Inbound Email |
|---|---|---|---|---|
| **Setup Speed** | **5 minutes** | Days (Meta verification) | Days (Facebook Page link) | 1–2 hours |
| **API Cost** | **100% Free** | Per-conversation Meta fees | Free (Meta rate limits) | Email provider fees |
| **Testing Friction** | Zero verification required | Needs test phone numbers | Needs test Instagram accounts | Needs DNS/MX records |
| **Developer Ergonomics**| Clean JSON, fast webhooks | Complex Meta Graph API | Complex Meta Graph API | Multipart MIME parsing |

### Why Telegram is the Ideal Starting Point:
1. **Immediate Execution**: Anyone can create a bot with `@BotFather` in 30 seconds. No business verification, phone number porting, or credit card required.
2. **Builds the Inbound/Outbound Engine**: The core architecture you build for Telegram (normalized message models, webhook handler, background dispatcher, chat session mapper) will be **80% reusable** for WhatsApp, Instagram, and Email.
3. **Instant Live Testing**: You can text your bot from your own phone and watch the live RAG answers and escalation tickets stream in real time.
