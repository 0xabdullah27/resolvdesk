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

## 3. Server Actions Architecture for Backend Integration

### Decision
Implement Next.js Server Actions (`frontend/actions/auth-actions.ts`) and a server-side native `fetch` utility (`frontend/lib/backend-api.ts`) for all mutations and backend communications, completely eliminating client-side Axios and browser-side token handling.

### Rationale
- **Zero Browser Token Exposure**: The browser never sees, requests, or stores JWT tokens. Tokens are acquired server-side via Better Auth (`auth.api.getToken`) and forwarded server-to-server (`Next.js Server ──► FastAPI`).
- **No CORS Constraints**: The browser communicates only with `http://localhost:3000` (its own origin). All requests to FastAPI (`http://localhost:8000`) happen server-to-server.
- **Native Cache Invalidation**: Server Actions immediately trigger `revalidatePath("/dashboard")` upon completion, fulfilling the [AGENTS.md](file:///d:/AbdullahQureshi/workspace/resolvdesk/AGENTS.md) cache invalidation mandate.
- **Chat Streaming Exemption**: When live chat streaming is added in a future milestone, the visitor widget will use the browser's native `fetch()` with `ReadableStream` against the public endpoint (which requires zero auth tokens).

### Alternatives Considered
- *Client-side Axios with in-memory JWT interceptor*: Unnecessarily complex; requires token refresh loops, CORS configuration, and exposes tokens to browser memory.

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
