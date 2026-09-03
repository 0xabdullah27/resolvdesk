<!--
Sync Impact Report:
- Version change: 1.1.0 -> 1.2.0
- Principles added: None
- Added rules:
  - Infrastructure: Cross-Store Atomicity (document deletion must be atomic across relational DB + vector store)
  - Security: Owner Data Export Right (CSV/JSON export at any time)
- Modified sections: Infrastructure & Data Layer Constraints, Security & Data Privacy Constraints
- Removed sections: None
- Follow-up TODOs: None
-->

# ResolvDesk Constitution

## Core Principles

### I. Strict Multi-Tenant Isolation
Every piece of data—including documents, chunk embeddings, conversation sessions, and support tickets—belongs strictly to one Organization. Database queries and vector retrieval operations MUST enforce tenant isolation at the query filter level (`WHERE organization_id = ...`) rather than in memory or application-level filtering. Cross-organization data access or leakage is a catastrophic security violation.

### II. Grounded AI & Zero Hallucination
The AI assistant MUST generate responses derived strictly and verifiably from the Organization's uploaded and processed knowledge base documents. If the retrieved context is insufficient, ambiguous, or absent, the AI MUST explicitly acknowledge the limitation and offer human escalation rather than assuming, guessing, or fabricating facts.

### III. Continuous Human Safety Net
Automated conversations MUST never trap visitors in unresolved loops. Human escalation MUST trigger automatically upon explicit user request, negative sentiment detection, sensitive issues (e.g., refunds, disputes), or repeated knowledge fallbacks. Visitors MUST be afforded a seamless path to leave contact details and create an actionable support ticket.

### IV. Frictionless & Secure Widget
The embeddable customer chat widget MUST operate without requiring visitor authentication and MUST NOT expose administrative or private data via public identifiers. The public widget key MUST remain strictly read-only. Chat endpoints MUST enforce abuse prevention controls, including rate limiting (max 30 requests/minute per IP) and input length validation (max 1,000 characters).

### V. Layered Architecture & Boundary Defense
All backend services MUST strictly adhere to a three-layer boundary: **router** (HTTP handling and status codes) -> **service** (domain business logic and validation) -> **repo** (database and vector queries only). Client input MUST be validated at the schema boundary before entering business logic. Multi-table or multi-step mutations MUST be wrapped in transactional units.

### VI. Provider-Agnostic AI Layer
The application MUST communicate with the AI layer through a single, unified API standard (OpenAI-compatible interface). Model switches or provider migrations MUST be executed solely by updating the target API Endpoint and API Key configuration variables. Zero application code changes and zero system downtime are required for a provider or model swap. No business logic, service layer, or repository MUST contain hard-coded references to any specific AI provider SDK or model name.

## Infrastructure & Data Layer Constraints
- **Relational Database**: PostgreSQL (hosted on Neon) is the canonical relational store. All ORM interactions MUST use SQLModel with async sessions via asyncpg.
- **Schema Migrations**: All schema changes MUST be managed through Alembic migration files. Direct `CREATE`/`ALTER` statements against the production database without a tracked migration are prohibited.
- **Connection Management**: Database connections MUST use async connection pooling. Synchronous blocking DB calls in async service or router code are prohibited.
- **Vector Store**: A dedicated vector database is the canonical store for document embeddings. Embeddings MUST NOT be stored as columns in the relational PostgreSQL schema.
- **Cross-Store Atomicity**: Any operation that mutates both the relational store and the vector store (e.g., document deletion) MUST be treated as a single logical unit. If the vector embedding deletion fails, the relational record MUST NOT be committed as deleted, and vice versa. Silent partial-delete states that orphan embeddings or leave stale data queryable are prohibited.

## Security & Data Privacy Constraints
- **Session Security**: Authentication tokens for business owners MUST be stored in httpOnly, Secure cookies; never in client-accessible storage (localStorage/sessionStorage).
- **Client Route Protection**: Privileged routes MUST be protected at the server boundary (e.g., server middleware) before rendering or serving protected resources.
- **Data Lifecycle**: Visitor conversations are retained for 90 days after inactivity; tickets are retained for 1 year after resolution. Account deletion MUST remove all associated organization artifacts within 24 hours.
- **Owner Data Export Right**: The Owner MUST be able to export all of their Organization's data (Documents metadata, Conversations, Tickets) at any time in CSV and JSON formats. This right MUST remain available regardless of account status.
- **Streaming by Default**: Visitor chat responses SHOULD be streamed progressively to minimize perceived latency and uphold responsiveness targets (< 2s time-to-first-token).

## Quality Gates & Testing Standards
- **Automated Verification**: Every feature branch and pull request MUST include comprehensive integration and unit tests covering domain services, tenant query isolation, and schema validation.
- **Async & Contract Testing**: API contracts, vector ingestion flows, and escalation triggers MUST be verified via automated test suites prior to merge.
- **UI State Rigor**: Every data-fetching route or interactive component MUST implement explicit error boundaries (`error.tsx`) and loading states (`loading.tsx`). Stubs or no-op handlers MUST NOT be left unmarked in production code.

## Governance
- This Constitution supersedes all informal practices and serves as the highest architectural and quality authority for ResolvDesk.
- Any amendment requires formal documentation, impact assessment, and a corresponding version increment following semantic versioning (MAJOR for removals/redefinitions, MINOR for additions, PATCH for clarifications).
- All pull requests, code reviews, and automated agent workflows MUST verify compliance against these principles. Use `AGENTS.md` for runtime operational instructions.

**Version**: 1.2.0 | **Ratified**: 2026-09-04 | **Last Amended**: 2026-09-04
