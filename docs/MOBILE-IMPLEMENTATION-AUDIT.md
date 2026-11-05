# ZAWANA mobile audit and implementation plan

Audit updated: 29 October 2026. Baseline mobile checkout: `ab5ced0`; web checkout: `41ae509`. Both local repositories were inspected. This report distinguishes existing implementation, changes in this increment, and remaining work; it is not a completion claim for all seven phases.

## Architecture

- Expo SDK 57, React Native 0.86, React 19, Expo Router with routes in `src/app/`. NativeWind is configured; existing operational screens use typed StyleSheet components, Reanimated and SVG. Retain those components rather than mixing styling conventions within them.
- `src/auth/` owns identity proofs, application-session exchange, encrypted persistence, refresh, revocation and route policy. Business requests use application bearer tokens, not Firebase proofs. Email/password uses the backend mobile endpoint; Google/Apple/phone use explicit provider proofs. Preserve this architecture.
- `src/auth/api.ts` is the shared authenticated HTTP client, with timeout, cancellation, response validation and a single refresh attempt after 401. No new HTTP client or mobile backend is necessary.
- Member routes exist for home, services, profile, membership, private courses, course activity, check-in and the court-booking journey. The member layout scopes `BookingProvider` by user ID.
- Court booking already includes date/time selection, the original building illustration, 2F/6F selector, court plan, selection feedback, sticky review actions, server availability, idempotent submission and ambiguous-outcome recovery. Preserve these assets and flow. Files include `building-illustration.tsx`, `court-plan.tsx`, `floor-selector.tsx`, `provider.tsx`, `submission.ts` and the screens in `components/booking/`.
- `useResource` cancels obsolete requests, refreshes on focus and app foreground, and periodically refreshes active data. `useFormTask` locks duplicate taps. Reuse both.
- The baseline had member route guards only. The current increment adds a separately guarded `(staff)` route group for coach/admin/badminton FO, role-specific navigation and shared operational screens.

## Verified source paths

All requested paths exist in the web checkout: `src/pages/{PrivateCourse,PrivateCourseAdmin,CoachBooking,CoachCalendar,CourtBooking,Bookings}.tsx`, `src/components/CourtBookingSteps.tsx`, `backend/src/services/{privateCourseAvailability,courtBooking,courtAvailability}.ts`, `backend/src/routes/{bookings,coaches}.ts`, and `backend/prisma/schema.prisma`.

Additional authoritative files: `backend/src/server.ts`, `backend/src/routes/{attendance,qrCheckIn,privateCourseFinance,courtBooking}.ts`, `backend/src/services/{authSession,badmintonAttendance,badmintonCategory,privateCourseFinance,courtPolicy}.ts`, `src/pages/{Attendance,QrCheckIn,StaffPrivateCourses}.tsx`, `src/index.css`, and `src/design/motion.ts`.

Production was inspected with Playwright at a 390×844 viewport. The public home page loaded, showing the crowned-lion identity, editorial sports presentation and actual facility imagery. A direct unauthenticated visit to `/court-booking` redirected to `/`; authenticated production booking screens and role workflows were not verified. No production booking, payment or attendance records were created.

## Web → mobile workflow mapping

| Workflow | Authoritative web/backend | Existing mobile | This increment / remaining |
|---|---|---|---|
| Court booking | CourtBooking, CourtBookingSteps; court availability and booking services | Native staged journey, building and court illustrations, review and confirmation | Preserve; broader device and concurrency QA remains |
| Private courses | PrivateCourse; privateCourseAvailability | Course/coach selection, scheduling, request submission | Coach profiles, eligible courses and return-to-scheduling implemented; native visual QA remains |
| Course lifecycle | Member private-course routes; coach decision and payment verification | Course activity, cancellation, payment launch and server refresh | Preserve; live payment-provider QA remains |
| Member attendance | Shared `/attendance`; QrCheckIn | Legacy dashboard visit history and obsolete self-check-in | New shared history, search, month navigation, details, package usage and QR preview/confirm |
| Coach | CoachCalendar and coach private-course routes | Shared staff workspace | Home/Calendar/Attendance/Finance/More; month calendar, Gym PT, customers/notifications, coach booking, receipts and partial handovers implemented; see COACH-PORTAL-PARITY.md |
| FO | StaffPrivateCourses, QR issuance, category attendance | Shared staff workspace | Member lookup, server availability, idempotent private-course creation, cash recording, category QR issuance/revocation and attendance implemented |
| Admin | PrivateCourseAdmin, attendance, staff finance | Shared staff workspace | Private-course catalog/coach assignments, audited attendance corrections, payment records, receipt reconciliation, cancellation/refund evidence and scoped collection summaries implemented |

