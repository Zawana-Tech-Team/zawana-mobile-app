# Court booking implementation and validation — 15 October 2026

Evidence is separated by environment. This document does not certify production deployment.

## Implemented contract

- Existing authenticated `POST /api/bookings` still accepts legacy single court, `slots`, and multi-date `bookings` payloads. Optional `Idempotency-Key` UUID makes retry results recoverable. Prices remain server-calculated; client payment fields cannot mark court reservations paid.
- `GET /api/court-booking/availability?date=YYYY-MM-DD` returns real courts, stable hourly slots, prices, explicit slot statuses, availability reasons, operating hours, currency, and venue payment policy. `confirmed` / `CONFIRMED` occupy slots as `booked`; `pending`, `PENDING_COACH_CONFIRMATION`, and `AWAITING_PAYMENT` occupy them as `reserved`. Facility blocks return `blocked`. Closed, maintenance and elapsed slots remain unavailable. Payment status never determines whether a confirmed reservation is Booked. `real-availability-status.json` verifies that the actual native QA reservations now return Booked from the database-backed availability service.
- `GET /api/court-booking/month?month=YYYY-MM` returns server-generated per-day availability.
- `GET /api/court-booking/submissions/:key` returns the caller's committed atomic reservation group.
- `GET /api/court-booking/bookings/:id` returns the caller's real reservation.
- Existing `GET /api/bookings?kind=court` and `PATCH /api/bookings/:id/status` supply history and cancellation. Members may cancel their own active unpaid court reservations; staff handle paid bookings.

## Payment policy

Existing court behavior is retained: `CONFIRMED` with `paymentStatus: pending`, no fake payment, no transaction, no 15-minute expiry. The mobile UI explicitly says payment is due at the venue. Figma's payment hold text is intentionally adapted to the actual policy.

## Automated evidence

- `npm test` in mobile: **98 passing**, zero failures (`mobile-tests.txt`). Domain, transport, selection reconciliation, backend slot status validation, booking tab classification, duplicate submission guard and receipt recovery, plus existing auth regressions. These tests do not substitute for native integration evidence.
- `npx tsc --noEmit` and `npx expo lint`: pass (`mobile-typecheck.txt`, `mobile-lint.txt`).
- `npm run typecheck` in backend: pass (`backend-typecheck.txt`).
- `npx expo export --platform android --output-dir /tmp/zawana-booking-verified-export`: passed Android/Hermes bundling (`android-export.txt`); this is not an APK release build.
- `npm test` in backend: **43 passing**, zero failures (`backend-tests.txt`). Real HTTP requests through production routes and auth middleware into isolated migrated SQLite databases, plus auth regressions. Includes direct database persistence assertions, competing clients, idempotent replay, ownership, holiday rates, closed dates, blocks, all-or-nothing multi-slot creation, cancellation and database-trigger protections across alternate writers.
- `court-audit.json`: read-only audit of existing local SQLite reservations.
- `postgres-migration.txt`: isolated PostgreSQL constraint verification, with its limits stated in the output.
- Existing web app `npm run build`: passes (existing large-chunk warning).

## Android evidence and comparison

App runs in the installed Zawana_API_37 emulator using the existing development APK and Metro on 8081. Backend is on 8000; both ports are forwarded with adb reverse. Standard viewport is 1080×2400 at 420 dpi.

The user signed in through the existing authentication flow. Native UI submissions created **three actual reservations** in the local development database: one atomic two-session submission and a separate smaller-viewport submission. The two-session submission was tapped rapidly twice; exactly two rows were created. All three belonged to the authenticated member and were created as `CONFIRMED` / `pending`, without a fake payment. `android-persistence.json`, `android-persistence-all.json`, and `android-persistence-recheck.json` record database assertions and real references.

- Court 1, 16 October, 08:00–09:00: `ZW-MV832QMI-28F37B`.
- Court 2, 17 October, 09:00–10:00: `ZW-MV832QML-1C8995`.
- Court 1, 16 October, 09:00–10:00: `ZW-MV893RGS-C7521D`.

These were clearly marked QA reservations. **Cleanup is complete:** all three were cancelled through the authenticated native detail screen and its confirmation dialog. Their database history is preserved, payment remains pending, and booking occupancy is released. A later parser correction restored an independent facility block on the first QA session; two slots are available and one correctly remains Blocked. `qa-cancellation-recheck-after-policy-fix.json` records the current state. `android-cancellation-proof.json` is historical evidence from before that correction. No database write or authentication bypass was used for cleanup.

