<!--
Sync Impact Report:
- Version change: Uninitialized -> 1.0.0
- Principles defined:
  - I. Strict Multi-Tenant Isolation
  - II. Grounded AI & Zero Hallucination
  - III. Continuous Human Safety Net
  - IV. Frictionless & Secure Widget
  - V. Layered Architecture & Boundary Defense
- Added sections:
  - Security & Data Privacy Constraints
  - Quality Gates & Testing Standards
  - Governance
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

## Security & Data Privacy Constraints
- **Session Security**: Authentication tokens for business owners MUST be stored in httpOnly, Secure cookies; never in client-accessible storage (localStorage/sessionStorage).
- **Client Route Protection**: Privileged routes MUST be protected at the server boundary (e.g., server middleware) before rendering or serving protected resources.
- **Data Lifecycle**: Visitor conversations are retained for 90 days after inactivity; tickets are retained for 1 year after resolution. Account deletion MUST remove all associated organization artifacts within 24 hours.
- **Streaming by Default**: Visitor chat responses SHOULD be streamed progressively to minimize perceived latency and uphold responsiveness targets (< 2s time-to-first-token).

## Quality Gates & Testing Standards
- **Automated Verification**: Every feature branch and pull request MUST include comprehensive integration and unit tests covering domain services, tenant query isolation, and schema validation.
- **Async & Contract Testing**: API contracts, vector ingestion flows, and escalation triggers MUST be verified via automated test suites prior to merge.
- **UI State Rigor**: Every data-fetching route or interactive component MUST implement explicit error boundaries (`error.tsx`) and loading states (`loading.tsx`). Stubs or no-op handlers MUST NOT be left unmarked in production code.

## Governance
- This Constitution supersedes all informal practices and serves as the highest architectural and quality authority for ResolvDesk.
- Any amendment requires formal documentation, impact assessment, and a corresponding version increment following semantic versioning (MAJOR for removals/redefinitions, MINOR for additions, PATCH for clarifications).
- All pull requests, code reviews, and automated agent workflows MUST verify compliance against these principles. Use `AGENTS.md` for runtime operational instructions.

**Version**: 1.0.0 | **Ratified**: 2026-09-04 | **Last Amended**: 2026-09-04