## API inventory

Paths below are relative to `/api`. Scope comes from backend middleware and ownership filters, not client navigation.

| Method / endpoint | Contract and authorization |
|---|---|
| POST `/auth/mobile/email-login`, `/provider-session`, `/phone-login` | Existing mobile-session exchange; keep proofs and application access tokens separate |
| POST `/auth/refresh`; GET `/auth/me` | Session lifecycle; mobile role restrictions apply on issue, validation and refresh |
| GET `/member/dashboard` | Member-owned bookings, packages, purchases and notifications |
| GET `/court-booking/month?month=YYYY-MM` | Member/admin/FO; server day availability |
| GET `/court-booking/availability?date=YYYY-MM-DD` | Member/admin/FO; court IDs, prices, slot states, selection limit, business date/timezone |
| POST `/bookings` | Court payload `{kind:'court',bookings:[{date,courtId,time}],meta?}`; `Idempotency-Key`; transactional overlap validation |
| GET `/court-booking/submissions/:key` | User-scoped UUID submission recovery; do not blindly resubmit an uncertain reservation |
| GET `/bookings?kind=court`; GET `/court-booking/bookings/:id` | List and member-owned booking details |
| PATCH `/bookings/:id/status` | Existing transition authorization; cancellation submits `{status:'cancelled'}` |
| GET `/private-courses` | Member receives active catalog and eligible coaches; admin/owner catalog permissions differ |
| GET `/private-courses/availability` | `{courseId,coachId,courtId,date,durationMinutes}`; member/admin/FO/coach; coach limited to self |
| GET/POST `/member/private-courses` | Member-owned list/create; create `{courseId,coachId,courtId,date,time,expectedPrice?}`; server checks latest duration, price and overlaps |
| POST `/member/private-courses/:id/cancel`, `/:id/pay` | Member ownership and lifecycle validation; payment initiation is not confirmation |
| GET `/coach/private-courses` | Coach-owned requests/sessions |
| POST `/coach/private-courses/:id/decision`, `/:id/complete` | Coach-specific transitions; reuse exact backend request schemas before implementing |
| GET `/coach/calendar?start=…&end=…` | Existing assigned-session calendar source |
| GET `/attendance?month=YYYY-MM` | Member/coach/admin/FO; member self scope, coach assigned-course scope; optional q/status/category/date filters |
| GET `/attendance/:kind/:id/detail` | Authorized participant history and summary; modifications returned only to admin |
| POST `/attendance/courses/:id/check-in`, `/:id/mark` | Coach/admin/FO; eligible paid sessions and date restrictions; corrections require admin and reason |
| POST `/attendance/packages/:id/mark` | Admin corrections; backend protects original package cycles and balance |
| POST `/check-in/qr`; DELETE `/check-in/qr/:id` | Admin/FO category-specific QR issuance/revocation |
| POST `/check-in/preview` | Member; `{token}`; authoritative category, selected enrollment, current/expected balance and deduction |
| POST `/check-in/scan` | Member; `{token}`; transactional category selection, QR validity and issuer checks, daily uniqueness and deduction |
| POST `/member/check-in` | **Obsolete: returns 410 QR_REQUIRED. Do not call.** |
| GET `/staff/private-courses/bookings`, `/bookings/:id` | New safe-projection reads; coach limited to own assigned courses, admin/FO operational scope; list capped at 300; detail includes change reasons; reservations expire before reads |
| GET `/staff/private-courses/members?q=…`, `/catalog` | Staff role scope, bounded member search and active catalog |
| POST `/staff/private-courses/bookings` | Strict staff payload with member/course/coach/court/date/time/expectedPrice/paymentSource/requestKey/reference/notes |
| POST `/staff/private-courses/bookings/:id/cash` | Scoped staff cash collection; accepts reference/notes, derives full amount from booking; no arbitrary amount/method input |
| GET `/staff/private-courses/finance` | Role-scoped transaction-backed finance; audit permissions before exposing totals |
| POST `/staff/private-courses/bookings/:id/refund` | Admin-only audited refund |
| GET/POST/PATCH/DELETE `/coaches` and GET/POST/PATCH/DELETE `/private-courses` | Existing per-operation management permissions; do not expose writes based only on visible tabs |

