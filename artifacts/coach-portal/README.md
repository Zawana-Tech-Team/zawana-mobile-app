# Coach portal and attendance/bookings UI — 30 October 2026

This increment implements the supported web coach workflows using the existing shared APIs and navy/gold mobile identity. The feature/API/permission matrix and modified-file inventory are in `docs/COACH-PORTAL-PARITY.md`.

## Actual checks

- Mobile lint and TypeScript passed. **151 mobile tests passed**, including immutable persisted requests, financial contracts, ownership/input checks, timezone end boundaries and notification/Gym validation.
- Backend TypeScript passed. **42 backend tests passed, zero skipped**: `private-course-finance.test.ts`, `private-course.test.ts`, `attendance.test.ts`, `gym-management.test.ts`, `gym-policy.test.ts`. They exercise real HTTP/business/database contracts including finance ownership, concurrent allocation/completion, expired reservations, attendance and enrollment deductions.
- Four-role browser regression: **30 assertion/capture entries, zero page exceptions**. Existing coach acceptance/cash, FO creation, member Social package deduction and admin attendance correction remain functional.
- Coach browser journey: **23 assertion/capture entries, zero page exceptions**. It covers month calendar, notes/arrival persistence, notification history, assigned customers, coach-locked cash booking and duplicate replay, partial handover/FO receipt with unauthorized and over-allocation denials, eligible private completion and decline, Gym save/completion/no-show/cancel with one debit, small-screen profile and logout.
- The handover test forwards a real POST to commit it, deliberately aborts its response, reloads the page, signs in through the real test login form and retries the persisted request. The same handover ID is recovered; database assertions confirm one allocation.
- Read-only visual/filter check: **10 assertion/capture entries, zero page exceptions**, including 320px/390px member layouts and finance date/source/method/payment/booking filters. Switching to Handovers reloads unfiltered available cash.
- Final Android/iOS Hermes JavaScript exports passed. Coach-only route navigation and the legitimate empty Gym state also passed a focused smoke check. These exports are not signed native builds.
- Expo Doctor: **20/21 passed**; the local CocoaPods tooling/version check failed. No new dependencies were added.

The browser driver uses a temporary migrated SQLite database and a local QA transport into the real backend's password verifier and business APIs. It does not inject application authentication or bypass protected routes. Seeded paid private-course and Gym enrollment records are explicit isolated test fixtures, not real financial receipts or production revenue. Actual tested cash bookings and handovers go through the real transaction services. No production data or user `.env` was changed.

## Screenshots

All PNGs are actual Expo React Native Web renders at mobile viewport sizes; they are not native-device screenshots.

- `coach-home.png`: real schedule, counts and Home/Calendar/Attendance/Finance/More tabs.
- `coach-month-calendar.png`: assigned-session month calendar.
- `coach-attendance-notes.png`: coach attendance after notes/arrival persistence.
- `coach-notifications.png`, `coach-customers.png`: role inbox/history and assigned customer records.
- `coach-booking-review.png`: four-stage booking, locked coach and actual cash price.
- `coach-handover-review.png`, `coach-handover-submitted.png`, `fo-handover-received.png`: partial cash custody and receiving-staff acknowledgment.
- `gym-attendance.png`, `gym-completed.png`: PT participant check-in and backend-confirmed remaining sessions/debit.
- `coach-finance-filters.png`, `coach-available-cash.png`: scoped filters and unfiltered handover availability.
- `coach-profile-320.png`: small-screen profile/logout.
- `member-bookings-390.png`, `member-bookings-320.png`: compact date-grouped booking tickets and independent payment state.
- `member-attendance-390.png`, `member-attendance-320.png`, `member-attendance-calendar-320.png`: calendar-first attendance and compact controls.

## Reproduction

Start fresh fixtures with `node scripts/qa/workspace-backend.cjs`, run web Metro on 8087 with process-only `EXPO_PUBLIC_API_URL=http://127.0.0.1:8130`, then run `scripts/qa/mobile-workflows.cjs` followed by `scripts/qa/coach-portal.cjs` with the existing Playwright module/executable overrides. The coach script expects the regression's initial accepted/collected booking. Refresh fixtures before repeating mutating journeys.

`results.json` holds the coach journey and `visual-results.json` the read-only checks. The parent `artifacts/mobile-verification/results.json` holds the four-role regression.

Native signed-in Android/iOS interaction, actual keyboard/camera permissions, real Firebase/provider returns and PostgreSQL deployment checks remain release verification. No production deployment was performed. Backend feed limits (300 sessions, 100 notifications) match the existing web contracts; no global earnings or invented availability is presented.
