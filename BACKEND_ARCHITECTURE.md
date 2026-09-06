# ResolvDesk Backend Architecture

Comprehensive architectural overview, subsystem workflows, data models, and design patterns powering the ResolvDesk backend resource server.

---

## 1. Architectural Principles & Technology Stack

The ResolvDesk backend is built as a **stateless, multi-tenant AI resource server** prioritizing strict tenant isolation, asynchronous I/O, and layered separation of concerns.

### Core Stack
* **Language & Runtime:** Python 3.12+ (Asyncio)
* **API Framework:** [FastAPI](https://fastapi.tiangolo.com/) (ASGI via Uvicorn)
* **Relational Database:** [PostgreSQL](https://www.postgresql.org/) (Neon Serverless PostgreSQL via `asyncpg`)
* **ORM & Data Modeling:** [SQLModel](https://sqlmodel.tiangolo.com/) / [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async Engine & Session)
* **Migrations:** [Alembic](https://alembic.sqlalchemy.org/)
* **Vector Database:** [Qdrant](https://qdrant.tech/) (Qdrant Cloud managed cluster on AWS, storing 1024-dimensional dense vectors with payload indexing)
* **Embeddings Engine:** [Cohere v3](https://cohere.com/) (`embed-english-v3.0`, 1024-dim) via custom async HTTP client in `embedding_service.py` (provider-agnostic, also supports OpenAI-compatible `/v1/embeddings`)
* **LLM Reasoning & Chat:** [Mistral AI](https://mistral.ai/) (`open-mistral-7b`) via custom async HTTP streaming client in `llm_service.py` (provider-agnostic, connects to any OpenAI-compatible `/chat/completions` endpoint)
* **Authentication:** Full-stack Better Auth integration via asymmetric JWT verification (`PyJWKClient` reading public JWKS from Next.js Auth Server)

---

## 2. The 3-Tier Layered Architecture

Every backend feature adheres to a strict 3-tier boundary. Logic is never mixed between layers:

```mermaid
graph TD
    Client["Clients<br/>(Storefront Visitor Widget / Merchant Dashboard)"]
    
    subgraph FastAPI_Backend ["FastAPI Application (app/)"]
        subgraph Tier1 ["1. Presentation Layer (app/routers/)"]
            R_Reg["registration.py"]
            R_Org["organizations.py"]
            R_Doc["documents.py"]
            R_Wid["widget.py"]
            R_Conv["conversations.py"]
            R_Ana["analytics.py"]
        end

        subgraph Middleware_Security ["Cross-Cutting Concerns (app/core/)"]
            MW_Auth["auth.py<br/>(PyJWKClient JWT Validation)"]
            MW_Rate["rate_limiter.py<br/>(Sliding Window Token Bucket)"]
            MW_Cors["CORSMiddleware & PNA<br/>(Origin & Loopback Control)"]
            MW_Log["logging.py<br/>(Correlation ID Middleware)"]
        end

        subgraph Tier2 ["2. Domain Service Layer (app/services/)"]
            S_Reg["registration_service.py"]
            S_Org["organization_service.py"]
            S_Wid["widget_service.py"]
            S_Doc["document_service.py & ingestion_service.py"]
            S_Chat["chat_service.py (RAG & SSE Streaming)"]
            S_LLM["llm_service.py & embedding_service.py"]
            S_Conv["owner_conversation_service.py"]
            S_Ana["analytics_service.py"]
        end

        subgraph Tier3 ["3. Data Access / Repository Layer (app/repos/)"]
            Repo_Org["organization_repo.py"]
            Repo_Wid["widget_repo.py"]
            Repo_Doc["document_repo.py"]
            Repo_Conv["conversation_repo.py"]
            Repo_Vec["vector_repo.py (Qdrant Client)"]
            Repo_Ana["analytics_repo.py"]
        end
    end

    subgraph Data_Stores ["Data Stores"]
        DB_Postgres[("Neon PostgreSQL<br/>(Relational State)")]
        DB_Qdrant[("Qdrant Cloud Vector DB<br/>(1024-dim Knowledge Chunks)")]
        External_LLM["Cohere v3 & Mistral AI<br/>(1024-dim Embeddings & Streaming LLM)"]
    end

    Client -->|HTTP / SSE| Middleware_Security
    Middleware_Security --> Tier1
    Tier1 --> Tier2
    Tier2 --> Tier3
    Tier2 --> External_LLM
    Repo_Org & Repo_Wid & Repo_Doc & Repo_Conv & Repo_Ana --> DB_Postgres
    Repo_Vec --> DB_Qdrant
```

### Layer Responsibilities

| Layer | Path | Responsibility | Constraints |
| :--- | :--- | :--- | :--- |
| **Presentation (Router)** | `app/routers/` | HTTP request dispatching, URL param parsing, Pydantic input/output validation, HTTP status codes. | **No database queries.** No business rules. Only calls services. |
| **Service** | `app/services/` | Business workflows, multi-table transactions, tenant isolation enforcement, RAG orchestration, SSE streaming. | Agnostic of HTTP headers/request objects. Uses typed schemas and repos. |
| **Repository** | `app/repos/` | Database persistence, SQLModel / SQLAlchemy queries, Qdrant vector operations. | **No business logic.** Every tenant query must filter by `organization_id`. |
| **Core** | `app/core/` | Database engine pooling, JWT cryptographic verification, error handlers, structured logging. | Reusable utilities shared across the entire backend. |

---

## 3. Database Entity Relationship Model

The relational database enforces strict multi-tenant relationships anchored on `organizations.id`:

```mermaid
erDiagram
    ORGANIZATION ||--o{ OWNER : "employs"
    ORGANIZATION ||--|| WIDGET_CONFIGURATION : "provisions"
    ORGANIZATION ||--o{ DOCUMENT : "owns"
    DOCUMENT ||--o{ DOCUMENT_CHUNK : "chunks into"
    ORGANIZATION ||--o{ CONVERSATION : "records"
    CONVERSATION ||--o{ MESSAGE : "contains"

    ORGANIZATION {
        uuid id PK
        string display_name
        string website_url
        datetime created_at
        datetime updated_at
    }

    OWNER {
        uuid id PK
        uuid organization_id FK
        string email UK
        string full_name
        string status
        datetime created_at
        datetime updated_at
    }

    WIDGET_CONFIGURATION {
        uuid id PK
        uuid organization_id FK,UK
        string widget_key UK
        string previous_widget_key
        datetime grace_expires_at
        string primary_color
        string bot_display_name
        string welcome_message
        string widget_placement
        string allowed_origins
        datetime created_at
        datetime updated_at
    }

    DOCUMENT {
        uuid id PK
        uuid organization_id FK
        string filename
        string original_filename
        string file_type
        int file_size
        string status
        int chunk_count
        datetime created_at
    }

    DOCUMENT_CHUNK {
        uuid id PK
        uuid document_id FK
        uuid organization_id FK
        int chunk_index
        string content
        string qdrant_point_id UK
        datetime created_at
    }

    CONVERSATION {
        uuid id PK
        uuid organization_id FK
        string visitor_session_id
        string visitor_email
        boolean is_escalated
        string ticket_status
        string escalation_reason
        datetime created_at
        datetime updated_at
    }

    MESSAGE {
        uuid id PK
        uuid conversation_id FK
        string role
        string content
        string citations_json
        boolean is_fallback
        datetime created_at
    }
```

---

## 4. Core Subsystems & Data Flows

### Subsystem A: Merchant Self-Service Onboarding

When a new store merchant signs up via `/register`, the backend executes an atomic multi-table registration:

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Merchant Store Owner
    participant NextAction as Next.js Server Action
    participant RegRouter as registration.py
    participant RegService as registration_service.py
    participant OrgRepo as organization_repo.py
    participant WidgetRepo as widget_repo.py
    participant NeonDB as Neon PostgreSQL

    Merchant->>NextAction: Submit name, email, password, store website
    NextAction->>RegRouter: POST /api/v1/auth/register
    RegRouter->>RegService: register_tenant(payload)
    
    Note over RegService: Begin atomic database transaction
    RegService->>RegService: Extract clean domain (e.g. "mystore.com")
    RegService->>OrgRepo: create_organization(name, website_url)
    OrgRepo->>NeonDB: INSERT INTO organizations
    
    RegService->>OrgRepo: create_owner(email, organization_id)
    OrgRepo->>NeonDB: INSERT INTO owners
    
    RegService->>WidgetRepo: create_for_organization(allowed_origins="mystore.com, localhost")
    WidgetRepo->>NeonDB: INSERT INTO widget_configurations
    
    Note over RegService: Commit transaction (All or Nothing)
    RegService-->>RegRouter: Owner & Organization DTO
    RegRouter-->>NextAction: 201 Created
    NextAction-->>Merchant: Account provisioned & Logged In
```

---

### Subsystem B: Knowledge Base Document Ingestion & Vector Indexing

Merchants upload store policies, catalogs, and documentation (PDF, Markdown, DOCX, TXT) to educate their AI assistant:

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Store Merchant
    participant DocRouter as documents.py
    participant IngestService as ingestion_service.py
    participant Parser as File Parsers (PDF/DOCX/MD/TXT)
    participant Chunker as chunker_service.py
    participant Embedder as embedding_service.py
    participant VectorRepo as vector_repo.py (Qdrant)
    participant DocRepo as document_repo.py (Postgres)

    Merchant->>DocRouter: POST /api/v1/documents/upload (Multi-part)
    DocRouter->>IngestService: ingest_file(file, organization_id)
    
    IngestService->>Parser: Parse raw bytes into normalized text
    Parser-->>IngestService: Clean plain text
    
    IngestService->>Chunker: Split into overlapping semantic chunks (500 tokens, 100 overlap)
    Chunker-->>IngestService: List of text chunks
    
    IngestService->>Embedder: Generate dense embeddings in batch (Cohere embed-english-v3.0)
    Embedder-->>IngestService: 1024-dimensional vector array
    
    par Dual Storage Persistence
        IngestService->>VectorRepo: Upsert vectors with payload {organization_id, document_id, text}
        VectorRepo->>Qdrant: Store in tenant collection with payload index
    and
        IngestService->>DocRepo: Save Document & DocumentChunk metadata
        DocRepo->>Postgres: INSERT INTO documents & document_chunks
    end
    
    DocRouter-->>Merchant: 201 Document Indexed Successfully
```

---

### Subsystem C: Visitor Live Chat & Vector RAG Streaming

When a visitor interacts with the chat widget on an external storefront:

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Store Visitor
    participant Widget as Embeddable widget.js
    participant ChatRouter as widget.py
    participant ChatService as chat_service.py
    participant VectorRepo as vector_repo.py (Qdrant)
    participant LLM as Mistral AI / LLM Service
    participant ConvRepo as conversation_repo.py (Postgres)

    Visitor->>Widget: Types question ("What is your refund policy?")
    Widget->>ChatRouter: POST /api/v1/widget/chat (Headers: X-Widget-Key, Origin)
    
    ChatRouter->>ChatService: stream_visitor_message(widget_key, origin, message)
    
    Note over ChatService: 1. Verify Origin against allowed_origins
    alt Origin not authorized
        ChatService-->>Widget: 403 Forbidden ("Domain not authorized")
    end

    Note over ChatService: 2. Rate Limiting Check (Sliding Window)
    
    ChatService->>VectorRepo: Query Qdrant with filter: {organization_id == tenant_id}
    VectorRepo-->>ChatService: Top matching chunks with similarity scores

    alt Highest Score < Threshold (0.55)
        ChatService-->>Widget: Stream standard fallback + escalate suggestion
    else High Confidence Match (Score >= 0.55)
        ChatService->>LLM: Stream grounded prompt (chunks + 10-turn history)
        loop Token-by-token SSE
            LLM-->>ChatService: Token chunk
            ChatService-->>Widget: event: token, data: {"token": "..."}
        end
        ChatService-->>Widget: event: citation, data: {"citations": [...]}
        ChatService-->>Widget: event: done
    end

    ChatService->>ConvRepo: Persist Conversation, User Message & Assistant Message
```

---

### Subsystem D: Human Escalation & Support Inbox

If a customer's query cannot be answered by documentation or if the customer requests human help:

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Store Visitor
    participant Widget as Chat Widget
    participant ChatRouter as widget.py (/escalate)
    participant ConvRepo as conversation_repo.py
    actor Merchant as Store Merchant
    participant Dashboard as Owner Dashboard (/conversations)

    Visitor->>Widget: Clicks "Speak with a Human Agent" & submits email + note
    Widget->>ChatRouter: POST /api/v1/widget/chat/escalate
    ChatRouter->>ConvRepo: Update Conversation: is_escalated=True, ticket_status="open", visitor_email=email
    ChatRouter-->>Widget: 200 OK (Ticket # created)
    
    Merchant->>Dashboard: Views Conversations Inbox
    Dashboard->>ChatRouter: GET /api/v1/conversations?status=open
    ChatRouter->>ConvRepo: Query conversations WHERE organization_id = tenant_id AND is_escalated = True
    ConvRepo-->>Dashboard: Return escalated conversations list
    
    Merchant->>Dashboard: Updates status ("in_progress" / "resolved")
    Dashboard->>ChatRouter: PATCH /api/v1/conversations/{id}
```

---

## 5. Security & Isolation Architecture

### 1. Database Tenant Isolation
Every database query in the repository layer strictly includes the owner's `organization_id` in the SQL `WHERE` clause:
```python
# Enforced pattern across all repos
query = select(Model).where(Model.organization_id == current_tenant_id)
```
Tenants cannot read, write, update, or delete data belonging to another organization.

### 2. Qdrant Vector Isolation
Vectors are tagged with the `organization_id` payload attribute. During search, a mandatory filter is applied:
```python
query_filter = Filter(
    must=[FieldCondition(key="organization_id", match=MatchValue(value=str(organization_id)))]
)
```
Cross-tenant semantic retrieval is mathematically prevented at the vector index level.

### 3. Widget Domain CORS & Private Network Access (PNA)
* **Allowed Domains:** The widget API verifies the browser's incoming `Origin` and `Referer` headers against the merchant's configured hostnames (`widget.allowed_origins`).
* **No Wildcard Policy:** Wildcard `*` is prohibited in widget configurations to protect merchants' LLM credits from unauthorized embed snippets.
* **Chrome Private Network Access (PNA):** The server returns `Access-Control-Allow-Private-Network: true` on preflights to support local development testing across public and loopback address spaces.

### 4. Zero-Downtime Key Rotation
Merchants can rotate their public widget key from the dashboard at any time. The system establishes a **24-hour dual-key grace window** where both the old and new keys resolve, preventing live storefronts from breaking while script tags are updated.

---

## 6. Directory Structure Reference

```text
backend/app/
├── core/                   # Shared infrastructure & cross-cutting concerns
│   ├── auth.py             # Better Auth JWT & JWKS token verification
│   ├── config.py           # Pydantic environment configuration (Settings)
│   ├── database.py         # Async SQLAlchemy engine & session factory
│   ├── exceptions.py       # Custom domain exceptions
│   ├── logging.py          # Structured logging & Correlation IDs
│   └── rate_limiter.py     # In-memory sliding window rate limiter
├── models/                 # SQLModel relational database entity models
│   ├── organization.py     # Organization tenant entity
│   ├── owner.py            # Store merchant / owner user entity
│   ├── widget.py           # Widget configuration & keys
│   ├── document.py         # Document & DocumentChunk metadata
│   └── conversation.py     # Conversation & Message history
├── schemas/                # Pydantic boundary validation models
│   ├── registration.py     # Self-service signup payloads
│   ├── organization.py     # Profile & widget update requests
│   ├── document.py         # Document upload & listing responses
│   ├── chat.py             # Chat streaming requests & escalation DTOs
│   └── analytics.py        # 30-day KPI and chart aggregate responses
├── repos/                  # Pure database & vector access layer
│   ├── organization_repo.py
│   ├── widget_repo.py
│   ├── document_repo.py
│   ├── conversation_repo.py
│   ├── vector_repo.py      # Qdrant client & payload index management
│   └── analytics_repo.py   # Aggregations & time-series queries
├── services/               # Business logic & AI workflow orchestration
│   ├── registration_service.py
│   ├── organization_service.py
│   ├── widget_service.py
│   ├── document_service.py
│   ├── ingestion_service.py
│   ├── chunker_service.py
│   ├── embedding_service.py
│   ├── llm_service.py
│   ├── chat_service.py     # RAG pipeline & SSE generator
│   ├── owner_conversation_service.py
│   └── analytics_service.py
├── routers/                # FastAPI HTTP route handlers
│   ├── registration.py     # /api/v1/auth/register
│   ├── organizations.py    # /api/v1/organization/*
│   ├── documents.py        # /api/v1/documents/*
│   ├── widget.py           # /api/v1/widget/*
│   ├── conversations.py    # /api/v1/conversations/*
│   └── analytics.py        # /api/v1/analytics/*
└── main.py                 # FastAPI application factory, CORS, and lifespans
```
