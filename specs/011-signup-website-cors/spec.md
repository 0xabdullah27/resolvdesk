# Feature Specification: Enforce Required Website URL on Signup & Restrict Widget CORS Origins

**Feature Branch**: `011-signup-website-cors`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "see all the relevant places to make the changes as when the user is signup so make the website url field the required too. so that we have the user's webiste and then in the backend make that field required too so that we ahve the user's website url and then after successfully added up the user add the user's website url (domian) in the cors so then whenever the browser send the req from the user website so teh domain is already allowed otehrwise not allowed"

## Clarifications

### Session 2026-09-06
- Q: Should the registration form accept bare domain names like store.com in addition to full URLs like https://store.com? → A: Accept both full URLs (https://...) and bare domains (store.com), automatically normalizing to a clean hostname.
- Q: Should the initial allowed origins list automatically include localhost alongside the merchant's registered store domain? → A: Include both the registered domain and localhost (e.g. mystore.com, localhost).
- Q: Should the submitted website address also be stored on the Organization profile in the database, or only used to configure the widget's allowed origins? → A: Store the website on both the Organization record and the widget's initial allowed origins.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Required Website URL during Registration & Automatic Domain Authorization (Priority: P1)

As a new merchant creating an account on ResolvDesk,
I want to provide my store/website address during signup,
So that my customer support widget is immediately and automatically locked to my own website domain, preventing anyone else from hijacking my widget or stealing my AI quota.

**Why this priority**: Core tenant security requirement. Without this, newly created widgets default to open wildcard access, leaving merchants vulnerable to quota exhaustion if their public key is embedded elsewhere.

**Independent Test**:
Can be fully tested by navigating to the registration page, attempting signup without a website URL (verifying rejection), submitting with a valid store URL, and inspecting that the newly provisioned widget configuration has its allowed origins locked to that store domain.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration screen, **When** they attempt to submit the form without entering a website URL, **Then** registration is prevented and an inline validation error informs them that the website URL is required.
2. **Given** a visitor enters an invalid URL format (e.g. `invalid_url`), **When** they submit the form, **Then** registration is prevented with a descriptive format validation error.
3. **Given** a visitor submits valid registration data including `https://mystore.example.com`, **When** the account is successfully provisioned, **Then** the organization's initial widget configuration is automatically set with `mystore.example.com` (and local development hostnames) as authorized origins rather than wildcard `*`.

---

### User Story 2 - Seamless Widget Operation on Authorized Merchant Domain (Priority: P2)

As an online shopper visiting the merchant's e-commerce store,
I want the support chat widget to open, stream answers, and function smoothly,
So that I receive automated assistance without browser security or cross-origin errors blocking my requests.

**Why this priority**: Ensures business continuity and end-user customer satisfaction on the merchant's live storefront.

**Independent Test**:
Can be fully tested by embedding the merchant's widget on a webpage hosted on their registered domain, initiating a conversation, and verifying that configuration lookup and chat streaming succeed.

**Acceptance Scenarios**:

1. **Given** the merchant's widget embedded on `https://mystore.example.com`, **When** the storefront page loads, **Then** the browser successfully fetches the widget branding configuration without cross-origin blocks.
2. **Given** a shopper on `https://mystore.example.com`, **When** they send a chat message, **Then** the request is accepted and the response streams back in real time.

---

### User Story 3 - Protection Against Rogue Embeds on Unauthorized Domains (Priority: P3)

As a merchant whose public widget key is publicly readable in HTML,
I want requests coming from unapproved third-party websites to be rejected,
So that third-party sites cannot copy my embed tag and drain my AI usage.

**Why this priority**: Protects merchants' billing, compute resources, and brand reputation against unauthorized reuse.

**Independent Test**:
Can be tested by simulating or embedding the widget snippet on an unauthorized external domain (e.g., `https://malicious-site.com`) and verifying that widget configuration and chat requests are denied with an explicit authorization failure.

**Acceptance Scenarios**:

1. **Given** a merchant's widget key embedded on `https://unauthorized-domain.com`, **When** the browser sends a configuration or chat request, **Then** the system rejects the request with an authorization refusal (`403 Forbidden`).
2. **Given** a rejected request from an unauthorized domain, **When** the widget script receives the response, **Then** it halts gracefully without harming or crashing the host webpage.

---

### Edge Cases

- **Protocol and Path Stripping**: If the user inputs `https://shop.example.com/collections/all`, the system must extract the normalized hostname (`shop.example.com`), disregarding schemes, paths, trailing slashes, and ports.
- **Top-Level Domains and Localhost**: If the merchant enters `http://localhost:3000` during development testing, the system must recognize and store `localhost` as the authorized origin.
- **Wildcard Subdomains**: Merchants with multiple storefront subdomains (e.g., `store.brand.com` and `checkout.brand.com`) must be able to adjust or expand their authorized domain list in the dashboard post-signup.
- **Empty or Whitespace-Only Submissions**: Input containing only spaces or tabs must fail validation prior to submission.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require the website address as a mandatory field on the user registration form, accepting both full URLs (`https://example.com`) and bare domains (`example.com`).
- **FR-002**: System MUST validate that the website address conforms to a valid web address or domain format before processing registration.
- **FR-003**: System MUST enforce website address validation at the backend API boundary before initiating account provisioning.
- **FR-004**: System MUST extract and normalize the root hostname/domain from the submitted website input (e.g., extracting `example.com` from `https://www.example.com/path` or `example.com`).
- **FR-005**: System MUST provision the initial widget configuration with the normalized domain and `localhost` (e.g., `example.com, localhost`) in its allowed origins list instead of defaulting to wildcard `*`.
- **FR-006**: System MUST permit cross-origin requests (`/config`, `/chat`, `/chat/escalate`) originating from the registered domain.
- **FR-007**: System MUST reject cross-origin requests originating from domains not present in the widget's allowed origins list with an explicit authorization refusal.
- **FR-008**: System MUST allow authenticated merchants to view and update their allowed domains list anytime in their widget settings.
- **FR-009**: System MUST persist the submitted website URL on the Organization profile in the relational database.

### Key Entities *(include if feature involves data)*

- **Organization**: Represents the merchant workspace; stores workspace identity, display name, primary website address, and owner association.
- **Widget Configuration**: Represents customer-facing widget settings; stores public widget keys, branding choices, and `allowed_origins` (comma-separated list of approved domains).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly registered merchant accounts have a registered website URL and a restricted (non-wildcard) initial widget allowed origins setting.
- **SC-002**: 100% of registration submissions lacking a valid website URL are rejected with descriptive validation feedback within 1 second.
- **SC-003**: 0% false rejections: cross-origin widget requests originating from the merchant's registered domain complete with 100% success rate.
- **SC-004**: 100% of requests originating from unlisted external domains are blocked from accessing widget chat endpoints, preventing unauthorized resource consumption.

---

## Assumptions

- **Local Development Compatibility**: During onboarding, the system automatically includes `localhost` alongside the merchant's registered domain to allow merchants and developers to test the widget locally before deploying to production.
- **Subdomain Handling**: If a user enters `example.com`, standard domain matching allows both `example.com` and its direct subdomains if configured with wildcard format in widget settings.
- **Post-Registration Modification**: Merchants who rebrand, change domains, or run multiple staging sites can add or modify domains in the Widget Customizer (`/dashboard/widget`) at any time.
