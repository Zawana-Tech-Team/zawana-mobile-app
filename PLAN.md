# ZAWANA Mobile App — Product Decisions and Phased Implementation

Updated: 2026-10-08

This document preserves the product vision, decisions from the interview, implementation sequence, and unresolved questions. It is a working handoff document, not a claim that every requirement has been settled. Implement phases in order; resolve each phase's open dependencies before shipping its affected behavior.

## 1. Product and launch priorities

ZAWANA provides one digital identity for sports, fitness, healthcare, coaching, retail, and hospitality. Members should access their existing ZAWANA records through the same account used on the website.

The initial release prioritizes reliable multi-date badminton court reservations, booking history, cancellation visibility, and badminton training-package tracking. Other services are informational initially. Online payments and additional transactional services will arrive progressively as operations and backend capabilities become ready.

Primary success moment: a member successfully confirms a court reservation and can find it in Activity.

### Latest decisions take precedence

- The current court flow is select → review → tap Confirm → confirmed booking. Do not redirect to a payment provider yet.
- Booking confirmation does not mean payment verification. Preserve the backend's unpaid/pending payment status; never mark a booking paid merely because Confirm was tapped.
- MMQR is the selected future payment channel. Earlier KBZPay/AYA Pay alternatives are not separate launch integrations.
- There is no pay-at-desk option. Do not present it as a payment method or instruction.
- The later MMQR flow will confirm a reservation only after verified payment. Temporary holds, deadlines, expiry, and resume-payment belong to that later flow, not the current click-to-confirm flow.
- Shared backend changes are allowed when required, superseding the earlier read-only constraint. Mobile and web must use the same rules and records.
- Clerk replaces Firebase Authentication as the target identity provider. Phone number → SMS OTP is the primary login flow; Sign in with Apple and Google are approved quick-login alternatives. Phone number remains the main profile contact field.
- Training packages represent coaching/class sessions, not court rental credits.
- The latest firm package decision was payment before entitlement activation. The subsequent temporary click-to-confirm instruction clearly covers courts but does not explicitly settle package activation. Do not silently restore unpaid package activation.

## 2. Platforms, design, and technology

- Android and iOS; mobile-first layouts, performance, and cross-platform compatibility.
- Minimal, premium, simple UI with clear hierarchy, restrained decoration, accessible controls, and straightforward booking workflows.
- Expo Router for navigation, native tabs, NativeWind for styling, Clerk authentication, and the existing Express API/database.
- Five tabs, in this order: Home, Book, Services, Activity, Profile.
- English/Myanmar language support and light/dark appearance are desired product requirements. Translation completeness and launch timing remain to be settled.
- Use existing brand assets, including `assets/Brand Guideline Arena.pdf`, logos, partner imagery, and facility photographs. Inspect the guideline before choosing colors, typography, or logo treatments; no palette has been approved in this interview.

### Existing mobile project baseline

The inspected manifest declares Expo `~57.0.27`, Expo Router `~57.0.25`, React `19.2.3`, React Native `0.86.3`, and TypeScript `~6.0.3`. NativeWind and Clerk are not yet declared dependencies. The current routes are a basic root Stack and placeholder index screen.

Before implementing Expo/React Native APIs, consult the matching SDK documentation at <https://docs.expo.dev/versions/v57.0.0/> and the documentation index at <https://docs.expo.dev/llms.txt>. Confirm NativeWind and Clerk versions and compatibility before installing; this document does not select those versions from memory.

Follow `AGENTS.md`: routes belong in `src/app/`, supporting code outside that directory, install SDK-compatible dependencies through `expo install`, and run lint/typecheck. The current project has `package-lock.json`; use npm/npx unless a Bun lockfile is introduced. Do not manually create native projects under Continuous Native Generation. Native dependency changes may require development builds. Use EAS for cloud build/signing/submission and appropriate OTA updates.

## 3. Navigation and service coverage

| Tab | Responsibilities |
| --- | --- |
| Home | Public introduction for visitors; personalized member dashboard, active entitlements, upcoming bookings, quick actions, announcements, notification entry point. |
| Book | Date-first court availability, multi-court/multi-date selection, review, confirmation. Coaching and clinic information initially; their booking workflows later. |
| Services | Badminton training packages; informational gym, performance/training, LI-NING Store, Café, and recovery services initially. |
| Activity | Current and historical bookings, payment status/history where supported, package usage/check-ins, and later receipts, purchases, and appointment history. |
| Profile | Personal details/avatar, authentication/security, language, appearance, notification preferences, and support. |

