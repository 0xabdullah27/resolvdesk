# Feature Specification: Multi-Tenant Organization & Owner Authentication Foundation

**Feature Branch**: `001-tenant-auth-foundation`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "go with the recommendation and backend first you can now create the specs"

## Clarifications

### Session 2026-09-04
- Q: How long should an authenticated owner session remain valid before requiring the business owner to log in again? (FR-006) → A: 7 days sliding expiration (session refreshes automatically on active use, expiring after 7 consecutive days of inactivity).
- Q: Can multiple business owners register organizations with the same business name, or must organization names/slugs be globally unique? (FR-001) → A: Non-unique display names with internal UUIDs (identities are UUIDs; multiple organizations can share the same business name without rejection).
- Q: Should business owners be able to regenerate (rotate) their public widget key from their organization settings? (FR-005) → A: Rotation with grace period (prior key remains valid for 24 hours after rotation to allow webmasters to update embedded snippets before being revoked).
- Q: How should the system protect owner accounts against brute-force login attempts? (FR-007) → A: IP + email rate limiting (max 5 failed attempts per 15 minutes per IP/email pair before temporary cooldown, preventing denial-of-service lockouts against genuine owners).
- Q: Should multi-user team invitations (adding support agents/staff) and social OAuth logins (Google/GitHub) be explicitly designated as out-of-scope for this foundation release? (FR-001) → A: Yes, both out-of-scope (strictly single-owner email/password; team invitations and OAuth deferred to future releases).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Business Owner Account & Organization Registration (Priority: P1)

A new business owner registers for ResolvDesk by providing their personal and business details. In a single atomic step, the system creates their owner account, establishes their dedicated organization workspace, and provisions their default customer support widget configuration so they can immediately begin configuring their business assistant.

**Why this priority**: Without an owner account and an associated organization, no tenant data (knowledge base documents, chat sessions, tickets, widget settings) can be created, isolated, or queried. This is the foundational prerequisite for the entire platform.

**Independent Test**: Can be fully tested by submitting valid registration details (name, email, secure password, business name). Verifies that the owner record, organization record, and initial default widget configuration are simultaneously created, and an authenticated session is established without any manual intervention.

**Acceptance Scenarios**:

1. **Given** an unregistered visitor with a unique email address, **When** they submit their full name, email, password (at least 8 characters), and organization name, **Then** the system creates their Owner profile, their Organization workspace, and a default Widget configuration, and returns an authenticated active session.
2. **Given** a registration attempt with an email that is already registered, **When** submission is processed, **Then** the system rejects registration with a clear validation message and creates no duplicate records.
3. **Given** a registration attempt where any creation step fails (e.g. organization name invalid or downstream provisioning error), **When** failure occurs, **Then** the entire operation rolls back atomically so no orphaned owner or partial organization records remain.

---

### User Story 2 - Secure Owner Login & Session Management (Priority: P1)

An existing business owner logs into their account using their email and password to access their organization dashboard, manage support operations, and securely log out when finished.

**Why this priority**: Allows business owners to securely re-enter their workspace, authenticate their identity, and protect sensitive business data and customer tickets from unauthorized access.

**Independent Test**: Can be tested independently by logging in with valid credentials, verifying that an authenticated session is established and subsequent protected actions recognize the owner's organization, followed by logging out to invalidate the session.

**Acceptance Scenarios**:

1. **Given** a registered owner with valid credentials, **When** they submit their registered email and correct password, **Then** the system grants access, issues a secure authenticated session, and resolves the owner's organization context.
2. **Given** an invalid login attempt (wrong password or unregistered email), **When** submitted, **Then** the system denies access with a generic "Invalid credentials" notification without revealing whether the email address exists.
3. **Given** an authenticated owner session, **When** the owner triggers logout, **Then** the system terminates the session immediately, preventing subsequent access without re-authentication.
4. **Given** 5 consecutive failed login attempts for an email and IP pair within a 15-minute window, **When** another login attempt is made, **Then** the system rejects the request with a rate-limiting cooldown response without locking the account globally across unaffected IP addresses.

