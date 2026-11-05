# Coach portal parity — 30 October 2026

> Superseded presentation scope: the latest badminton-only refinement replaces Home with primary Coaching, makes Calendar the landing page, removes Gym screens and simplifies attendance/packages/finance. See [current specification](BADMINTON-MINIMAL-UI.md). The audit and prior results below describe the earlier increment.

## Source audit

Read the provided coach brief and verified these paths in the sibling `zawana-web-app` checkout: `src/App.tsx`, `src/components/RoleLayout.tsx`, `src/pages/Operations.tsx`, `CoachCalendar.tsx`, `CoachTraining.tsx`, `GymPrivateTraining.tsx`, `Attendance.tsx`, `src/components/AttendanceDetail.tsx`, `src/pages/StaffPrivateCourses.tsx`, `backend/src/server.ts`, `backend/src/routes/{attendance,privateCourseFinance,gymTraining}.ts`, `backend/src/services/{privateCourseFinance,gymSessions}.ts`, `docs/ATTENDANCE.md` and `docs/private-course-staff-finance.md`. All requested paths exist.

The live entry point is `backend/src/server.ts`. Its notification handlers perform per-user/audience authorization; the older standalone notification route is not the production authority. Finance is mounted at `/api/staff/private-courses`; Gym training uses the existing `/api/coach/private-training` and `/api/gym/private-training/:id/status` routes. No separate mobile backend or new backend role was created.

The existing mobile baseline already supported assigned private-course bookings, acceptance/decline, completion, cash receipts, day/week calendar, badminton attendance and staff course creation. Those workflows were extended rather than replaced with mock screens.

## Feature parity matrix

| Web feature | Previous mobile | API / backend authority | Work delivered | Status |
|---|---|---|---|---|
| Coach role workspace | Dashboard/Calendar/Requests/Students/Profile | Existing Firebase + application session/role guards | Home/Calendar/Attendance/Finance/More with secondary routes | Implemented |
| Dashboard | Assigned booking counts and today list | Staff booking feed + assigned Gym today + scoped finance + inbox, loaded concurrently | Real pending/confirmed/completed counts, private/Gym schedule, upcoming private sessions, collection summary and latest notifications | Implemented |
| Assigned bookings | Search/status cards | `GET /staff/private-courses/bookings` and `/:id`, coach-owned scope | Compact filters, details, deadlines, receipt/history and secondary navigation retained | Implemented |
| Accept/decline | Existing confirmation actions | `POST /coach/private-courses/:id/decision` | Preserved; server-confirmed updates only | Implemented |
| Complete private course | Existing completion action | `POST /coach/private-courses/:id/complete` | Preserved, with end-time-aware presentation guard; backend remains authoritative | Implemented |
| Day/week/month calendar | Day/week | `GET /coach/calendar?start=&end=` | Month calendar, real session markers, today/previous/next and assigned-session detail navigation | Implemented |
| Badminton attendance | Monthly calendar + marking/history | `GET /attendance?month=`, `GET /attendance/:kind/:id/detail`, `POST /attendance/courses/:id/mark` | Compact metrics, status/class filters, search, notes inside confirmation, details/history, backend check-in flags and preserved arrival timestamps | Implemented |
| Attendance correction | Admin-only audited correction | Existing attendance mark/correction endpoints | Coach does not receive admin correction controls; existing admin reason/notes preserved | Preserved |
| Gym PT | Missing | `GET /coach/private-training?scope=today|upcoming|completed|all`, `PATCH /gym/private-training/:id/status` | Scope tabs, scoped details, participant attendance, save/complete/no-show/cancel and backend-confirmed enrollment balance | Implemented |
| Gym scheduling | Not exposed | Gym FO/Admin endpoints | Scheduling and enrollment creation remain unavailable to coaches | Matches permissions |
| Coach booking wizard | FO-oriented form, request key only in memory | Catalog/member search, existing combined availability, `POST /staff/private-courses/bookings` | Four stages; own coach identity locked; unpaid/online-later/actual coach cash; price review and durable request key | Implemented |
| Collections/receipts | Latest-booking receipt cards | `GET /staff/private-courses/finance` + cash endpoint | Scoped report, payment search, session-date/source/method/payment/booking-status filters, actor/receipt details; no earnings inference | Implemented |
| Cash handovers | Missing | `POST /staff/private-courses/settlements`, `/:id/receive` | Own available cash, partial allocation, persisted retry identity, submitted/received history; FO/Admin actual receipt confirmation | Implemented |
| Notifications | Missing | Production `GET /notifications[?history=1]`, `PATCH /notifications/:id/read` | Inbox/history, known booking links, server-confirmed mark-read | Implemented |
| Customers | Private-course student shortcut | Assigned private/Gym records | Search deduplicated members and open their actual private/Gym sessions | Implemented |
| Profile/settings/logout | Existing profile/logout | Existing authenticated user and sign-out | Preserved behind More, with secondary back navigation; OS reduced motion remains respected | Implemented |
| Member attendance UX | Large summary and stacked controls | Existing shared attendance records | Calendar-first layout, compact metrics, list/history/packages, search and small-screen toolbar | Implemented |
| Member bookings UX | Large repeated photo cards | Existing court/private feeds | Date-grouped tickets, separate booking/payment states, search/type/history filters and real deadlines | Implemented |

## Contracts and integrity