## Status and financial integrity

Prisma booking statuses are exactly: `pending`, `confirmed`, `completed`, `cancelled`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `PENDING_COACH_CONFIRMATION`, `AWAITING_PAYMENT`, `COACH_DECLINED`, `EXPIRED`. Payment status is `pending | paid | refunded`. Attendance status is `pending | present | late | absent | excused` and is independent of booking/payment status.

Private-course presentation maps request → `PENDING_COACH_CONFIRMATION`, accepted/payment due → `AWAITING_PAYMENT`, server-confirmed → `CONFIRMED`, finished → `COMPLETED`; declined/cancelled/expired remain terminal states. Render `paymentExpiresAt` from the server; do not invent a local 24-hour deadline or confirm from a checkout redirect.

Payment source is `BADMINTON_FO | COACH | ONLINE | UNPAID`. The cash endpoint records `CASH`, the full booking price, authenticated collector, transaction and verification timestamps. It does **not** accept arbitrary received amounts, KBZPay, AYA Pay or MMQR. Those proposed inputs require explicit backend support before a mobile form can offer them. Coach collections are not earnings. Finance must use payment/transaction/settlement records, including refunds and allocations.

QR category is `FOUNDATION | SOCIAL | PATHWAY`. Backend selects the eligible package in that category, serializes deduction and enforces daily category uniqueness. A Social check-in must never use the dashboard’s default Foundation enrollment. The mobile QR flow sends only the scanned token, displays the server preview and then the server-confirmed result. Network errors are not automatically replayed.

## Design specification and component inventory

Current `src/design/tokens.ts` follows the user's navy/gold direction using the established authentication palette: navy `#101747`, gold `#DEAF46`, accent `#A76D10`, gold-soft `#FFF5D4`, warm page `#FFFEFC`, border `#DDE1EA` and muted `#697590`. This supersedes the initial web-neutral charcoal tokens. The crowned-lion logo and real court graphic colors are unchanged. Licensed Gotham/mobile font assets remain unverified, so typography uses the existing system fallbacks.

Attendance uses an editorial navy summary, restrained gold category labels, spacious white cards, explicit status text/colors, 44-point controls, searchable month-scoped history, four segmented sections and a safe-area-aware detail sheet. Package cards display server balances and a visual usage bar. These are presentation summaries of authoritative records, not locally calculated entitlements.

New shared components: `AttendanceCard`, `AttendanceStatusBadge`, `AttendanceDetailSheet`, `PackageUsageCard`, `SessionTimeline`, `Fact`, `StaffPage`, `SessionCard`, `PaymentTools`, `PageMore` and `Empty`. Attendance detail loads the backend participant history and summary. Shared confirmation dialogs respect reduced motion and preserve their content during dismissal. Existing reusable components include `MemberPage`, `Frame`, `MemberNavigation`, `BookingTabs`, `Button`, `Notice`, `Reveal`, `Confirm`, `BrandLogo`, court-plan/floor-selector/date/time components, `SelectionPressable` and `journey-motion`.

Member bottom destinations now match Home / Badminton / My Bookings / Performance / Profile. Performance opens attendance-based session history, not invented athletic metrics. Course booking history remains reachable from My Bookings; the Badminton hub groups court rental, packages, check-in and private courses, with existing home/profile shortcuts retained. Screens remain Expo Router routes and role guards remain intact.

Existing selection motion remains. Attendance sheets respect reduced motion; camera mounts only while focused and foregrounded, requests permission on explicit scan action, scans QR only, and unmounts after capture. No microphone permission is requested. Native camera requires a new development build.

## Incremental plan and dependencies

