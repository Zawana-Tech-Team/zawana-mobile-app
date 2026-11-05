# Badminton mobile refinement — 30 October 2026

The latest product direction supersedes the earlier Gym-inclusive coach brief. The mobile coach experience is badminton only. Shared backend Gym records/endpoints remain intact.

## Navigation and interaction

Coach primary tabs: **Calendar · Attendance · Coaching · Finance · More**. Authenticated coach sign-in and saved Overview links open Calendar. Old Training links redirect to Coaching. Customers are derived only from assigned private-course records; the mobile coach screens no longer load Gym feeds.

Calendar opens to the next fourteen days, with a swipeable date strip, session markers and compact time-rail cards. Week and Month are secondary views. Selecting a date filters to that day while retaining the strip's original range. Today restores the upcoming range. Empty days do not become absence records. Calendar and attendance times remain Yangon time.

Notification lists show a title, short preview, date and unread dot. Tap for the complete message, supported booking destination and server-confirmed mark-read. No notification state changes optimistically.

Member and coach attendance use a shared calendar-first screen with Calendar/History, a quiet monthly attendance count, and a Summary sheet containing search, real counts and the status legend. Rows open details. Coach marking actions and notes appear only after selecting an eligible student session. Existing Admin/FO operational marking and audited correction controls remain available.

Packages use compact pass cards showing the server balance ring and expiry. Tap for status, validity, total sessions and attendance. Explore cards reveal descriptions/rules on demand. Activation still explicitly confirms immediate activation and venue payment; no payment verification or deduction happens locally.

Finance opens to cash custody, Payments and Cash handovers. Payment audit fields, handover collection inputs and receipt histories expand on tap. Selected amounts remain visible in collapsed collection summaries. Payment filters apply only to Payments, preventing accidental filtering of available handover cash. Existing immutable saved requests, partial allocations, ownership checks, receiver acknowledgment and retry protection are preserved. Collections are not presented as earnings.

## Shared presentation

Navy `#101747`, gold `#DEAF46`, warm-white surfaces; existing crowned-lion logo retained. New `quiet-ui.tsx` provides press-motion rows, safe-area detail sheets, session balance rings and short entrance transitions. Reanimated motion respects system reduced motion. Default cards contain primary information; full records remain available by tap.

New shared attendance implementation: `src/components/attendance/calendar-screen.tsx`. New primary coaching screen: `src/components/staff/coaching-screen.tsx`. Existing role permissions, API client, authentication, financial sources/methods and deduction services are reused. No backend business changes or user environment changes were needed.

## Executed verification

- Mobile TypeScript and Expo lint passed; 151 mobile tests passed.
- Four-role integration regression: 30 assertion/capture entries, zero page exceptions.
- Coach integration regression: 21 entries, zero page exceptions. Includes attendance notes, notifications, private booking/completion/rejection, actual cash collection, partial handover and FO receipt. A committed response is deliberately lost, followed by reload/re-login/retry recovering the same handover without duplicate allocations.
- Read-only mobile-width UI checks: 23 entries, zero page exceptions, across 390×844 and 320×740. Calendar, notification sheets, attendance summaries/details, package balances and discovery details were exercised.
- Android development build: authenticated coach sign-in reached the new Calendar landing page against the isolated backend. Native captures are stored under the artifact directory; only verified captures are included.

Current screenshots/results: `artifacts/badminton-minimal/README.md`. Integration tests use migrated temporary SQLite and actual shared backend business routes. A local QA-only password transport maps the mobile login to the existing database password verifier; it does not bypass application session/role guards. Browser captures use Expo React Native Web. No production data was touched.

## Remaining release checks

Full authenticated iOS device testing, screen-reader/large-text coverage, physical camera/QR and provider flows, background/network transitions, and PostgreSQL concurrency/deployment checks remain. Existing list/calendar feeds retain backend limits; no fake pagination or invented totals were introduced. Prior backend integrity results in older verification sections were not rerun for this UI-only increment.
