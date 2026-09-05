# Feature Specification: Frontend Authentication, Onboarding & Dashboard Shell

**Feature Branch**: `005-frontend-auth-dashboard`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "frontend client authentication and dashboard foundation: complete better-auth client integration, login, registration, route protection, and responsive dashboard shell with semantic theming"

## Clarifications

### Session 2026-09-05
- Q: How should the root path (`/`) behave when visited by authenticated owners versus unauthenticated visitors? → A: Render a clean product welcome page for unauthenticated visitors, and automatically redirect authenticated owners to `/dashboard`.
- Q: Should the "Forgot Password" / Password Reset UI flow be included in Feature 005, or deferred to a subsequent security milestone? → A: Defer password reset UI to a subsequent milestone; focus Feature 005 strictly on Registration, Login, Session Management, and Dashboard Shell.
- Q: Should the business owner registration form include an optional "Website URL" field during onboarding? → A: Include an optional "Website URL" input on the registration form; validate URL format if entered, but allow owners to skip it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Self-Service Business Owner Registration & Workspace Provisioning (Priority: P1) 🎯 MVP

A new business owner arrives at ResolvDesk seeking an automated support assistant for their website. They navigate to the sign-up page and submit their full name, email address, secure password (minimum 8 characters), and business or store name. The system validates the inputs, provisions their owner account and unique business organization workspace atomically, establishes an active authenticated session, and immediately transitions the owner directly to their new dashboard with a welcoming confirmation.

**Why this priority**: Core self-service onboarding gate. Without user registration, no business owner can claim a workspace, upload documents, or obtain an embeddable widget.

**Independent Test**: Navigate to `/register`, fill out the form with unique credentials and a business name, and submit. Verify that the owner is immediately redirected to `/dashboard` with their business name displayed in the workspace header, with zero manual database intervention.

**Acceptance Scenarios**:

1. **Given** a new visitor with valid registration details,  
   **When** they submit the registration form,  
   **Then** their account and organization are provisioned, a secure session is issued, and they are redirected to `/dashboard`.

2. **Given** a visitor attempting registration with an email that is already registered,  
   **When** they submit the form,  
   **Then** the submission is rejected with a clear, user-friendly notification stating the email is in use, and the form remains pre-filled (except password) without losing user progress.

3. **Given** a visitor entering a password with fewer than 8 characters,  
   **When** they attempt to submit,  
   **Then** the client displays an inline validation error immediately without contacting the backend.

---

### User Story 2 - Secure Owner Authentication, Session Persistence & Logout (Priority: P1)

An existing business owner visits ResolvDesk to review recent visitor chats or update their FAQ documents. They enter their registered email and password. Upon successful verification, the system restores their session and redirects them to their dashboard. If invalid credentials are provided, the system displays a generic error message preventing account enumeration. The owner can securely log out from any dashboard screen, terminating their session and returning to the public sign-in page.

**Why this priority**: Necessary for ongoing administrative access and security compliance. Owners must be able to log back into their dashboard reliably and terminate sessions securely on shared devices.

**Independent Test**: Navigate to `/login`, submit valid owner credentials, verify arrival at `/dashboard`. Click "Sign Out" from the profile menu, verify session is terminated and subsequent visits to `/dashboard` immediately redirect to `/login`.

**Acceptance Scenarios**:

1. **Given** an owner with valid registered credentials,  
   **When** they enter their email and password on `/login`,  
   **Then** they are authenticated and redirected to `/dashboard`.

2. **Given** an owner entering an incorrect password or non-existent email,  
   **When** they attempt to sign in,  
   **Then** the system displays a generic "Invalid email or password" alert without indicating whether the email exists.

3. **Given** an authenticated owner viewing any dashboard page,  
   **When** they trigger the "Sign Out" action,  
   **Then** their session is destroyed and the browser navigates back to `/login`.

---

### User Story 3 - Protected Dashboard Shell & Primary Navigation (Priority: P1)

An authenticated owner accesses their workspace. They are greeted by a responsive application shell featuring a collapsable sidebar navigation, an organization switcher/badge showing their business name, an owner profile menu, and primary navigation links to all core modules: Knowledge Base, Conversations Inbox, Widget Customizer, and Settings. Any unauthenticated attempt to access any dashboard path is intercepted at the server boundary and redirected to the login page with a return URL preserved.

**Why this priority**: Delivers the unified home for the entire application experience. All subsequent feature screens (documents, inbox, widget settings) live inside this shared, responsive layout.

**Independent Test**: Attempt accessing `/dashboard` directly in an incognito/unauthenticated session; verify redirection to `/login`. Log in; verify the dashboard shell renders with responsive sidebar, active navigation indicators, business name, and quick links.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor navigating directly to `/dashboard/documents`,  
   **When** the request is received,  
   **Then** the server immediately redirects to `/login?callbackUrl=/dashboard/documents`.

2. **Given** an authenticated owner in desktop viewport,  
   **When** they view the dashboard shell,  
   **Then** the sidebar displays navigation items for Overview, Documents, Conversations, and Widget Settings, with clear active state styling and owner organization name.

3. **Given** an authenticated owner on a mobile or narrow viewport,  
   **When** they tap the menu button,  
   **Then** a responsive drawer/sheet opens containing the navigation links without breaking layout.

---