Native captures were taken at **411×914 dp** and **360×640 dp**. The original 1080×2400 / 420 dpi emulator setting has been restored. Actual captures selected for review:

| State | Standard viewport | Smaller viewport |
| --- | --- | --- |
| Booking entry | [Entry](android/standard-entry-pass2.png) | [Entry](android/small-entry.png), [action](android/small-entry-action.png) |
| Date selection | [Selected dates](android/standard-dates-selected-final.png) | [Calendar](android/small-dates-selected.png) |
| Courts and availability | [Booked QA slots](android/retry-booked-slots-verified.png), [released slots after cancellation](android/retry-released-slots-verified.png) | [Corrected three-column selection](android/small-current-check.png), [existing booked session](android/retry-small-existing-booked-slots.png) |
| Multiple slots | [Multiple selections](android/standard-multiple-slots-final.png) | Small-viewport run used a single slot |
| Summary | [Summary](android/standard-summary-final.png) | [Summary](android/small-summary-final.png) |
| Review | [Review](android/standard-review-final.png) | [Review](android/small-review-final.png) |
| Confirmation | [Original confirmation](android/standard-confirmation-ready-pass1.png) | [Revised confirmation](android/small-confirmation-final.png), [details below fold](android/small-confirmation-details.png) |
| My Bookings | [Revised upcoming cards](android/retry-my-bookings-final-top.png), [cancelled history](android/retry-cancelled-history.png) | [Cancelled history](android/retry-small-cancelled-history.png) |
| Booking details | [Owned details](android/retry-current-controlled.png), [cancelled record](android/retry-court2-cancelled.png) | [Details](android/retry-small-details.png), [status below fold](android/retry-small-details-status.png) |

Screenshots are actual ADB captures, not mockups. The filenames ending in `final` identify an iteration, not a blanket visual approval. The revised My Bookings layout was captured, compared to Figma, adjusted, and captured again. Native Booked labels and availability release after cancellation are verified. The earlier assertion that there were no effective future blocks was incorrect: the backend parser skipped 24-hour CourtBlock times. That bug is now fixed, and native Blocked states are verified in `android/web-parity-oct20-blocks-fixed.png`. Current development data contains no pending court reservations, so a native Reserved booking screenshot was not fabricated; the mapping passes real HTTP fixture tests.

The `comparisons/` directory contains width-normalized side-by-side, overlay, and difference images. Multiple comparison iterations corrected date/court corner clipping, entry CTA placement, narrow viewport slot wrapping, selected-state fill, summary controls, review grouping, confirmation density, My Bookings card geometry/header spacing, and confirmed status colors. **Pixel accuracy is not claimed.** Typography uses the system font because the authorized Gotham files are not bundled; the available facility photo differs from the flattened Figma imagery. Operating hours, real court count, prices and venue-payment messaging intentionally follow the backend.

During the long API 37 development-emulator run, Android reported input-dispatch and startup ANRs. `android/restart-ready.png` records the startup dialog. Retrying recovered a responsive welcome screen (`android/retry-current.png`), but did not restore the signed-in session. Metro and backend health checks pass. Read-only DropBox trace excerpts are recorded in `android-anr-analysis.txt`; startup stacks include native dex/library loading, and earlier startup ANRs predate the booking run. The cause of the ANRs is unresolved; it has not been attributed conclusively to the application or emulator. The user signed in again through Google, after which native status/history/detail/cancellation verification completed successfully. Resizing to 360×640 dp using a size override retained the signed-in session. The original viewport is restored. Stable cold-start performance still needs release testing; this successful retry does not establish the root cause of prior ANRs. No authentication bypass was introduced.

Figma board `sGDbcLyFHgRltDZO9sHqNw` was inspected via connected Figma tools. Booking references are flattened images, without editable tokens/layers. Local book-1 through book-6 images were inspected; the connected Figma booking section and entry render were also fetched. Official bundled logo is reused. Existing facility imagery is reused because separate original image assets were not exposed by the flattened board.

`scripts/qa/booking-android.py` provides stable-testID capture helpers, but UIAutomator timed out during this emulator run, so it is **not a passing unattended E2E suite**. On the retry, UIAutomator/testID checks worked for navigation and cancellation, including guards that matched the exact booking reference and QA note before each cancellation. Native verification also used direct ADB interactions. Use `scripts/qa/booking-compare.py` for width-normalized side-by-side, overlay, and absolute differences. No similarity score is treated as proof.