Brand-new visitors may browse before signing in. Require authentication before protected availability, reservations, and personal records. The backend currently protects availability endpoints, so do not assume live slots can be shown anonymously.

### Longer-term product inventory

- Account/profile: phone number + Clerk SMS OTP login, Apple and Google quick login, phone-first profile contact information, name/avatar, membership and purchase/activity records, account preferences. Standalone email/password login is not an approved launch requirement.
- Courts: real-time availability/pricing, multiple dates/courts/slots, policy-driven cancellation, staff rescheduling, upcoming/ongoing/past views, confirmations/reminders.
- Memberships/packages: gym memberships later, badminton training packages, benefits/prices/validity/sessions, renewal, remaining sessions, digital membership and check-in history.
- Coaching: coach profiles/specializations, preferred coach/court/date/time, requests and acceptance/decline, session/payment history.
- Revive Clinic: service/practitioner discovery, appointment management/history, reminders, and authorized summaries/recommendations where supported.
- Fitness/performance: weight, strength and assessment history, progress charts, assigned programs, and recommendations.
- Payments: future MMQR, verified payment state, shared transaction history, digital receipts/invoices, and approved refund handling.
- LI-NING retail: product details, prices/stock, cart/order placement and history, promotions; transactional ordering deferred.
- Café: menu/prices, orders/status/history, payments and order-ready notifications; transactional ordering deferred.
- Communication: service notifications, reminders, expiry notices, announcements/promotions, preference controls, and staff support.

## 4. Court reservation journeys

### Current release: click to confirm

1. Select a date through a mobile-friendly calendar.
2. Display all six badminton courts using backend court records and available hourly slots.
3. Select multiple courts and slots on the same date.
4. Add dates without losing previous selections; allow removal and editing of selections.
5. Review all dates, court names, slots, total hours, and total price on one screen.
6. Display approved cancellation terms when available; do not fabricate policy values.
7. Submit all selections together. The server must revalidate availability and create the set atomically.
8. On a slot conflict, show the server's affected selections, retain the member's draft, refresh availability, and require review before retrying. A failed atomic submission must not leave a partial booking set.
9. Show confirmed reservation records and their booking references, dates/courts/times, hours, amount, truthful payment status, and View My Bookings.

The inspected backend currently creates an individual booking/reference for each slot. Do not invent a persistent group reference or aggregate invoice. Decide whether a shared booking-group record is needed before adding one.

Do not show a fictional payment deadline or MMQR instructions in this release. Persisting a selection draft across app restarts, handling lost responses, and duplicate-submission recovery still need agreement; disabling repeated taps alone is not sufficient server idempotency.

### Later: MMQR checkout

1. Review selection and server-authoritative price.
2. Create a pending reservation with a temporary hold through the shared backend.
3. Initiate MMQR payment and show the reference, payable amount, instructions, status, and deadline.
4. Allow resuming payment from Activity while the reservation remains payable.
5. Confirm only after trusted provider verification on the server. App return/deep-link navigation is not proof of payment.
6. Expire unpaid holds automatically and release court availability.
7. Handle failed payments, duplicate callbacks, retries, app interruption, and money received after expiry through an agreed reconciliation process.

An earlier interview choice was one fixed deadline including verification, with 30 minutes proposed as an ASSUMPTION. That duration is not approved for the future MMQR flow. No manual-payment implementation or desk-payment path is part of the current release.

### Cancellation and rescheduling

- Share website/backend cancellation rules; members can cancel eligible own bookings.
- Explain the applicable cancellation/refund consequences before confirmation.
- Rescheduling initially means contacting staff; FO staff manages modifications.
- Release cancelled slots according to shared backend policy.
- Business owners must define cancellation cutoff, refund/credit eligibility, and processing rules. These must become administrator-configurable shared policies if implemented.
- Do not invent refund percentages, deadlines, automatic refund promises, or eligibility based only on client logic.

