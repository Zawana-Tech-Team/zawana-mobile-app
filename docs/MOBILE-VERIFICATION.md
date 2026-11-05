# Verification — 29 October 2026

The current increment adds working coach, badminton FO and admin workspaces, extends shared member attendance, and verifies the connected workflows against an isolated local backend. This replaces the earlier member-only verification baseline.

## Executed checks

| Check | Result |
|---|---|
| Mobile `npm run lint` | Passed |
| Mobile `npm run typecheck` | Passed |
| Mobile `npm test` | **128 passed, 0 failed, 0 skipped** |
| Backend `tsc --noEmit` | Passed |
| Backend selected integrity/auth suites | **108 passed, 0 failed, 2 PostgreSQL checks skipped** |
| Browser workflow script | **Passed: 14 workflow/assertion entries, 16 captured screenshots, 0 page exceptions** |
| iOS/Android `expo export` | Both Hermes bundles exported; this is JS bundling, not signed native builds |
| `npx expo-doctor` | **20/21 passed**; CocoaPods version/tooling check failed |
| Expo dependency check | Local SDK compatibility passed in offline mode; a fresh online check failed with `ECONNREFUSED`, so remote validation is not claimed |
| Both repositories `git diff --check` | Passed |

Backend suites actually executed: `hybrid-auth.test.ts`, `private-course-finance.test.ts`, `private-course.test.ts`, `attendance.test.ts`, `badminton-category.test.ts` and `court-booking.test.ts`. The two skips are the PostgreSQL category HTTP/concurrency check and forward PostgreSQL category migration check. SQLite counterparts executed against temporary databases.

Evidence: `artifacts/mobile-verification/{results.json,mobile-tests.txt,backend-tests.txt,native-bundles.txt,expo-doctor.txt}`. Screenshots and captions are indexed in `artifacts/mobile-verification/README.md`.

## Verified flows

| Flow | Browser/API/database evidence |
|---|---|
| Coach sign-in and role navigation | Password form → authenticated staff dashboard, with separate staff/member guards |
| Coach accepts a request | Confirmation → existing decision API → awaiting-payment server state |
| Coach cash collection | Actual full amount entered → cash endpoint → verified receipt; database contains exactly one payment for the booking |
| Coach calendar | Existing assigned-session API → rolling day/week view and session cards |
| Coach attendance | Confirmation → attendance API → saved `present` record |
| FO QR issuance | Category selection → real issued Social token → rendered QR and expiry/revocation control |
| FO booking creation | Active member search → eligible course/coach → actual court/date/time availability → idempotent unpaid booking; row persisted |
| Member attendance | Shared attendance API → month history → server detail/summary/history sheet; 390px and 320px captures |
| Member Social check-in | FO-issued token → backend Social preview → confirmation → final server balance |
| Deduction integrity | Database Social balance **10 → 9**, Foundation stays **10**, duplicate scan returns `ALREADY_CHECKED_IN` |
| Member role restriction | Authenticated member request to staff bookings returns **403** |
| Attendance network failure | Browser aborts attendance request → connection error and retry control → retry loads authoritative records |
| Admin catalog update | Editor → price update API → reloaded catalog; database price becomes 55,000 MMK |
| Admin attendance correction | Required reason → audited mark API → `late` record and one attendance-modification row |

The backend suites separately exercise ownership, concurrent reservation attempts, coach conflicts, expired/revoked QR, category eligibility, duplicate deductions, cash custody, refunds, idempotency, role-scoped reads and exclusion of user secret fields. Client tests check request contracts, malformed responses, cancellation, role navigation and non-replay of ambiguous mutations.

Online-receipt reconciliation, cancellation and refund controls are implemented using existing endpoints. Their backend integrity and mobile contracts are tested; provider-backed live UI payment/refund execution was not performed.

## Authentication evidence and limits

The local browser harness uses a new temporary SQLite database. Its test-only proxy maps the mobile password request to the existing local database-password endpoint; the actual backend verifies each test password and issues its usual session. All business requests then use the real backend routes and transaction services. No token is injected into application state, no protected-route bypass or runtime fake-data screen was added, and no production account or record was touched.

This browser run does **not** verify live Firebase sign-in or provider credentials. Separately, the backend hybrid-auth suite verifies the new password/social staff policy with injected identity-provider fixtures: coach/admin/badminton FO are supported; sessions retain their sign-in role; role changes invalidate access/refresh; canonical MFA, account revocation and linked-identity safeguards remain enforced. Phone-only staff login remains rejected. MFA accounts without second-factor proofs continue through the website.

## Native/device evidence and limits

Both iOS and Android JavaScript bundles exported successfully. No connected Android device was available from `adb devices`; `simctl` and CocoaPods tooling were unavailable. These exports do not establish physical camera scanning, native rendering, permission prompts, signing, VoiceOver/TalkBack or provider return behavior.

A new development build is required for `expo-camera`. `react-native-qrcode-svg` uses the existing SVG renderer. Native configuration stays in `app.json`; no generated `ios/` or `android/` files were hand edited.

