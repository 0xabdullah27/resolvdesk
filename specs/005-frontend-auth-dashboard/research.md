# Research & Technical Decisions: Frontend Authentication, Onboarding & Dashboard Shell

**Feature**: `005-frontend-auth-dashboard`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Better Auth Client Configuration in Next.js 16 App Router

### Decision
Implement `frontend/lib/auth-client.ts` using `createAuthClient` from `better-auth/react` configured with the `jwtClient()` plugin.

### Rationale
- **Single Source of Truth**: Better Auth manages credentials, hashing, and sessions on the Next.js server while issuing RS256-signed JWTs for the FastAPI resource server.
- **Client Hooks**: Provides pre-typed hooks `useSession()`, `signIn.email()`, `signUp.email()`, and `signOut()` with React 19 support.
- **Token Acquisition**: The `authClient.token()` method enables on-demand acquisition of RS256 JWT tokens for outgoing FastAPI requests without exposing private keys.

### Alternatives Considered
- *Custom NextAuth / Auth.js*: Lacks native RS256 JWKS exposure plugin out-of-the-box and requires significant custom JWT signing boilerplate compared to Better Auth's native `jwt()` plugin.
- *Manual JWT management in localStorage*: Violates ResolvDesk Constitution Security Constraints (tokens must remain in httpOnly cookies).

---

## 2. Server-Side Route Protection (`middleware.ts`)

### Decision
Implement Next.js Edge Middleware in `frontend/middleware.ts` that checks the session cookie (`better-auth.session_token`) before allowing access to `/dashboard/*`.

### Rationale
- **Constitution Compliance**: Enforces the requirement that privileged routes MUST be protected at the server boundary before rendering or serving protected resources.
- **Zero Client-Side Flash**: Prevents the brief flash of dashboard content that occurs when relying on client-side `useEffect` redirects.
- **Bi-directional Redirection**:
  - Unauthenticated access to `/dashboard/*` redirects to `/login?callbackUrl=<requested_path>`.
  - Authenticated access to `/` or `/login` or `/register` redirects immediately to `/dashboard`.

### Alternatives Considered
- *Client-side `useEffect` + `useRouter` redirects*: Leaves protected DOM elements exposed during initial hydration and fails WCAG and security standards.

---

## 3. Centralized API Gateway & Bearer Token Interceptor (`api-client.ts`)

### Decision
Create `frontend/lib/api-client.ts` encapsulating an Axios instance with request and response interceptors.

### Rationale
- **Automatic Authorization**: Attaches `Authorization: Bearer <token>` to all calls directed at FastAPI (`http://localhost:8000/api/v1`).
- **Token Resolution**: In the browser, fetches the current valid JWT via `authClient.token()`; in server actions, forwards the session cookie/header.
- **Graceful Error Handling**: Automatically catches HTTP 401/403 responses and triggers session invalidation or user-friendly redirect.

---

## 4. Strict Semantic Theming per Constitution Principle VII

### Decision
Configure `next-themes` with `attribute="class"` wrapping the application in `app/layout.tsx`, driving the semantic CSS variables defined in `app/globals.css`.

### Rationale
- **Constitution Principle VII**: All component markup MUST consume semantic design tokens (`bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-muted-foreground`, etc.). Direct use of hard-coded palette utilities (e.g. `slate-400`, `sky-300`, `zinc-900`) is strictly prohibited.
- **Instant Theme Switching**: Changing themes simply toggles the `.dark` class on the `<html>` root element. All 61 shadcn components automatically update instantaneously with zero color clashes or CSS specificity wars.

---

## 5. Form Handling & Schema Validation

### Decision
Use `react-hook-form` with `@hookform/resolvers/zod` and `zod` schemas for all user inputs.

### Rationale
- **Type Safety**: Derives TypeScript interfaces directly from Zod schemas (`z.infer<typeof schema>`).
- **Inline Validation**: Immediate client-side validation on blur/submit (e.g., minimum 8-character password, email syntax, URL formatting if provided).
- **Double-Submission Defense**: Integrates with Shadcn `Button` loading states to disable submit actions while requests are in flight.
