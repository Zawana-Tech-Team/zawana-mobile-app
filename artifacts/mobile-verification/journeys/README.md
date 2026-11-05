# Booking and calendar verification

These are actual Expo React Native Web screens captured at 390×844 (attendance also at 320×740), backed by an isolated temporary SQLite database and the real booking services. They are not native-device captures. No production records were used.

- `rental-time.png`, `rental-floor.png`, `rental-court.png`, `rental-review.png`: requested court booking sequence and preserved artwork.
- `court-booking-detail.png`, `reschedule-review.png`: confirmed reservation and revision-protected replacement review.
- `private-coach.png`, `private-review.png`: package-first private coaching and request review.
- `booking-history.png`: unified coaching/court booking list.
- `packages-explore.png`, `packages-history.png`: package discovery and history.
- `attendance-calendar.png`, `attendance-calendar-320.png`: selected-day attendance and status legend.

`results.json` records the successful member journey: sign-in, booking/edit submission, reschedule with persisted audit history and private request submission, plus screenshot entries. Both this run and the staff/check-in regression run reported zero browser page exceptions. The parent directory contains the regression evidence.

Native authenticated journeys, actual iOS rendering, camera capture and native keyboard/accessibility remain device verification tasks. Android emulator welcome rendering is separately captured in `../android/`.