- Auth, refresh tokens, storage policy and Expo Router protected groups remain in use. Business 401/403/404/409/400 errors keep their established actionable classes.
- Staff catalog is server-scoped to the authenticated coach. The UI locks the coach to that eligible profile, and creation is revalidated by the existing transaction service. It cannot nominate another collector.
- Unpaid/online-later creation requests do not verify a payment. Cash creation requires the exact actual amount and confirms only after the backend records it. Existing-session cash collection still requires personally received full cash.
- Booking and handover request keys and exact payloads are persisted in native encrypted storage (tab-scoped session storage on web). Same-payload retries reuse the key; changed unresolved payloads are rejected. Durable writes precede network mutation. Account/unmount guards prevent a delayed request from continuing in another coaching session.
- Cash handovers use only the backend's `availableForHandover` values for the current collector. Local input checks are convenience validation; the shared backend serializes allocation and rejects over-allocation, foreign payments and duplicate allocations. Handover submission/receipt do not create sales.
- Finance filters apply to session dates. Handover view deliberately removes those filters so it can load the role's available collections and independent settlement history. Server classifications and summary values are displayed, not reconstructed from booking status as coach earnings.
- Gym attendance is separate from badminton package/course attendance. Only enrolled participant IDs are submitted. Completion/no-show/cancellation eligibility, one-session debit and replay safety are enforced by `gymSessions.ts`; the mobile UI displays the returned balance.
- Badminton notes and first arrival timestamps remain backend-owned. Coaches cannot correct another coach's record, modify finalized attendance as an administrator, or consume a badminton package through Gym PT.

## Changed mobile files

New: `src/coach/{domain,request,use-saved-request}.ts`, coach-only route guard; `src/components/shared/controls.tsx`; coach Home, Finance, More, Customers, Notifications and Training screens under `src/components/staff/`; Expo Router routes `/(staff)/finance`, `/more`, `/customers`, `/notifications`, `/training`, `/training/[id]`; `tests/coach-portal.test.ts`; `scripts/qa/coach-portal.cjs`.

Extended: `src/auth/api.ts`, `src/staff/domain.ts`, `src/attendance/domain.ts`, shared member confirmation controls, member attendance and booking lists, staff navigation/page footer, coach calendar, course wizard, attendance, session completion and workspace screens. Existing QA drivers were adapted to the new tabs/wizard. The sibling backend only adds isolated test fixtures for the extra Gym coach/enrollment/sessions/notice; business logic is unchanged in this increment.

## Verification and operational limits

See `artifacts/coach-portal/README.md` and `docs/MOBILE-VERIFICATION.md` for executed checks and current screenshots. Local business tests run against migrated temporary SQLite databases and real shared API routes. The QA auth transport maps the mobile password request to the real database-password verifier; it does not inject a protected session or bypass application route guards.

Native authenticated Android/iOS rendering, physical camera behavior, real provider/Firebase returns and PostgreSQL deployment verification remain release checks. Browser captures are Expo React Native Web at mobile viewport sizes. CocoaPods availability is a local tooling limitation. No production account/data or user `.env` was changed.

Backend-defined limits remain visible: assigned private-course list/calendar and Gym feeds are capped at 300, inbox at 100. Gym details reload the same scoped feed as their list because there is no dedicated coach session-by-ID endpoint. A dedicated ownership-scoped detail endpoint would remove that feed-bound limitation. Calendar private-course data and Gym training intentionally remain separate, matching the web portal. Profile preferences, qualifications and earnings unsupported by the backend were not invented.


Executed result: 151 mobile tests; 42 backend tests; successful mobile/backend typechecks and lint; 30 four-role, 23 coach and 10 read-only browser assertion/capture entries with zero page exceptions. Expo Doctor 20/21 (CocoaPods tooling failed). Coach E2E includes the lost-response/reload/re-login persisted-request recovery, private-course completion/decline and Gym debit replay. Explicit coach-only route wrappers protect Calendar, More, Customers and Gym destinations in addition to the root staff guard and backend ownership checks.


## Explicit file inventory for this increment

New mobile modules/routes:

- `src/coach/domain.ts`, `src/coach/request.ts`, `src/coach/use-saved-request.ts`
- `src/components/shared/controls.tsx`
- `src/components/staff/coach-route.tsx`, `coach-home-screen.tsx`, `finance-screen.tsx`, `training-screen.tsx`, `notifications-screen.tsx`, `customers-screen.tsx`, `more-screen.tsx`
- `src/app/(staff)/finance.tsx`, `more.tsx`, `notifications.tsx`, `customers.tsx`, `training/index.tsx`, `training/[id].tsx`
- `tests/coach-portal.test.ts`, `scripts/qa/coach-portal.cjs`

Extended existing mobile modules/routes:

- `src/auth/api.ts`, `src/staff/domain.ts`, `src/attendance/domain.ts`
- `src/components/member/ui.tsx`, `src/components/attendance/attendance-screen.tsx`, `src/components/booking/bookings-screen.tsx`, `src/components/booking/booking-progress.tsx`
- `src/components/staff/ui.tsx`, `calendar-screen.tsx`, `create-course-screen.tsx`, `attendance-screen.tsx`, `session-screen.tsx`, `workspace-screens.tsx`
- `src/app/(staff)/calendar.tsx`
- `scripts/qa/mobile-workflows.cjs`, `scripts/qa/booking-journeys.cjs`

Shared backend checkout: `backend/tests/mobile-workspace-browser-fixture.ts` adds only isolated test data for the Gym coach, PT enrollment/sessions, additional attendance/private completion and personal notification.