---

### User Story 3 - Organization Profile & Default Widget Provisioning (Priority: P2)

An authenticated business owner views their organization profile details and verifies their initial support widget settings (including their public widget key, default branding color, and welcome greeting).

**Why this priority**: Confirms that tenant isolation is active and gives the business owner immediate access to their organization identifier and widget embed parameters.

**Independent Test**: Can be tested by retrieving the organization profile with an active session, verifying that the returned organization and widget configuration match the authenticated owner's tenant and no other organization's data is exposed.

**Acceptance Scenarios**:

1. **Given** an authenticated owner, **When** they view their organization profile, **Then** the system returns their business name, creation timestamp, and assigned public widget configuration.
2. **Given** an authenticated owner belonging to Organization A, **When** accessing organization resources, **Then** the system strictly forbids viewing or modifying any resources belonging to Organization B.
3. **Given** an authenticated owner, **When** they trigger a public widget key rotation, **Then** a new primary widget key is generated immediately and the previous key enters a 24-hour grace period during which incoming widget requests with either key are accepted before the previous key is permanently invalidated.

---

### User Story 4 - Account Password Recovery & Security Reset (Priority: P3)

A business owner who forgot their password can initiate a time-limited password reset flow via their verified email address to regain access to their organization.

**Why this priority**: Crucial self-service account recovery mechanism that prevents owners from permanently losing access to their business workspace and customer tickets.

**Independent Test**: Can be tested by requesting a reset for a registered email, confirming a time-limited (15-minute) recovery mechanism is issued, and updating the password to regain account access.

**Acceptance Scenarios**:

1. **Given** a registered owner email, **When** a password reset request is submitted, **Then** a time-limited (15-minute) reset token is generated and recorded.
2. **Given** a valid and unexpired reset token, **When** the owner submits a new compliant password (minimum 8 characters), **Then** the password updates successfully and previous sessions are invalidated.
3. **Given** an expired or invalid reset token, **When** submitted, **Then** the request is rejected with a clear expiration notice.

---

### Edge Cases

- **Concurrent Registration**: Two simultaneous registration requests submitted with the same email must result in exactly one successful registration and one duplicate rejection.
- **Malformed Input**: Passwords shorter than 8 characters or malformed email strings must be rejected at the boundary before any processing.
- **Partial Provisioning Failure**: If the default widget configuration fails to generate during owner registration, the organization and owner records must be cleanly rolled back.
- **Session Token Expiry**: An expired session token (e.g. inactive for more than 7 consecutive days) presented to a protected endpoint must return an immediate unauthorized response and require the owner to log in again.
- **Rotated Widget Key Grace Window**: Chat requests using a deprecated widget key within 24 hours of rotation are accepted, but requests using a deprecated key after 24 hours must be rejected with an invalid key error.
- **Brute-Force Rate Limiting**: Repeated failed login attempts beyond 5 within a 15-minute window per IP and email combination must trigger an immediate rate limit rejection response.
- **Development & Direct Testing**: In local development environments, authorized test sessions must be mockable to enable automated integration testing of organization-scoped workflows without external identity provider dependencies.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow new business owners to register with full name, email address, password, and organization name. Organization display names are non-unique; tenant isolation and identity are strictly established via internal UUIDs.
- **FR-002**: System MUST enforce email uniqueness across all registered accounts.
- **FR-003**: System MUST enforce a minimum password length of 8 characters.
- **FR-004**: System MUST atomically create the Owner record, Organization record, and initial default Widget Configuration within a single transactional boundary during registration.
- **FR-005**: System MUST automatically generate a unique, read-only public widget key for each newly created organization, and support owner-initiated key rotation with a 24-hour grace period during which the prior key remains accepted before permanent revocation.
- **FR-006**: System MUST authenticate registered owners using email and password, issuing an authenticated session with a 7-day sliding expiration policy that refreshes upon user activity and invalidates after 7 consecutive days of inactivity.
- **FR-007**: System MUST return a generic invalid credentials message on failed login attempts without disclosing account existence, and enforce a rate limit of maximum 5 failed attempts per 15 minutes per IP and email combination.
- **FR-008**: System MUST support explicit session termination (logout), immediately revoking active session validity.
- **FR-009**: System MUST enforce strict multi-tenant isolation by verifying that every authenticated operation is strictly scoped to the owner's linked organization.
- **FR-010**: System MUST reject any attempt by an authenticated owner to read or modify another organization's records.
- **FR-011**: System MUST support a 15-minute time-limited password reset request flow for verified email addresses.
- **FR-012**: System MUST provide a development-friendly authentication mechanism allowing independent verification of backend API contracts and organization isolation in automated test suites.

