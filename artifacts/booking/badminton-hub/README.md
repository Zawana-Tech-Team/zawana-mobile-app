# Badminton hub and multi-court rentals

The member navigation is Home / Badminton / My Bookings / Performance / Profile. The Badminton hub opens Court rental, Packages, Check-in and Private course. Each service retains Badminton as its active tab.

Rental selection supports several courts at the selected dates/hours, including both floors. Selecting another floor preserves existing courts. Tapping a selected court deselects it; the selection list also supports removal. A selected court that no longer satisfies availability blocks continuation until corrected. Existing server maximum selections, availability revalidation and idempotent atomic submission remain in use. Rescheduling/editing still replaces one session, and private coaching retains the backend's one-court-per-session contract.

Booking progress now uses clock/calendar/floor/court/coach/package icons, completed checkmarks, a highlighted current step and Reanimated transitions that respect reduced motion. The existing building and real court arrangement are preserved.

Executed checks: lint, TypeScript and git diff checks passed. 138 mobile tests passed. 17 backend court tests passed, including atomic multi-selection and rollback on conflict. The isolated browser workflow passed 26 assertion/capture entries with zero page exceptions. It verified hub links/active navigation, booking edit, reschedule audit history, private-course submission, packages and attendance, then confirmed six sessions for three courts across both floors with a total matching API prices.

Captures are actual Expo React Native Web renders at 390px / 320px widths, not authenticated native-device screenshots. Relevant previews: `badminton-hub.png`, `badminton-hub-320.png`, `multiple-courts.png`, `multiple-floors.png`, `multiple-courts-review.png`.

Reproduce against fresh isolated fixtures with `MULTI_COURT_QA=1 MOBILE_QA_ARTIFACTS=artifacts/booking/badminton-hub node scripts/qa/booking-journeys.cjs`. Existing Playwright module/executable overrides apply. Both Android and iOS Hermes JavaScript exports also passed. Native authenticated interaction, camera and actual iOS rendering remain device checks.