## 5. Training-package behavior

Training packages provide session entitlements consumed through training check-ins. They never automatically reduce court rental charges.

Members should browse package price/benefits/session count/validity, view active packages, remaining sessions and expiry, and access usage history where the API supports it. Later purchases/renewals must use shared payments and only activate sessions after verification.

**Provisional safe default:** launch package browsing and existing entitlement tracking; defer self-service activation until the package payment policy is resolved. This is an ASSUMPTION, not a final user decision. The existing purchase endpoint currently grants active sessions without collecting payment and must not be invoked accidentally under a payment-before-activation UI.

## 6. Shared architecture, identity, and records

Repository: <https://github.com/saitech-1/zawana-web-app.git>. Inspected local checkout: `C:/Users/HP/Documents/zawana-web-app`; the user confirmed it is the target contract. Production parity still needs release verification.

- Clerk is the target identity provider. The inspected backend currently verifies Firebase tokens; replacing only the mobile SDK is insufficient. Adapt shared API authentication to verify Clerk session tokens and resolve the Clerk user to the existing backend member.
- Preserve backend member IDs and all bookings, packages, history, and transactions. Existing Firebase UIDs are legacy migration references, not Clerk user IDs. Define a verified linking/migration process; never merge accounts based solely on a client-supplied phone number or matching display email.
- Primary login journey: enter phone number → request Clerk SMS OTP → verify code → resolve linked member → complete profile if needed → return to the intended member action.
- Quick login journey: choose Apple or Google → complete Clerk provider authentication → resolve the same member/profile-completion path. Social login does not inherently establish a verified phone number; whether phone verification is required before booking remains open.
- Send Clerk session tokens as `Authorization: Bearer <token>` to the adapted API. Clerk handles authentication; Express owns member authorization and service permissions. Keep secret keys server-side and store mobile session credentials securely.
- Coordinate the website's authentication migration or a time-limited Firebase/Clerk transition using separate trusted verifier paths. Choose the transition policy before rollout; preserve one member record rather than creating a separate mobile identity database.
- Shared Express backend owns authorization, profile linking, availability, pricing, booking transitions, entitlements, policies, and financial records.
- The existing database remains the service-record source of truth. Do not introduce separate mobile payment/member/booking databases.
- Presentation may estimate totals from supplied pricing, but final pricing and validation are server-owned. Avoid copying holiday/surcharge policy into unrelated client implementations.
- Treat active `backend/src/server.ts` mounts and handlers as authoritative. Unmounted router files are not proof of an available endpoint.
- Local database authentication is development-only. Existing production/backend behavior uses Firebase; the target authentication provider is Clerk.

### Clerk integration references and prerequisites

- Current [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart) documents `@clerk/expo`, secure token storage, custom flows, and native Apple/Google options. Native sign-in requires a development build. Confirm Expo 57 compatibility before selecting an SDK version.
- Use the official [SMS OTP flow guide](https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp) when implementing phone login; include first-time registration as well as returning-user sign-in.
- Clerk's [authentication configuration](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options) restricts SMS to enabled countries. Confirm Myanmar delivery, allowlist settings, cost, and quotas before launch.
- Configure Clerk environments and Native API, Apple/Google provider credentials, platform identifiers, and required callbacks. Exact platform-specific Apple behavior remains to be verified during implementation.

### Inspected API entry points

| Capability | Existing entry point / observed behavior |
| --- | --- |
| Existing Firebase session/profile; migration required | `POST /auth/session`, `POST /auth/complete-profile`, `GET /auth/me`; adapt verified identity resolution for Clerk while preserving member records and compatible public contracts. |
| Own profile | `GET /profile`, `PATCH /profile`, `POST /profile/avatar`; update currently whitelists name/phone. |
| Court catalogue | `GET /courts`. |
| Availability | `GET /bookings/availability`, `GET /bookings/month-availability`; protected. |
| Court batch submission | `POST /bookings`; supports multi-date selections, up to 60 entries, hourly validation and atomic creation; currently confirms with pending payment. |
| Booking history | `GET /bookings`; member-scoped; pagination and filters supported. |
| Cancellation | `PATCH /bookings/:id/status`; own standard booking cancellation is supported, but observed handler does not enforce a configurable cutoff/refund policy. |
| Rescheduling | `PATCH /bookings/:id`; currently staff-only. |
| Member dashboard | `GET /member/dashboard?referenceDate=YYYY-MM-DD`. |
| Training packages | `GET /packages/badminton`, `GET /member/badminton-package-purchases`, purchase endpoint with immediate unpaid activation currently. |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`; push/reminder delivery is not established by these endpoints. |

Paths are relative to `/api`. The local default is `http://localhost:8000/api`, which is not a production URL or automatically reachable from a physical phone. Verify payloads, response types, roles, business timezone, error contracts, and deployment configuration directly before implementing each integration.

