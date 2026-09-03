# Global Development Standards

These rules apply to every project, regardless of stack. Always follow them
by default — don't wait to be asked.

## Backend

- Structure all backend code in three layers, even for small features:
  **router** (HTTP concerns only — no business logic) → **service**
  (business logic, validation rules) → **repo** (database queries only,
  no logic). Never put query logic directly in a router.
- Every mutation that touches more than one table/step must be wrapped
  in a transaction.
- Never trust client input past the API boundary — validate type,
  length, and format at the schema layer (e.g. Pydantic) before it
  reaches the service layer.
- Any query filtering by ownership (e.g. `WHERE user_id = ...`) must
  do so at the database query level, not by fetching and checking in
  application code — this is a tenant-isolation requirement, not a
  style preference.
- Default to indexing foreign keys and any column used in frequent
  WHERE/JOIN clauses.
- Log at appropriate levels (DEBUG for internal detail, INFO for
  normal events, WARNING for recovered issues, ERROR for failures) —
  never use print statements for anything beyond a throwaway test.

## Frontend (Next.js specifically)

- Before writing any page, explicitly decide and state: is this a
  Server Component or Client Component, and why? Default to Server
  Components; only mark something `"use client"` when it genuinely
  needs interactivity, state, or browser APIs.
- Auth tokens must be stored in httpOnly cookies, never in
  localStorage, unless there's a stated cross-origin constraint that
  makes this genuinely impossible — and if so, say so explicitly
  rather than defaulting to localStorage silently.
- Use real Next.js route protection (middleware.ts) rather than
  client-side useEffect + redirect checks, whenever the auth token is
  accessible server-side.
- For any data mutation, use the framework's actual cache invalidation
  mechanism (e.g. Server Actions + revalidatePath/revalidateTag in
  Next.js) rather than only updating local client state and hoping it
  stays in sync.
- Always include error.tsx and loading.tsx (or the framework
  equivalent) for any route that fetches data.
- Don't leave stub/placeholder handlers (e.g. empty onClick functions)
  without flagging them explicitly as incomplete — never let a
  no-op silently look finished.

## General working style

- Before generating a large amount of code for a new feature, state
  the architecture/approach in a sentence or two first, so the
  approach can be corrected before code is written, not after.
- When following a tutorial, assignment spec, or template, explicitly
  flag when a choice is being made for convenience/speed rather than
  because it's the best practice — don't silently ship the easier
  path as if it were the only path.
- Prefer fewer, well-separated files/functions over one large file
  that mixes concerns, even for small features.