Generated `.expo` files were removed from Git tracking and remain on disk, including the pre-existing device/router files. The ignore rule now prevents new machine-specific state from being committed. Expo Doctor no longer reports that issue; its remaining failure is CocoaPods.

## Reproduce the local browser verification

The sibling web checkout and its backend dependencies must be available. These scripts refuse production mode or a non-temporary database.

1. From the mobile checkout, run `node scripts/qa/workspace-backend.cjs`. It creates fresh temporary fixtures, starts the real API on port 8129, and the local-only test transport on 8130. Set `ZAWANA_QA_BACKEND` if the sibling path differs.
2. In another terminal, run `EXPO_PUBLIC_API_URL=http://127.0.0.1:8130 npx expo start --web --port 8087`. This overrides the API only for that process; `.env` is not changed.
3. Run `node scripts/qa/mobile-workflows.cjs` with Playwright available. If it is installed elsewhere, set `PLAYWRIGHT_MODULE` to its module path and optionally `PLAYWRIGHT_EXECUTABLE` to a compatible browser binary.
4. Read `artifacts/mobile-verification/results.json` and the screenshots. Restart the fixture server before repeating the full mutating workflow.
5. Stop both servers when finished. Credentials and temporary database paths stay outside the repository; results do not contain tokens/passwords.

The browser driver waits for session restoration, scopes duplicate stack-screen selectors to visible elements, and captures the receipt card directly. It honors reduced motion. Screenshots are actual Expo React Native Web renders of the mobile source at mobile viewports; they are **not native-device screenshots**. The development-server toolbar may appear in viewport captures.

## Required before release

- Deploy the paired backend changes before releasing the staff-capable app. Production was not deployed or modified during this work.
- Build updated iOS/Android development clients and test native camera permission grant/deny/permanent denial, real QR capture, back/background behavior, small/large text, keyboard handling and assistive technologies.
- Exercise real Firebase password/social authentication, MFA-required rejection, persisted native sessions, logout/revocation and production payment-provider return flows with authorized test accounts.
- Run PostgreSQL integration/migration checks against a designated test database before production rollout.
- Finish remaining product scope: staff-assisted court creation/rescheduling, broader member/package management, settlement/cash-handover UI, global historical financial reporting and staff alert/notification inboxes. Current staff booking and collection views intentionally cover the latest 300 private-course records; summaries say so.

## Subsequent Android emulator launch

The `Zawana_API_37` emulator was subsequently launched and the updated Android development APK was built and installed successfully using the existing Java 17 toolchain. Its welcome screen rendered after loading the current Metro bundle, with no launch errors in the checked ReactNativeJS/AndroidRuntime error logs. The user's API setting `http://localhost:8000` was retained, with ADB reverse forwarding ports 8000 and 8081. See `artifacts/mobile-verification/android/README.md` and its actual emulator screenshot. This updates the earlier statement that no Android device was available; native authenticated flows and camera capture remain unverified.


## Member booking, packages and calendar increment

The updated journeys are documented in [BOOKING-EXPERIENCE.md](BOOKING-EXPERIENCE.md): court rental follows time → date → floor → court, private coaching follows package → coach → date → time → floor → court, and attendance defaults to an interactive month calendar across member/staff views. Rescheduling keeps the website's **at least 24 hours before the original session** policy and uses its quote/revision APIs.

Executed checks for this increment:

- Mobile tests: **137 passed, 0 failed, 0 skipped**, including multi-day/multi-hour availability, atomic edit replacement, ambiguous reschedule recovery, actual HTTP contracts and calendar boundaries.
- Mobile lint and TypeScript: passed.
- Backend `court-changes.test.ts`: **9 passed**, including the exactly-24-hour boundary, concurrency, payment adjustments, ownership and audit history.
- Backend `court-booking.test.ts` and `private-course.test.ts`: **31 passed, 0 failed, 0 skipped** against temporary databases.
- Expo Doctor: **20/21 passed**; CocoaPods tooling remains unavailable.

The web preview now persists only pending booking selections/idempotency keys in tab-scoped session storage, since native SecureStore is unavailable on web. Native pending submissions retain the existing encrypted storage. Authentication storage is unchanged.

Run `scripts/qa/booking-journeys.cjs` against the fresh isolated fixture backend using the same Playwright setup described above. It covers final reservation submission, session replacement, server-approved rescheduling, private requests, booking lists, package discovery/history and attendance date selection. Captures/results live in `artifacts/mobile-verification/journeys/`. Native authenticated device flows remain unverified; the emulator screenshot only establishes launch/rendering of the welcome screen.


The new member browser journey completed successfully: **19 assertion/capture entries, 0 page exceptions**, including a confirmed reservation, atomic edit, successful equal-price reschedule with one audit-history row and persisted private-course request. The staff/QR/attendance regression also passed: **30 assertion/capture entries, 0 page exceptions**. Screenshot captions and current logs are indexed in `artifacts/mobile-verification/journeys/README.md`.

