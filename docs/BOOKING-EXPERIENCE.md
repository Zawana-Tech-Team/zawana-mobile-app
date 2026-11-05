# Booking and attendance experience

This increment preserves the existing website identity, building artwork, court arrangement, authentication and backend. No additional dependencies, backend roles, payment methods or local booking authority were introduced.

## Member journeys

- Court rental: time → date → floor → available court → review → server confirmation. Multiple hours/dates are supported within the server selection limit. A court must accommodate every chosen session. Review supports adding, removing and replacing individual sessions.
- Private coaching: package → eligible coach → date → time → floor → court → review → coach request. Combined court/coach availability comes from the existing availability service; the client requests each actual court concurrently to present times before floors. Submission rechecks availability and price. Coach acceptance and payment remain separate server states.
- Booking list: unified court/coaching records with type tabs, upcoming/history/cancelled filters, search, payment status and request payment deadlines. Booking status never implies a paid transaction.
- Packages: all returned enrollments, backend remaining balances, category discovery, validity, price and purchase history. Existing venue-payment activation is explicitly described; it is not presented as online checkout.
- Attendance: shared month calendar with status markers and a selected-day list, record details, package usage and existing history controls. Admin and coach views use the same calendar. Empty dates do not create attendance or deduct packages.

## Rescheduling

The website policy is unchanged: a confirmed court booking can be changed at least 24 hours before its original start. The server determines eligibility and the actual deadline. The rental selector picks a replacement, then the final review shows the original and proposed sessions, signed price difference and a required reason. Equal-price changes use the existing revision-protected transaction. Price adjustments go to staff. An ambiguous response is recovered by reading the server record and matching the exact target; the mutation is never blindly replayed.

Cancellation uses the existing reasoned request API. Unpaid and paid bookings retain their distinct immediate-cancellation / staff-review behavior and financial history.

## Shared presentation

Warm off-white surfaces, navy cards, established typography, restrained gold selection accents and minimum 44-point controls reuse project tokens. `MonthCalendar`, `StepProgress`, `Choice`, `AttendanceLegend` and the existing `FloorSelector`/`CourtPlan` serve the new journeys. Existing Reanimated building selection/zoom respects system reduced motion. Android hardware Back moves to the previous booking step. Existing screen shells retain safe areas, keyboard behavior and sticky actions.

## API contracts

| Operation | Existing shared endpoint |
|---|---|
| Court schedule / availability | `GET /api/court-booking/availability?date=` |
| Court month indicators | `GET /api/court-booking/month?month=` |
| Court reservation | `POST /api/bookings` with existing idempotency key |
| Booking change policy / history | `GET /api/court-booking/bookings/:id/changes` |
| Replacement quote | `POST /api/court-booking/bookings/:id/reschedule/quote` |
| Confirm replacement | `POST /api/court-booking/bookings/:id/reschedule` with revision + reason |
| Cancellation request | `POST /api/court-booking/bookings/:id/cancellation-requests` |
| Private catalog / combined availability | `GET /api/private-courses`, `GET /api/private-courses/availability` |
| Member private requests / history | `GET/POST /api/member/private-courses` |
| Attendance / packages | Existing authenticated attendance and member dashboard APIs |

Selection helpers aggregate server results for presentation. Concurrent reservation enforcement, eligibility, prices, transaction records, expiration and package deductions remain backend-owned.

## Verification and limits

See `MOBILE-VERIFICATION.md` for executed checks and screenshot evidence. Authenticated browser captures are Expo React Native Web renders at mobile viewport sizes. They do not establish native keyboard, accessibility, camera or gesture behavior. The Android emulator launches the installed development client; native authenticated booking and actual iOS device testing remain release checks.


## Time picker refinement

Court and private-course time screens share `TimePicker`: Morning/Afternoon/Evening segments, illustrated day-part headers, two-column start/end cards and navy/gold selected states. Reanimated press/check/entrance feedback respects reduced motion. A sticky rental summary displays the chosen time. All schedule values and private-course availability remain sourced from the same APIs. See `artifacts/booking/time-picker/README.md` for executed checks and 320px/390px captures.


## Badminton navigation and multi-court rentals

The member main tabs are now Home / Badminton / My Bookings / Performance / Profile. The dedicated `/badminton` hub groups Court rental, Packages, Check-in and Private course; `/services` retains the same hub for existing links. Service screens keep Badminton selected. Shared `BookingProgress` uses graphical step icons and completed/current states; step content has reduced-motion-aware entrances.

Rental court selection now supports multiple courts, including both floors. Date/time changes clear court selections; changing floors preserves them. Every chosen court must fulfill all selected dates/hours. The existing provider merges unique session IDs, respects the backend selection limit, revalidates availability and submits one atomic request under the existing idempotency key. Individual editing and rescheduling remain single-session operations. Private coaching retains one court per session to match its coach-overlap and API contracts.

See `artifacts/booking/badminton-hub/README.md` for screenshots and verification (138 mobile tests, 17 backend court tests, 26 browser assertion/capture entries).


## Navy/gold and operational follow-through — 30 October 2026

The user's brand direction now overrides the older web-neutral token choice. Mobile uses the existing authentication navy `#101747` and gold `#DEAF46` for branded cards/buttons; real court colors and semantic status colors remain meaningful. Member/staff components share these tokens.

New routes: `/coach/[id]` for actual eligible coach/course profiles and `/courts` + `/courts/[id]` within the protected staff group for court reservations/cancellation review. Coach selection returns to private-course scheduling through Expo Router, retaining a server-listed course/coach pair. No unsupported biography or ratings are fabricated.

The shared backend adds `GET /api/court-booking/bookings`, restricted to Admin/Badminton FO and limited to the latest 300 court records with a safe user identity projection. Existing cancellation request/review APIs retain actor audit and independent refund state. The client now classifies business API 403 responses as forbidden. Court selection prevents exceeding the server-provided session limit before adding another court.

Evidence: `artifacts/booking/navy-workspaces/README.md`. Remaining product/release work is listed in `REMAINING-WORK.md`.
