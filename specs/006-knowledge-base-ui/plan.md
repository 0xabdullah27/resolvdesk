# Implementation Plan: Knowledge Base & Document Management UI

**Branch**: `006-knowledge-base-ui` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-knowledge-base-ui/spec.md`

---

## Summary

Implement the frontend Knowledge Base & Document Management interface on `/dashboard/documents`. This connects the Next.js 16 App Router dashboard to the existing backend ingestion endpoints (`/api/v1/documents/*`), enabling business owners to drag-and-drop documents (`.pdf`, `.docx`, `.txt`, `.md` up to 10 MB) or type manual FAQs (up to 100,000 characters). The UI features an embedded upload card with sequential batch queueing, real-time 3-second status polling until terminal states (`ready` / `failed`), on-demand slide-over preview sheets from the right edge, permanent atomic deletion with safety confirmations, quota capacity progress tracking, and 100% semantic theme token styling.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+, Next.js 16 App Router (React 19)  
**Primary Dependencies**: `shadcn/ui`, `tailwindcss` (v4), `sonner` (toasts), `lucide-react` (icons), `react-hook-form`, `zod`  
**Storage**: Backend PostgreSQL (Neon via asyncpg) and Qdrant Vector Store via FastAPI resource server; no direct browser persistence  
**Testing**: ESLint, Next.js production build (`npm run build`), contract verification  
**Target Platform**: Responsive Web (Desktop, Tablet, Mobile)  
**Project Type**: Fullstack Web Application (Frontend Dashboard Module)  
**Performance Goals**: File upload initiation in < 1s, preview sheet open < 500ms, status polling interval 3s with self-terminating timers  
**Constraints**: 10 MB file limit, 100k char manual limit, 50-doc quota per organization, zero hard-coded color palette classes (Constitution Principle VII)  
**Scale/Scope**: Up to 50 documents per organization; client-side instant search and status filtering  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|---|---|:---:|
| **I. Strict Multi-Tenant Isolation** | Server Actions resolve Better Auth session token and forward Bearer JWT to FastAPI backend; all database and vector queries filter strictly by `organization_id`. | **PASS** |
| **II. Grounded AI & Zero Hallucination** | Uploaded documents feed the ingestion pipeline (chunking + embedding into Qdrant) so the AI assistant can reference strictly grounded knowledge. | **PASS** |
| **III. Continuous Human Safety Net** | Document status displays failure reasons and guidance when text extraction is unreadable. | **PASS** |
| **IV. Frictionless & Secure Widget** | Widget key and visitor interactions remain decoupled from owner management APIs; all doc endpoints require authenticated owner session. | **PASS** |
| **V. Layered Architecture & Boundary Defense** | Next.js Server Actions validate inputs via Zod before invoking backend API; backend maintains Router -> Service -> Repo layers. | **PASS** |
| **VI. Provider-Agnostic AI Layer** | Backend ingestion uses standard OpenAI-compatible embedding interface configured via environment variables. | **PASS** |
| **VII. Strict Semantic Theming & Tokens** | All components strictly consume semantic tokens (`bg-card`, `text-foreground`, `border-border`, `bg-primary`, `bg-destructive`, etc.). No raw color utilities. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-knowledge-base-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── knowledge_base_ui_contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
frontend/
├── actions/
│   └── document-actions.ts             # Server Actions for /api/v1/documents/*
├── types/
│   └── document.ts                     # DocumentItem, DocumentDetail, DocumentStatus types
├── lib/
│   └── validations/
│       └── document.ts                 # Zod schemas for file and raw text validation
├── components/
│   └── documents/
│       ├── document-upload-card.tsx     # Permanent upload card with File & Manual tabs
│       ├── document-table.tsx          # Documents table with status badges and action menus
│       ├── document-toolbar.tsx        # Search input, status dropdown, capacity tracker
│       ├── document-preview-sheet.tsx  # Slide-over Sheet for metadata and text preview
│       ├── document-delete-dialog.tsx  # AlertDialog confirmation for atomic deletion
│       ├── document-empty-state.tsx    # Clean empty state with call-to-actions
│       └── documents-view.tsx          # Client container with 3s auto-polling state
└── app/
    └── dashboard/
        └── documents/
            ├── page.tsx                # Server Component loading initial doc list
            ├── loading.tsx             # Loading skeleton for /dashboard/documents
            └── error.tsx               # Error boundary for /dashboard/documents
```

**Structure Decision**: Web application layout. Server Actions encapsulate server-to-server JWT propagation and backend communication, keeping client components lean and focused on interactive state, validation, and auto-polling.

---

## Complexity Tracking

> No constitution violations detected. All requirements map directly to established Next.js App Router patterns and existing FastAPI backend endpoints.