## Migration/deployment

SQLite and PostgreSQL migration: `20261014190000_court_booking_integrity`.

SQLite local migration was applied with a backup at `/tmp/zawana-before-booking-integrity.db`; recorded by Prisma. Production database was not touched. PostgreSQL requires `btree_gist` permissions and clean legacy booking ranges. Run the read-only `backend/scripts/audit-court-bookings.ts` before deployment; resolve existing data issues explicitly rather than deleting history. Preserve custom overlap SQL during schema migrations—Prisma schema alone does not encode these database constraints.

**Not Verified:** production migration permissions/data, real multi-connection PostgreSQL concurrency, release-build motion/performance, iOS behavior, and interactive web/front-office regression journeys.


## Engineering assessment and resulting architecture

The active backend entrypoint is `backend/src/server.ts`. Existing booking creation already supported multiple dates/courts, authoritative pricing, hours, recurring/date blocks, closures, and web/front-office workflows. The missing pieces were a bulk mobile availability contract, an authenticated native booking journey, recoverable idempotent submissions, and database protection across alternate writers.

Backend work reuses these rules in `courtPolicy.ts`, `courtBooking.ts`, and `courtAvailability.ts`, with authenticated routes in `routes/courtBooking.ts`. Existing `POST /api/bookings` payloads and notifications are preserved. Transactions lock court rows in stable order, revalidate all sessions, persist the complete group and its receipt, and reject overlaps. SQLite triggers and a PostgreSQL GiST exclusion constraint protect other database writers. The `BookingSubmission` model stores caller-scoped retry receipts; it contains no payment transaction.

Mobile routes under `(member)/book` cover entry → dates → courts/times → summary → review → confirmed reservation. `(member)/bookings` supplies history and owned details. UI, domain functions, API validation and submission orchestration are outside route files. The existing authenticated request transport and token refresh are reused. Local selection state is scoped to the member; focus-based resources abort stale requests, refresh on foreground, and reconcile invalid/changed-price selections. A single-flight submission guard and securely persisted immutable retry request recover an uncertain server outcome before another POST. Success navigation follows server acknowledgement. Motion respects reduced-motion settings and uses UI-thread press scaling.

## Remaining verification and release limits

- Native Booked and Blocked labels, revised My Bookings, owned details and cancellation: verified with actual screenshots and database assertions. Native Reserved presentation lacks an actual pending-reservation capture; the server mapping is tested. Cancellation releases booking occupancy while retaining independent facility blocks.
- The three native QA reservations are cancelled; their history and separate unpaid status remain intact.
- Android ANR root cause and stable cold-start/session restoration: unresolved; must be checked before release.
- Actual loading, empty and network-error screenshots: not captured comprehensively; automated error/recovery cases pass.
- Existing history endpoint returns at most 100 records. Pagination for long-lived accounts remains a backend follow-up.
- Production PostgreSQL migration, real multi-connection PostgreSQL races, interactive web/front-office regression, iOS and release-build animation/performance: **Not Verified**. PGlite constraint verification and the web build do not establish those results.
- Overall release readiness: **Not Verified** while native cold-start stability, production database validation and the listed release checks remain outstanding.

## Payment integration readiness

Reservations retain their real ID, code, amount, owner and separate unpaid payment status. Idempotent booking receipts, owned details and server revalidation can be reused by a future payment phase. No payment provider, fake transaction, paid status, or global payment-policy change was added. Future checkout must define its own server-enforced payment lifecycle without changing the meaning of Booked versus Reserved.


## Status contract follow-up — 15 October 2026

The mobile app fetches `GET /api/court-booking/availability?date=<selected-date>` through the existing authenticated transport, which adds `Authorization: Bearer <application access token>` and handles session refresh. The response remains an availability envelope containing `courts`, `slots`, and facility metadata; each slot has the status union described in the API contract.

Slot captions now come directly from `status`: Booked, Reserved, Blocked, Closed, Maintenance, or Expired. Optional `reason` is retained as explanatory accessibility text; a null reason is valid for an unavailable slot and does not hide its status. Available sessions show their authoritative price. A shared guard requires both `available === true` and `status === "available"` for selection, reconciliation and pre-submission validation. Inconsistent API flags are rejected at the boundary and cannot enable local selection.

