# Implementation Plan: Frontend Authentication, Onboarding & Dashboard Shell

**Branch**: `005-frontend-auth-dashboard` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-frontend-auth-dashboard/spec.md`

---

## Summary

Deliver the complete client-side authentication, self-service business owner registration, session persistence, server-side route protection, and responsive dashboard shell for ResolvDesk. Connects the Better Auth client (`auth-client.ts`) with Next.js 16 App Router, establishes an Axios API gateway (`api-client.ts`) forwarding RS256 Bearer JWTs to FastAPI, configures edge `middleware.ts` for route defense, and constructs a responsive dashboard layout strictly adhering to Constitution Principle VII (semantic design tokens and conflict-free theming).

---

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20+, Next.js 16.3.4 (App Router, Turbopack), React 19.2.8  
**Primary Dependencies**: Better Auth (`better-auth` + `better-auth/react`), Shadcn UI (Base Nova + Lucide), Tailwind CSS v4, `react-hook-form`, `zod` v4, `@hookform/resolvers`, `axios`, `next-themes`, `sonner`  
**Storage**: PostgreSQL on Neon (Better Auth session and user tables), httpOnly secure session cookies  
**Testing**: Next.js production compilation (`npm run build`), TypeScript typecheck, manual quickstart verification scenarios  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge), responsive desktop & mobile  
**Project Type**: Full-stack web application (Next.js 16 App Router)  
**Performance Goals**: Page initial load < 1s, theme transition < 50ms, registration flow completion < 30s  
**Constraints**: Zero hard-coded palette classes (Principle VII), httpOnly session storage (no localStorage auth tokens), server-side route protection (middleware)  
**Scale/Scope**: 1 landing page, 2 auth pages (Login, Register), 1 dashboard shell layout with responsive sidebar/header, 3 placeholder module pages (Documents, Inbox, Widget), 3 utility modules (`auth-client.ts`, `api-client.ts`, `middleware.ts`)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Constitutional Requirement | Status | Verification Detail |
|---|---|---|
| **I. Strict Multi-Tenant Isolation** | **PASS** | Dashboard displays only the organization resolved from the verified JWT `/api/v1/me` endpoint. |
| **II. Grounded AI & Zero Hallucination** | **PASS** | N/A for authentication and navigation shell. |
| **III. Continuous Human Safety Net** | **PASS** | N/A for authentication shell; prepares the inbox route for support tickets. |
| **IV. Frictionless & Secure Widget** | **PASS** | N/A for dashboard shell; prepares widget settings view for key management. |
| **V. Layered Architecture & Boundary Defense** | **PASS** | Strict schema validation at the Zod layer; edge middleware route defense before page rendering. |
| **VI. Provider-Agnostic AI Layer** | **PASS** | N/A for frontend authentication. |
| **VII. Strict Semantic Theming & Global Tokens** | **PASS** | All layouts, components, and pages consume semantic CSS variables (`bg-background`, `text-foreground`, `border-border`, etc.) from `globals.css`. |
| **Session Security Constraint** | **PASS** | Better Auth session stored exclusively in httpOnly cookies; no client-accessible localStorage tokens. |
| **Server Route Protection Constraint** | **PASS** | Edge `middleware.ts` intercepts unauthenticated requests to `/dashboard/*` before HTML rendering. |
| **UI State Rigor Constraint** | **PASS** | Dashboard routes include explicit `loading.tsx` skeletons and `error.tsx` boundaries. |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-frontend-auth-dashboard/
├── plan.md              # This implementation plan
├── research.md          # Technical choices and rationale
├── data-model.md        # Form schemas, domain entities, and state transitions
├── quickstart.md        # End-to-end verification scenarios
├── contracts/           # Route maps, API schemas, and component contracts
│   └── auth_and_dashboard_contracts.md
├── checklists/          # Specification quality checklist
│   └── requirements.md
└── tasks.md             # Implementation tasks (generated via /speckit-tasks)
```

### Source Code Layout

```text
frontend/
├── app/
│   ├── layout.tsx                   # Root layout with ThemeProvider and Sonner Toaster
│   ├── page.tsx                     # Public product landing page (redirects if authenticated)
│   ├── (auth)/
│   │   ├── layout.tsx               # Auth layout (centered glassmorphic container)
│   │   ├── login/
│   │   │   └── page.tsx             # Owner login page
│   │   └── register/
│   │       └── page.tsx             # Owner registration page
│   └── dashboard/
│       ├── layout.tsx               # Protected dashboard shell (Sidebar + Header + Session)
│       ├── loading.tsx              # Dashboard root loading skeleton
│       ├── error.tsx                # Dashboard root error boundary
│       ├── page.tsx                 # Dashboard overview page
│       ├── documents/
│       │   └── page.tsx             # Knowledge base module route
│       ├── conversations/
│       │   └── page.tsx             # Conversations inbox module route
│       └── widget/
│           └── page.tsx             # Widget configuration module route
├── components/
│   ├── auth/
│   │   ├── login-form.tsx           # Client form with React Hook Form + Zod
│   │   └── register-form.tsx        # Client form with atomic registration
│   ├── dashboard/
│   │   ├── sidebar.tsx              # Collapsible semantic sidebar
│   │   ├── header.tsx               # App bar with breadcrumb, theme toggle, and user menu
│   │   └── user-menu.tsx            # Owner profile dropdown with sign-out
│   ├── theme-provider.tsx           # next-themes wrapper client component
│   ├── theme-toggle.tsx             # Light/dark mode toggle button
│   └── ui/                          # 61 shadcn UI components (already installed)
├── lib/
│   ├── auth.ts                      # Better Auth server configuration (existing)
│   ├── auth-client.ts               # Better Auth client hooks & JWT token getter
│   ├── api-client.ts                # Axios client with JWT Bearer interceptor
│   └── utils.ts                     # cn() class merge helper (existing)
└── middleware.ts                    # Edge route protection for /dashboard/* and /
```

---

## Phases & Execution Plan

### Phase 0: Research & Technical Foundations
- Resolved all technical unknowns: Better Auth client configuration, Next.js Edge middleware session verification, Axios Bearer interceptor, and semantic theming.
- Documented decisions in `research.md`.

### Phase 1: Design & Contracts
- Defined Zod validation schemas (`registerSchema`, `loginSchema`) and domain interfaces in `data-model.md`.
- Documented route access contracts, API handshakes, and UI component contracts in `contracts/auth_and_dashboard_contracts.md`.
- Formulated testable verification scenarios in `quickstart.md`.

### Phase 2: Implementation (Scheduled for `/speckit-tasks` and `/speckit-implement`)
1. **Core Client Auth & Network Infrastructure**:
   - Create `frontend/lib/auth-client.ts` and `frontend/lib/api-client.ts`.
   - Implement `frontend/middleware.ts` for server-side route protection.
   - Configure `frontend/components/theme-provider.tsx` and integrate into `frontend/app/layout.tsx`.
2. **Authentication Pages**:
   - Implement `frontend/components/auth/register-form.tsx` with atomic registration call to `POST /api/v1/registration/complete`.
   - Implement `frontend/components/auth/login-form.tsx` with generic credential defense.
   - Build `(auth)/register/page.tsx` and `(auth)/login/page.tsx`.
3. **Public Landing Page**:
   - Update `frontend/app/page.tsx` with product landing hero and direct CTAs.
4. **Dashboard Shell & Layout**:
   - Build `frontend/components/dashboard/sidebar.tsx` and `header.tsx`.
   - Build `frontend/app/dashboard/layout.tsx` with `loading.tsx` and `error.tsx`.
   - Build `frontend/app/dashboard/page.tsx` overview screen.
   - Build placeholder routes for `/documents`, `/conversations`, and `/widget`.
5. **Validation & Build Verification**:
   - Run `npm run build` to verify zero compile or type errors.
   - Run quickstart scenarios.