Core entities include Clerk identity/linked member (with legacy Firebase mapping during migration), profile, court, booking, training package, purchase, enrollment/session balance, check-in, transaction/payment attempt, and notification. Reuse existing member and service IDs and relationships. New identity mapping, grouped checkout/hold/payment-policy records may be needed; their schemas have not been agreed.

## 7. Step-by-step implementation sequence

### Step 1 — Confirm contracts and unresolved launch rules

- Resolve package activation scope, current unpaid reservation policy, cancellation terms, supported sign-in methods, member onboarding fields, and member/staff access boundaries.
- Read the brand guideline; verify versioned docs and dependency compatibility.
- Confirm Clerk environments, phone/Apple/Google provider configuration, API environments, test-member access, device connectivity, and production/local contract parity. Agree on web migration/transition and verified existing-member linking.

### Step 2 — App foundation and five-tab shell

- Configure compatible NativeWind and native Expo Router tabs.
- Establish shared design tokens/components, loading/empty/error states, appearance and language foundations.
- Build public Home and informational service entry points using approved assets/content.

### Step 3 — Identity and member experience

- Adapt shared backend authentication for Clerk and implement verified member migration/linking before enabling mobile service transactions.
- Implement Clerk phone/SMS OTP and Apple/Google login, secure session restoration, first-time registration/profile completion, sign-out, and protected routes.
- Integrate profile/avatar, personalized dashboard, and existing entitlement summaries.
- Define behavior for expired sessions, inactive accounts, missing profiles, and unauthorized roles.

### Step 4 — Court selection, review, and atomic confirmation

- Build calendar/date selection, six-court hourly availability, persistent selections across dates, review and total display.
- Integrate batch submission with server conflict handling and truthful confirmation/payment states.
- Settle duplicate-request/lost-response recovery before release.

### Step 5 — Activity, cancellation, and package tracking

- Provide booking history/details and approved cancellation actions; staff contact for rescheduling.
- Show package balances/expiry/usage and supported transaction records without fabricating receipts or paid status.
- Implement the agreed package purchase behavior only after its interim policy is resolved.

### Step 6 — Launch quality and delivery

- Verify Android/iOS device flows, accessibility, language/theme behavior, weak-network recovery, authorization, and data parity with web.
- Configure environments, operational monitoring, support, EAS release process, and agreed distribution target.
- Run lint and typecheck plus meaningful integration/end-to-end checks before release.

### Step 7 — Shared MMQR payment rollout

- Agree provider contract, credentials, costs, verification mechanism, deadlines, refund/reconciliation operations, and payment-group granularity.
- Implement shared backend holds, expiration, payment verification/idempotency, transaction records, policy configuration, and FO operational visibility.
- Update both web and mobile flows together; activate training sessions only after payment verification.
- Stage and test before switching from click-to-confirm to payment-gated confirmation. Existing unpaid bookings need an explicit compatibility policy.

### Step 8 — Expand services progressively

- Add coaching, clinic appointments, gym memberships, notifications/reminders, performance/training, retail, and Café transactions according to agreed priorities and operational readiness.
- Treat sensitive healthcare data, new permissions, and each service's operational workflow as separate discovery work.

## 8. Verification and acceptance scenarios