Web parity was checked against `zawana-web-app/src/pages/CourtBooking.tsx`: the web also disables any session whose derived state is not Available, and both clients submit through the same server-enforced booking path. Mobile uses the explicit backend status values rather than reimplementing the web's display-state calculations. The backend tests now explicitly attempt and reject overlapping POSTs for every occupying status, as well as maintenance, closed, blocked and elapsed sessions.

After correcting the 24-hour block parser, **20 October 2026** has 8 courts and 120 hourly slots: **76 Available, 43 Blocked and 1 Booked**. The earlier count of 119 Available was incorrect because stored facility blocks were skipped. Court 1, 10:00–11:00 AM, is Booked. `availability-2026-10-20.json` records a read-only database-backed service snapshot, not an exported authenticated HTTP response. The signed-in Android app separately loaded this date through the real HTTP endpoint.

Native evidence:

- [20 October court grid](android/status-oct20-court1.png): Booked caption, grey disabled slot, and server prices.
- [Available session selected](android/status-oct20-selection-verified.png): selection enables Add to Booking; deselection disables it again.
- `status-oct20-interaction.json`: direct physical tap on the booked session left it unselected and checkout disabled. No new reservations were submitted.

Validation after the block parser correction: mobile 97/97 tests, backend 43/43 tests, TypeScript in both repositories and mobile lint pass. Existing release limitations above remain applicable.


## Web availability mismatch — corrected 15 October 2026

**Root cause:** `CourtBlock.start/end` use stored values such as `06:00` and `18:00`. The live web component at `http://localhost:5173/src/pages/CourtBooking.tsx` accepts those 24-hour values. The extracted backend `courtPolicy.toMinute` accepted only AM/PM, so overlap checks silently failed for these blocks. This affected both mobile availability and `POST /api/bookings` validation. The previous booked-slot and AM/PM fixture checks did not detect the defect.

**Fix:** the shared backend parser now strictly accepts valid 24-hour and AM/PM times. Availability, monthly counts, selection revalidation and booking submission all use the corrected overlap checks. Date-specific and recurring blocks are respected; explicit open-date overrides still release recurring blocks according to existing web policy. No schema, data or payment-policy change was made.

**Evidence:**

- `court-policy-before-fix.txt`: regression tests reproduced the old mixed-format failure before the parser change.
- `web-parity-before.json`: read-only comparison found 681 falsely available sessions across the inspected October range.
- `web-parity-after.json`: compared **1,992 non-expired sessions, 15–31 October**, against the overlap calculation extracted from the component actually served by localhost:5173. **Zero availability mismatches** remain. The source URL and SHA-256 are recorded. Elapsed sessions are excluded because the backend additionally prohibits them.
- `backend-tests.txt`: **43 passing** tests, including 24-hour time parsing, mixed-format overlap and adjacency, date-specific 24-hour blocks, weekly 24-hour blocks, all three court payload formats rejected with 409, unchanged row counts after rejected attempts, and open-date override behavior.
- [Corrected native 20 October grid](android/web-parity-oct20-blocks-fixed.png): actual class/facility blocks show Blocked; Court 1 at 10 AM remains Booked.
- `web-parity-native-proof.json`: a direct physical tap on a real blocked session did not select it or enable checkout. No reservation was created.
- `qa-cancellation-recheck-after-policy-fix.json`: all three earlier QA records remain cancelled and unpaid. The first session remains independently blocked by a class, as intended.

Chrome's existing window was opened to `/book/court`, but direct DOM scripting is disabled by its Apple Events setting. No browser security setting was changed. The web comparison uses the live served component and real development database; it does not claim a browser click test or web screenshot.

The older `status-oct20-court1.png`, `status-oct20-interaction.json`, and availability-release screenshots predate this correction and demonstrate only booking occupancy. Use the corrected grid and parity evidence above for facility-block behavior.


## Customer-facing session labels — 15 October 2026

The internal `blocked` status still prevents booking, but is no longer displayed as “Blocked” in the time grid. The availability service returns the safe reason “Class” for `CourtBlock.type = class`, and “Reserved” for other facility reservations. Private titles, names and notes are not returned. Mobile renders Class with a lavender badge, Reserved with an amber badge, and Booked with a muted badge; legacy/null reasons fall back to Reserved. Availability and transaction rules are unchanged.

[Actual Android status badges](android/court-status-class-badges.png) show Class and Booked together. UIAutomator confirms both are disabled. Mobile 98 tests and backend 43 tests pass, with typechecks and lint passing.