### Key Entities *(include if feature involves data)*

- **Owner / User**: Represents the human account holder. Contains unique email, hashed password credential, full name, account status, and timestamps. Belongs to exactly one Organization.
- **Organization**: Represents the business tenant. Contains unique immutable UUID primary identifier, business display name (non-unique across tenants), creation timestamp, and reference to the primary Owner.
- **Widget Configuration**: Represents the embeddable chat settings for an Organization. Contains unique identifier, organization reference, primary read-only public widget key, optional previous widget key with its 24-hour grace expiration timestamp (`grace_expires_at`), primary brand color (default `#4F46E5`), bot display name (default `"Support Assistant"`), welcome message (default `"Hi! How can I help you today?"`), and widget placement (default `bottom-right`).
- **Auth Session / Token Claim**: Represents an active authenticated session for an owner. Contains subject identifier (`user_id`), linked `organization_id`, issuance timestamp, expiration timestamp (configured with a 7-day sliding window), and last activity timestamp.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New business owners can complete registration and land in an authenticated workspace in under 5 seconds.
- **SC-002**: 100% of registration transactions that encounter an error roll back completely, resulting in 0 orphaned records across user, organization, and widget tables.
- **SC-003**: 100% of data queries executed on behalf of an owner strictly filter by the authenticated owner's Organization ID, guaranteeing zero cross-tenant data leakage.
- **SC-004**: Authentication and session validation completes in under 200 milliseconds for 95% of requests under standard operating load.
- **SC-005**: Password reset tokens expire and become completely unusable after 15 minutes.
- **SC-006**: Inactive owner sessions are reliably invalidated after 7 consecutive days without activity, rejecting subsequent protected requests.
- **SC-007**: Rotated public widget keys cleanly transition with 100% acceptance during the 24-hour grace period and 100% rejection after the grace period expires.
- **SC-008**: 100% of login requests exceeding 5 consecutive failures within a 15-minute window from the same IP/email pair are throttled with a rate-limiting response.

---

## Out of Scope

- **Multi-User Team Invitations**: Adding additional team members, agent seats, or role-based access management (RBAC) within an organization is deferred to future releases; this foundation is strictly single-owner per tenant.
- **Third-Party Social OAuth**: Direct login via Google, GitHub, or Microsoft accounts is deferred; authentication is strictly email and password for this foundation.
- **Organization Deletion & Ownership Transfer**: Full tenant deletion pipelines and ownership transfer mechanisms are deferred to a future administrative management milestone.

---

## Assumptions

- **Tenant Model**: Each registered Owner belongs to exactly one Organization for the initial version (v1), matching the System Specification.
- **Organization Naming**: Organization display names do not require platform-wide uniqueness; tenant boundaries and data access controls are enforced exclusively via immutable UUIDs.
- **Widget Key Accessibility**: The public widget key is a non-sensitive public identifier that allows website visitors to initiate chat sessions but grants no administrative privileges.
- **Session Transport**: In production, authenticated sessions are delivered via secure httpOnly cookies in compliance with the ResolvDesk Constitution.
- **Email Delivery in Dev**: Password reset emails in local development environments can be written to logs or simulated via mock handlers until a dedicated transactional email provider is configured.

