# Navy/gold brand and continued work — 30 October 2026

Brand controls now use established mobile navy #101747 and gold #DEAF46. Selected time cards, headers, calendars, booking progress, member/staff buttons and coach profiles share the palette. White/off-white surfaces and the actual green/red courts remain. Green is retained for meaningful attendance/payment status indicators, not branded card/button backgrounds.

Implemented this increment:

- Coach profile screen with real portrait/initials, specialty, department, eligible courses, duration and catalog prices. Choosing a coach/course returns to the date step with that eligible selection retained. Unavailable profiles show a recoverable empty state. No biography, qualifications, ratings or earnings are invented.
- Admin/Badminton FO court workspace: latest 300 court-only records, search and period filters, member/date/time/amount/payment details, cancellation requests, approval/rejection with required reasons, confirmation and server audit history. Cancellation approval is separate from payment/refund verification.
- Shared backend GET /api/court-booking/bookings restricted to Admin and Badminton FO. The response includes only court bookings and selected user identity fields. Existing generic booking readers are unchanged.
- Booking court selection now prevents exceeding the server's session limit before adding another court.
- Business API 403 errors retain the forbidden classification without retrying the mutation.

Executed checks:

- Mobile lint and TypeScript passed; 141 mobile tests passed.
- Backend TypeScript passed; 27 court booking/change integrity tests passed, including feed authorization, scope and user-field privacy.
- Isolated browser workflow: 35 assertion/capture entries, zero page exceptions. It exercises navy color values, hub navigation, profiles returning to scheduling, private requests, three courts across both floors/two hours each, staff court listing, member denial and FO cancellation approval with audit/payment preservation.
- Android and iOS Hermes JavaScript exports passed after the final UI changes (not signed native builds).
- Read-only polish check verified human-readable cancellation/refund states and captured the final timeline.

The paid-cancellation UI case explicitly sets one court record's paymentStatus in the temporary test database. This is an isolated test fixture, not a real payment or financial reporting assertion. No user/production database was modified. All business interactions after setup use the real shared APIs.

Screenshots are actual Expo React Native Web renders at mobile viewport sizes, not native-device screenshots. See navy-selected-time.png, coach-profile.png, fo-court-reservations.png, fo-cancellation-review.png and fo-cancelled-timeline.png. Native signed-in flows and camera behavior remain device checks.

Reproduce on fresh isolated fixtures with COACH_PROFILE_QA=1 STAFF_COURT_QA=1 BRAND_QA=1 MULTI_COURT_QA=1 MOBILE_QA_ARTIFACTS=artifacts/booking/navy-workspaces node scripts/qa/booking-journeys.cjs using the existing Playwright overrides.

Rollout requires the paired web-backend route update. The shared backend changes were not deployed during this work. .env, production authentication and real payment records were not changed.
