# Immersive booking redesign — 16 October 2026

## Source and scope

The user explicitly authorized `assets/ref/booking_ui.png` as the implementation reference after Figma MCP reached its Starter-plan quota. The architectural and court drawings are recreated as code-native SVG from that reference. They are not Figma exports. Exact layer values, fonts and interactive prototype motion could not be retrieved, so pixel-perfect Figma parity is not claimed.

Only the existing booking date and court/time presentation is redesigned. Routes remain `/book/dates` → `/book/times` → `/book/summary` → `/book/review`. Floor selection and court selection are stages inside the existing times screen. No parallel booking system, backend, Prisma/schema/migrations, API contract, authentication, payment, dependency or native-project changes were made.

## Architecture reused

- `BookingProvider` remains the single owner of selected dates, sessions, notes, selection limits, pending submission recovery and conflict reconciliation.
- `api.getCourtMonth(month, { signal })` provides real monthly availability. `api.getCourtAvailability(date, { signal })` provides courts, hourly sessions, server prices and statuses.
- `useResource` retains focus/resume/minute refresh, cancellation, stale-response protection and retry behavior. Selecting floors/courts adds no API calls.
- `booking.toggle(slot, data.maxSelections)` preserves multi-slot, multi-court and multi-date selections. `booking.refresh(data)` reconciles the server's availability/prices. Existing `money` and `total` render prices; no mock slots or prices are introduced.
- Summary, review, payload creation, idempotency, conflict handling, confirmation and payment remain unchanged.
- Live `court.surface` metadata maps courts to the floor presentation. The user confirmed Courts 1–4 on the 2nd Floor and Courts 5–8 on the 6th Floor. Actual court names and IDs are retained; unsupported metadata is reported rather than guessed.

## Frontend files

| File | Responsibility |
| --- | --- |
| `src/booking/date-policy.ts` | Yangon-local current-month booking restriction. |
| `src/booking/use-booking-date-window.ts` | Recalculates on focus, resume and Yangon midnight. |
| `src/components/booking/date-screen.tsx` | Reference calendar, circular selections, current-month notice, preserved multi-date chips and guarded Continue. |
| `src/components/booking/time-screen.tsx` | Existing availability integration, floor/court stages, date switching, cart access and Android Back behavior. |
| `src/components/booking/journey-frame.tsx` | Booking-only header, progress, type/color tokens, date ribbon, footer and animated button. |
| `src/components/booking/journey-motion.ts` | Shared motion durations, easing and system reduced-motion policy. |
| `src/components/booking/building-illustration.tsx` | Layered architectural SVG, floor highlights, dimming, parallax and 650 ms camera-style entry. |
| `src/components/booking/court-presentation.ts` | Metadata-based floor grouping and green/red surface colors, preserving server identifiers. |
| `src/components/booking/court-plan.tsx` | Memoized badminton SVG, court markings/nets, four-court row, gold selection and disabled states. Large text/additional courts can scroll horizontally. |
| `src/components/booking/time-slot-sheet.tsx` | Modal sheet, spring entry, drag-handle/backdrop/close/Android Back dismissal, two-column sessions and scrollable real availability. |
| `tests/booking-presentation.test.ts` | Date boundaries, leap years, Yangon/year/month rollover and floor mapping/ID preservation. |

## Interaction and motion

- Date selection and buttons reuse the existing `SelectionPressable` UI-thread press animation. Date → building uses the existing router transition plus staggered entrances.
- Selecting a floor highlights its windows, dims other floors, and adjusts the camera. Enter Floor locks repeat taps and animates scale/translation/rotation for 650 ms before revealing courts.
- Court cards reveal progressively; selecting a court adds a gold outline, scale/translation feedback and surrounding dimming, then opens its times sheet.
- The sheet uses a 320 ms spring and 200 ms dismissal. Dragging is confined to the handle so court/date scrolling and session scrolling do not compete.
- Shared animation configurations respect system reduced motion. Navigation/submission rules and the provider's idempotency logic are retained.
- Available sessions are individually selectable; Class/Booked/Reserved/closed/maintenance/expired sessions stay disabled. Partially occupied courts stay selectable. Empty, loading, error/retry and expired-date feedback are included.
- Returning from the sheet, changing floors or dates, and navigating backward preserve the provider's valid selection. Invalid dates are removed through existing `setDates`; immutable pending submissions are not edited.

## Verification