### User Story 4 - Seamless API Gateway, Theme Toggle & UI States (Priority: P2)

The owner switches between light and dark modes according to their preference, with the entire interface immediately reflecting the updated visual theme without color conflicts, jarring flashes, or contrast degradation. Background data-fetching requests automatically attach the authenticated security context to backend API endpoints, displaying dedicated loading skeletons while retrieving data and informative error boundaries if services are temporarily unavailable.

**Why this priority**: Ensures polished usability, visual accessibility, and seamless integration between frontend client components and backend APIs without boilerplate token handling.

**Independent Test**: Toggle between light and dark modes; verify all surfaces, typography, and borders update according to the global semantic theme token contract. Simulate a slow or failed profile query; verify loading skeletons and error boundaries display gracefully.

**Acceptance Scenarios**:

1. **Given** the dashboard in light mode,  
   **When** the owner toggles the theme switch to dark mode,  
   **Then** the interface transitions smoothly to dark mode using semantic CSS tokens without any hard-coded palette clashes.

2. **Given** any authenticated view awaiting profile or workspace data,  
   **When** data is loading,  
   **Then** structural loading skeletons are displayed preserving layout stability.

---

### Edge Cases

- **Session Expiration During Inactivity**: If an owner's session expires while viewing the dashboard, subsequent actions prompt re-authentication without losing unsaved form input where possible.
- **Direct Deep-Link Access**: Navigating directly to nested protected routes (e.g., `/dashboard/conversations/xyz`) preserves the destination path and redirects back upon successful authentication.
- **Backend Service Interruption**: If the backend resource server is unreachable during registration or profile fetch, the client displays an informative "Service temporarily unavailable" banner with a retry action instead of a blank screen or unhandled exception.
- **Rapid Double Form Submissions**: Submit buttons enter a disabled, spinning loading state immediately upon click to prevent duplicate account provisioning requests.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated self-service registration interface accepting owner full name, email address, password, organization/business name, and an optional website URL.
- **FR-002**: System MUST validate input constraints client-side before submission: email format, minimum 8-character password, non-empty full name, non-empty business name, and valid URL syntax if a website URL is provided.
- **FR-003**: System MUST execute atomic multi-tenant registration, establishing both the authentication session and provisioning the owner organization profile.
- **FR-004**: System MUST provide a secure login interface accepting email and password with generic error handling on authentication failure.
- **FR-005**: System MUST store authenticated sessions in secure httpOnly cookies adhering to project security constraints.
- **FR-006**: System MUST enforce server-side route protection (middleware) redirecting unauthenticated visitors attempting to access `/dashboard/*` to `/login`.
- **FR-007**: System MUST provide a persistent authenticated client instance capable of resolving current session status, signing in, signing out, and acquiring signed tokens for backend resource requests.
- **FR-008**: System MUST provide an HTTP API client that automatically resolves and injects the authentication bearer token into outgoing backend requests.
- **FR-009**: System MUST provide a responsive dashboard layout shell comprising a sidebar navigation, top application bar, organization identifier, theme toggle, and user profile action menu.
- **FR-010**: System MUST render dedicated loading skeleton states for all asynchronous data-fetching pages.
- **FR-011**: System MUST provide error boundary views allowing recovery or retry on failed requests.
- **FR-012**: System MUST provide a light/dark theme switch that applies semantic theme variables across the entire application without component-level styling conflicts.
- **FR-013**: All user interface components MUST strictly consume semantic theme tokens mapped to root CSS variables per Constitution Principle VII, prohibiting hard-coded palette utilities.
- **FR-014**: System MUST render a product landing page at `/` with direct "Sign In" and "Get Started" entry points for unauthenticated visitors, and automatically route authenticated owners visiting `/` directly to `/dashboard`.

### Key Entities

- **Owner Profile**: Represents the authenticated business user, including full name, verified email, and account status (`active`, `suspended`).
- **Organization Workspace**: The tenant entity to which the owner belongs, including display name, workspace identifier, and provisioned date.
- **Auth Session**: The active, secure session context managing credential lifecycle, access tokens, and logout operations.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New business owners can complete the entire registration flow and land inside their active dashboard in under 30 seconds.
- **SC-002**: 100% of protected `/dashboard/*` routes reject unauthenticated access at the server boundary prior to rendering.
- **SC-003**: Theme toggle between light and dark mode completes instantly (< 50ms) with zero visual glitches or hard-coded color clashes.
- **SC-004**: Form validation feedback displays inline within 100ms of user input blur or submission.
- **SC-005**: Zero unhandled client-side runtime errors during network interruption; error boundaries and retry triggers render on 100% of failure scenarios.

---

## Assumptions

- **Authentication Authority**: Next.js serves as the authentication server via Better Auth, while FastAPI serves as the stateless resource server.
- **Target Viewports**: Responsive layout supports desktop screens (1024px+), tablets (768px - 1023px), and mobile devices (< 768px).
- **No Third-Party Social Logins in v1**: Owner authentication is strictly email and password for the initial release per System Specification.
- **Password Reset UI Deferred**: The self-service password recovery flow is deferred to a follow-up security milestone; Feature 005 focuses on registration, login, session persistence, and dashboard shell.
- **Email Verification Deferred**: Self-service registration automatically logs the user into their workspace immediately without blocking on an outbound email verification loop in v1.