1. **Audit:** completed source inspection and public production inspection; authenticated production parity remains unverified.
2. **Foundation:** implemented shared web-derived tokens and member/staff navigation. Home now uses the same member bottom navigation as the other screens. A 320px review corrected compact navigation spacing. Existing booking assets and authentication visuals remain intact.
3. **Member:** this increment completes shared attendance and category-aware QR integration. Continue with authenticated native visual QA and court map gestures/detail presentation; supported coach profile details are implemented. Keep backend selections authoritative.
4. **Coach:** implemented role-bound password/social staff sessions, protected workspace, requests/decisions, rolling day/week calendar, assigned-student list, attendance and supported cash collection. Session binding, role changes, refresh and MFA are regression tested. Phone-only staff entry remains restricted.
5. **FO:** implemented member search → catalog/coach/court/date/time availability → idempotent unpaid booking → session details → supported full cash collection. QR generation uses the actual category-specific token, displays expiry, and supports revocation. Member QR confirmation uses the backend-selected eligible package.
6. **Admin:** implemented course create/edit, active/inactive status, pricing/duration and coach assignment; audited attendance corrections; verified payment summaries by source; online receipt reconciliation; reasoned unpaid cancellations and evidence-backed refund recording. Summaries use explicit payment amounts/status/verification, are scoped to the latest 300 private-course records and are labelled accordingly. They are not all-time financial reports or coach earnings.
7. **QA:** lint/typecheck, 128 mobile tests, backend typecheck and 108 backend tests passed (2 environment-dependent tests skipped). All four roles passed local authenticated browser workflows with database assertions and 16 screenshots. Both native JS bundles exported. Physical-device, production Firebase/provider, and PostgreSQL deployment checks remain.

## Risks and remaining work

- **Paired backend rollout required:** the sibling web backend now admits coach/admin/badminton FO through the existing password/social proof flow. New staff session methods bind the sign-in role; promotion, demotion or reassignment invalidates them at access/refresh. Legacy member sessions remain member-only. Phone-only staff access and MFA without second-factor proofs remain rejected. No roles or database schema were added. Mobile staff functionality requires deploying these backend changes alongside the mobile app; deployed production was not changed.
- **Payment requirements exceed current API:** arbitrary collection amounts and multiple offline payment methods are unsupported by the inspected cash contract. Do not ship misleading controls.
- **Native QA:** camera scanning, permissions, physical QR capture, keyboard behavior, TalkBack/VoiceOver, Android/iOS safe areas and payment-provider return flows still need device validation. `simctl` was unavailable during this session.
- **Protected UI evidence:** local browser screenshots now exist for all four roles using isolated SQLite test accounts and real backend routes/transactions. The test-only transport maps the mobile password entry to the existing local database-password endpoint, which verifies the password normally. Production mobile Firebase proofs are independently covered by backend tests with injected identity fixtures, not by live Firebase authentication. No production records or runtime mock-data screens were added.
- Remaining product work: staff court-booking management alongside private courses; complete member/coach profile discovery; broader staff member/package management; cash handover/settlement UI; global financial reports and additional filters/pagination; staff notification/alert inboxes. Students and collection summaries currently cover the loaded private-course records, not a full historical directory or ledger.
- Existing court-booking native graphics were preserved. Pinch/pan, animated floor enhancements and broader private-course visual parity remain review items, not completed work.

See `MOBILE-VERIFICATION.md` for executed checks and evidence.

## Backend changes in this increment

- `hybrid.policy.ts` and `hybrid.service.ts`: explicit supported password/social mobile roles; phone flow keeps the stricter member policy.
- `authSession.ts`: binds new staff session methods to their issued role, checks strong identity proofs/MFA, and rejects role changes during authentication and refresh. Existing member/web/local-development session behavior is retained.
- `privateCourseFinance.ts`: scoped booking list/detail reads with safe member projections and no-store caching. No passwords, Firebase IDs or new financial authority are exposed.
- `server.ts`: supplies the existing expiration callback to the staff reads and expires stale requests before a coach decision.
- Backend tests cover new staff sign-in, MFA, role changes, scoped reads and secret-field exclusion, plus existing concurrency, attendance and finance integrity.

The new `react-native-qrcode-svg` dependency renders issued QR tokens using the already installed SVG renderer. `expo-camera` still requires a fresh native development build. No deployment or app submission was performed.


The coach-portal follow-through is recorded in `COACH-PORTAL-PARITY.md`, including source audit, scoped API contracts, delivered features, explicit file inventory and verification. The newer matrix supersedes earlier coach-calendar/finance backlog notes.