- Automated run: **103 tests passed**, zero failures; includes existing authentication/booking transport, status, multi-selection, pricing, conflict and duplicate-submission regressions plus five presentation-policy tests.
- TypeScript and Expo lint passed. A React compiler lint finding around a gesture callback was fixed without disabling the rule.
- Final Android/Hermes export passed: `/tmp/zawana-immersive-booking-final`. [Export log](immersive-android-export.txt). This is bundling evidence, not a release build.
- The existing signed-in Android emulator and real development API rendered the new flow. Native screenshot review found and corrected calendar corner rendering, floor-label placement, delayed highlight colors and the session grid layout.
- The first full native pass verified date → building → floor → courts → sheet, two selected sessions, a physical tap ignored by a disabled Class session, Android Back dismissal, retained selections on reopening, cleanup of the two temporary additions, and return to the green courts. It retained the existing selected dates, 21 and 22 October, and the original cart through navigation.
- The corrected sheet's two columns were independently verified by actual UIAutomator slot bounds: `[63,1292][528,1455]` and `[549,1292][1013,1455]`. Its height/scroll area and a real camera-zoom frame were captured and inspected.
- The app returned to its signed-out welcome screen during the final pass, before summary and small-screen verification. That pass only edited ephemeral client selection; it never submitted a reservation. The first pass's temporary additions had already been removed. No authentication bypass or persistent booking/payment changes were made.
- Final lint, TypeScript, all 103 tests and `git diff --check` passed. [Test log](immersive-mobile-tests.txt), [verification record](immersive-verification.json).

## Native captures and comparison

The following are actual ADB screenshots inspected against the user-provided PNG. They are not rendered mockups or composites. Standard viewport: 1080×2400 pixels, 420 dpi (approximately 411×914 dp).

| State | Evidence / status |
| --- | --- |
| Date selection | [Calendar](android/redesign-date-selected.png): current month, circular selections, disabled past dates, current-month note and retained multi-date choices. |
| Default building | [Building](android/redesign-building-default.png): recreated architectural proportions, roof, glazing, floor targets and brand sign. |
| 2nd Floor | [Selected floor](android/redesign-floor-2-selected.png): gold label/windows on the lower selectable floor. |
| 6th Floor | Selection, mapping and entry were exercised; a settled final static screenshot remains pending after sign-in. The earlier rapid captures were not mislabeled as passing final evidence. |
| Floor entry | [Actual zoom frame](android/redesign-floor-zoom.png): Enter the arena, enlarged/translated/rotated building and highlighted upper floor. |
| Bird's-eye courts | [Green 1–4](android/redesign-green-court-layout.png), [red 5–8](android/redesign-red-court-layout.png): four actual courts together, markings/nets, backend names. |
| Selected court | [Gold selection](android/redesign-court-selected.png): captured before the final change making surrounding-card dimming authoritative React state. That final dimming adjustment is not recaptured. |
| Time sheet | [Corrected two-column sheet](android/redesign-times-open.png): live Class/available states, server prices, rounded top, close/handle, scrolling content and fixed Continue. |
| Selected sessions | [First-iteration functional evidence](android/iterations/redesign-times-selected-one-column.png): selected styling and totals passed before the column fix. A final two-column selected-session capture remains pending; this older layout is not presented as the final design. |

The comparisons drove the Android corner fix, floor-label position, authoritative floor color, numeric column widths and sheet height cap. The PNG's illustrative 6th-floor labels 1–4 are intentionally displayed as actual Courts 5–8. Real dates, prices, Class sessions, extra dates and existing cart entries take precedence over the illustrative data. System typography and recreated SVG geometry remain approximate rather than exact Figma exports.

## Limits

Exact Figma asset/font/layer inspection remains unavailable. System fonts are used because authorized brand font files are not bundled. Building geometry and palette are recreated from the PNG. The emulator intermittently returns empty UIAutomator hierarchies; retries must require a fresh dump rather than reading a stale XML file. The Android system animator scale was observed as `0`, but a camera transition was actually captured; a reduced-motion restart/preference-change test is therefore still pending. No sustained 60 FPS claim is made.

Backend conflict and duplicate-submission handling are covered by the existing automated suite and retained implementation; a new live reservation/conflict transaction is outside this visual QA. The 360×640 native check, final Continue → summary check, final settled 6th-floor/selected-session captures, iOS, physical-device performance and VoiceOver/TalkBack interaction remain unverified. Native loading/empty/error/retry scenarios were not forced; their existing hook/feedback paths are retained and the presentation handles them.

The initial workspace already contained a modified `.expo/devices.json` and the untracked reference PNG; those user artifacts are preserved.