- Existing members retain the same records after Clerk migration/linking; new members complete onboarding correctly; unauthorized users cannot access another member's records. Test trusted token verification and any temporary dual-provider transition.
- Verify SMS OTP success, incorrect/expired codes, resend behavior, delivery failures, request limits, and interrupted sign-in. Verify existing-member linking preserves records instead of creating duplicate accounts.
- Verify Apple/Google success, cancellation, provider failure, returning login, missing phone, Apple private-relay email, and linking multiple login methods to one member without unauthorized account merging.
- Select multiple dates/courts/slots, edit selections, verify totals, and submit one batch.
- Competing reservations produce one winner and an actionable conflict for the other; no partial batch is created.
- Reject stale/past/blocked/duplicate slots and handle server price changes without silently confirming a different purchase.
- Repeated taps, timeout after server success, token expiry, and app restart do not cause misleading success or uncontrolled duplicate bookings.
- Current Confirm produces a confirmed reservation with truthful pending/unpaid payment state and no MMQR redirect or desk-payment instruction.
- Cancellation follows shared approved rules, updates history, and releases availability correctly; staff-only rescheduling is explained.
- Package sessions remain distinct from rental hours; show balances/expiry accurately and never inadvertently grant unpaid entitlements.
- Future MMQR: verified success, failure, expiry, retry, duplicate/out-of-order callbacks, late funds, and payment resumption produce consistent web/mobile records.
- Validate both platforms, English/Myanmar rendering when implemented, large text, contrast, touch targets, empty states, slow networks, and safe personal-data handling.

## 9. Assumptions and open risks

### Explicit assumptions

- Package self-service activation is deferred until its interim payment policy is clarified; browsing/tracking can proceed.
- Current click-to-confirm courts have no invented payment deadline/hold expiry. Backend behavior remains authoritative until a shared policy is agreed.
- NativeWind and Clerk versions will be chosen after compatibility checks, not inferred from this document.
- The five tabs remain visible with informational content for deferred services; exact content and contact actions still need approval.
- The earlier proposed 30-minute hold is retained as historical discussion only, not a current requirement.

### Questions still requiring answers

- Clerk SMS OTP plus Apple/Google quick login are selected. Define supported countries, country-code normalization, phone uniqueness, number changes/recovery, resend limits, SMS costs/quotas, and delivery-failure behavior. Verify provider delivery for intended countries, especially Myanmar.
- Must Apple/Google users verify a phone before booking, or only provide a contact number? How are existing Firebase members securely linked to Clerk, and will web migrate together or use a temporary dual-provider transition?
- Which member fields are required, and how are staff identities or inactive accounts treated on mobile?
- Are self-service package purchases deferred until MMQR, or is a deliberate temporary unpaid activation policy wanted?
- What happens operationally to current confirmed-but-unpaid court bookings? What cancellation/no-show policy applies?
- What are the approved cancellation/refund/credit terms, administrator controls, support channels, and FO responsibilities?
- Should batch bookings have one persistent group reference and payment, and can individual slots be cancelled independently?
- What is the future hold duration, and how are late/partial/duplicate payments and refunds reconciled?
- Which MMQR provider/API will be used, and are merchant credentials, sandbox access, and verified callbacks available?
- What can users see offline, how long is cached personal data retained, and should selections survive app restarts?
- Are push notifications/reminders launch requirements? Existing in-app notification routes do not establish device delivery.
- What are launch translation requirements, Myanmar font choices, timezone/date formatting, and accessibility targets?
- What are production/staging URLs, budget, deadline, expected scale, logging/analytics/alerts, CI/CD and release ownership?
- What is the public-release definition of done, and which future service ships next?

### Material risks

- Clerk tokens are incompatible with the backend's current Firebase verifier. Shared backend adaptation, account migration/linking, and web transition are prerequisites to preserving the unified identity.
- Myanmar SMS support/delivery, social-provider configuration, Expo 57 compatibility, and native-build behavior must be verified; selecting Clerk does not settle these operational requirements.

- Existing unpaid package activation conflicts with payment-before-activation unless explicitly changed or kept out of the launch flow.
- Current cancellation handlers are less policy-rich than the desired product; exposing unimplemented deadlines/refund promises would mislead members.
- Existing payment infrastructure references KPay, while the future selected channel is MMQR; usable provider support must be verified rather than assumed.
- Payment-gated rollout must maintain shared web/mobile status semantics and handle existing reservations without creating inconsistent financial records.
- Provider readiness, staff operations, notification infrastructure, deployment parity, and dependency compatibility remain unverified.

No application code or backend changes are part of creating this document.