After the final storage and review updates, both Android and iOS Hermes JavaScript bundles exported successfully. `git diff --check` also passed. The native Metro server on 8081 and Android ADB reverse mappings for 8081/8000 remain available for manual testing; `.env` was not edited.


## Navy/gold, coach profiles and staff courts — 30 October 2026

This increment updates the branded controls to navy #101747 / gold #DEAF46 and implements supported coach profiles plus Admin/FO court listing, details and audited cancellation review. The paired shared backend court feed enforces Admin/Badminton FO roles and excludes unrelated booking types/user secrets. See `artifacts/booking/navy-workspaces/README.md` for current scope, fixture boundaries and screenshots.

Mobile lint/TypeScript passed; **141 mobile tests passed**. Backend TypeScript passed; **27 court booking/change tests passed**. The isolated browser journey passed **35 assertion/capture entries with zero page exceptions**, including actual multi-court submission, coach-profile selection return, role denial and cancellation approval without changing the paid state. A subsequent read-only check verified the human-readable final cancellation/refund timeline. Native signed-in/device and PostgreSQL release checks remain outstanding; no production deployment or .env changes were made.

Final Android and iOS Hermes JavaScript exports also passed for this increment; logs are in `artifacts/booking/navy-workspaces/native-bundles.txt`. These exports do not establish authenticated device behavior.


## Full supported coach portal and attendance/bookings UI — 30 October 2026

See `COACH-PORTAL-PARITY.md` for the source audit, feature/API/permission matrix and changed-file inventory. Coach primary tabs are now Home / Calendar / Attendance / Finance / More. New modules cover Gym PT, role notifications, customers, month calendar, coach-locked four-stage private-course booking, scoped finance filters/receipts and partial cash handovers. Attendance is calendar-first with compact metrics, filters and notes; member bookings use date-grouped ticket cards with independent payment status.

Executed: mobile lint and TypeScript passed; **151 mobile tests passed**. Backend TypeScript passed; **42 relevant backend tests passed, zero skipped**. Four-role regression passed **30 assertion/capture entries**; coach E2E passed **23**; final read-only visual/filter checks passed **10**, all with zero page exceptions. The E2E deliberately loses a committed handover response, reloads and signs in again, then recovers the same request ID without another allocation. PT completion replay leaves one debit; no-show/cancel do not consume additional sessions. Private-course completion/decline and existing acceptance/cash flows execute through the UI.

Expo Doctor passed **20/21**; CocoaPods tooling remains the failed local check. Current evidence and mobile-width screenshots are indexed in `artifacts/coach-portal/README.md`. These browser captures do not establish native authenticated device or real-provider behavior. `.env`, production data and backend business logic were not changed by this increment; only the isolated test fixture was extended in the web repository.

Both final Android/iOS Hermes exports passed for the coach portal. Coach-only destination wrappers and the real empty Gym state passed a focused navigation smoke check. Logs are in `artifacts/coach-portal/`.


## Badminton-only minimalist UI — 30 October 2026

Current specification: `BADMINTON-MINIMAL-UI.md`. Coach navigation now opens Calendar and uses Calendar / Attendance / Coaching / Finance / More, with Gym removed from navigation and loading. Member/coach attendance, member packages, notifications and cash handovers use compact summaries with tap-to-open details.

Executed this increment: TypeScript, Expo lint and 151 mobile tests; 30 four-role, 21 coach and 23 read-only visual assertion/capture entries, all with zero browser page exceptions. The handover recovery and actual server receipt/allocation checks still pass. Native Android coach password login reached Calendar against the isolated backend. See `artifacts/badminton-minimal/README.md` for screenshots and execution boundaries. Historical Gym-inclusive results above are retained as prior evidence, not the current mobile scope. iOS authenticated device/provider/camera/PostgreSQL release testing remains outstanding. `.env` and production data were unchanged.

## Premium member experience — 30 October 2026

Services discovery now contains the active Badminton hub and explicit non-actionable Coming Soon services. Shared member notifications support actual read/history/navigation with synchronized badges and partial bulk-read failure handling. Member dialogs/sheets use a common responsive surface; Home/Profile and payment records are simplified. See `MEMBER-PREMIUM-EXPERIENCE.md` and `artifacts/member-premium/README.md` for inventory, evidence and backend limits.

Executed: 156 mobile tests, TypeScript, Expo lint; 20 premium UI and 19 booking regression assertion/capture entries, zero browser page exceptions. Separate Android/iOS Hermes and web exports passed. Test data/API writes were isolated; production was accessed read-only for the public visual reference. User `.env` and backend contracts remain unchanged. Notification history/bulk limits and broadcast shared-read semantics remain backend dependencies.

Final combined export also passed for the premium member increment. Native member automation was attempted, but ADB stalled and the cold-booted emulator remained offline; no new native member rendering verification is claimed. See `artifacts/member-premium/native-verification.log`.
