# Badminton membership and private-course implementation

Implemented on 21 October 2026 in `zawana-mobile-app` and the existing API in the neighboring `zawana-web-app` repository. No new native dependencies or database migrations.

## Mobile screens

- `/profile`: member identity, navy/gold membership card, real remaining sessions, upcoming booking count, recent visits, account details, sign-out.
- `/services`: badminton packages, private courses, check-in, court booking.
- `/membership`: active package, session balance, validity, package catalog, enrollment history, explicit activation confirmation.
- `/check-in`: eligible enrollment, explicit one-session confirmation, animated success, same-day protection and recent visits.
- `/private-course`: active coach → eligible session → building/floor → court → date and combined availability → review with a persistent price → coach request.
- `/courses`: requests, payment deadlines, verified confirmation, cancellation, history.

Home shortcuts and bottom navigation open these routes. Route guards still require the canonical authenticated member. Request loading, cancellation, app resume and periodic refresh reuse the existing focus-scoped resource hook. Entrance, selection and success motion respect reduced-motion settings.

## Existing API contracts used

| Operation | Actual route |
| --- | --- |
| Membership and check-in history | `GET /api/member/dashboard` |
| Badminton package activation | `POST /api/member/badminton-packages/:id/purchase` |
| Member check-in | `POST /api/member/check-in` |
| Active private courses with eligible coaches | `GET /api/private-courses` |
| Court inventory | `GET /api/court-booking/availability?date=YYYY-MM-DD` |
| Combined availability (added) | `GET /api/private-courses/availability?courseId=...&coachId=...&courtId=...&date=...&durationMinutes=...` |
| Member course requests/history | `GET/POST /api/member/private-courses` |
| Existing coach decision | `POST /api/coach/private-courses/:id/decision` |
| Payment initiation | `POST /api/member/private-courses/:id/pay` |
| Existing signed payment verification | `POST /api/payments/kpay/webhook` |
| Cancellation | `POST /api/member/private-courses/:id/cancel` |

The existing status names remain shared with the web client: `PENDING_COACH_CONFIRMATION`, `AWAITING_PAYMENT`, `CONFIRMED`, `COACH_DECLINED`, `CANCELLED`, `EXPIRED`, `COMPLETED`.

Combined availability checks coach eligibility and commitments separately from court bookings, maintenance, weekly/date blocks and closure overrides. Submission rechecks inside the transaction after locking court then coach. Server price is authoritative; `expectedPrice` detects changes after review. Existing pending-request reservation behavior is preserved. Acceptance opens the existing 24-hour deadline; cancellation, decline and expiry release resources and retain existing notification behavior.

The old member payment handler confirmed an unpaid booking. It now initiates the existing KPay adapter and lets the signed callback confirm payment. The web booking action was updated to navigate to its existing payment-status page. Live KPay requires merchant adapter credentials and a webhook secret; an unconfigured adapter returns an error and preserves the accepted reservation. No real charge was performed.

Package activation deliberately follows the existing API policy: online package payment is disabled, activation is immediate and settlement is arranged with the venue. The confirmation explains this before activation.

## Verification

- `npx expo lint`: passed.
- `npx tsc --noEmit`: passed.
- Mobile `npm test`: 110 passed, including API contracts, invalid responses, conflict errors and Yangon date boundaries.
- Backend typecheck: passed.
- Existing court HTTP suite: passed (14 tests including parent).
- New private-course HTTP suite: passed (12 tests including parent), using isolated SQLite databases and real Express routes. Covers independent conflicts, malformed times, 24-hour blocks, price changes, same-court and same-coach concurrency, notification writes, acceptance, payment deadline, ownership, forged/mismatched/valid/idempotent signed callbacks, expiry, rejection, cancellation, package activation and concurrent single-session check-in debit.
- Neighboring web client production build: passed. Existing bundle-size warning remains.
- Mobile Expo web static export: passed.
- Real Android API 37 development build and mobile-width Chrome captures are under `artifacts/membership/`. Authenticated through the existing seeded member sign-in flow. No authentication bypass or screenshot compositing.
- Android captures include profile, membership, check-in, services, course review and course history. Web captures include profile, services, coaches and floor selection. Screenshot filenames describe the screen, not a claim of Figma parity.
- Fixed a web SVG accessibility warning that intercepted bottom navigation, and separated court entrance/selection transforms to avoid Reanimated warnings.

## Visual comparison limitation

The supplied PNGs were inspected and their pixel data verified: `membership-profile-checkin.png` (4512×10122) and `private_course.png` (4352×12212) are entirely opaque white. The supplied FigJam node `103:1183` also rendered white. The Figma connector then returned its Starter-plan MCP call limit, preventing inspection of the remaining board. Screens use the existing app palette and components; exact Figma parity is **not verified**. A usable design export or restored Figma access is needed for that final comparison.
