# Badminton mobile UI — 30 October 2026

Current implementation/specification: [BADMINTON-MINIMAL-UI.md](../../docs/BADMINTON-MINIMAL-UI.md).

## Native Android

These captures came from the installed Android development build after UI password authentication against the isolated backend. The new coach landing page and five primary destinations were inspected. Screen headings were verified before the final captures.

- [Coach upcoming calendar](android/coach-calendar.png)
- [Coach attendance calendar](android/coach-attendance.png)
- [Coach Finance](android/coach-finance.png)
- [Coach notifications](android/coach-notifications.png)
- [Coach More](android/coach-more.png)

Native check covered coach layout/navigation and authenticated backend reads. It does not establish complete native attendance/payment mutation, provider, camera or iOS behavior. The coach's isolated test session remains available in the emulator.

## Expo React Native Web — mobile widths

[Visual results](results.json): 23 assertion/capture entries, zero page exceptions. These are browser captures, not Android/iOS screenshots.

- [Upcoming calendar, 390px](coach-upcoming-390.png) · [320px](coach-upcoming-320.png)
- [Coach month](coach-month-390.png) · [Attendance](coach-attendance-390.png) · [Student actions](coach-attendance-actions.png)
- [Private coaching](coach-private-coaching-390.png)
- [Notifications](coach-notifications-390.png) · [Full message sheet](coach-notification-detail.png)
- [Finance](coach-finance-390.png) · [Cash handovers](coach-cash-handovers-390.png)
- [Member attendance](member-attendance-390.png) · [Details](member-attendance-detail.png) · [Monthly summary](member-attendance-summary.png)
- [Member packages](member-packages-390.png) · [320px](member-packages-320.png) · [Package balance detail](member-package-detail.png)
- [Package discovery](member-package-explore.png) · [Description and rules](member-explore-detail.png)

## Integration evidence

[Coach integration results](workflows/results.json): 21 entries, zero page exceptions. Actual shared backend routes cover coach attendance notes, notification read/history, booking with cash, completion/rejection, partial cash handover and authorized FO receipt. A dropped committed response followed by reload/re-login/retry recovers the original handover; database checks verify one allocation and receipt. See `workflows/` for review and receipt captures.

[Four-role results](four-role-results.json): 30 entries, zero page exceptions; acceptance, collection, attendance/correction, FO booking, QR/check-in and category-correct Social deduction while Foundation remains unchanged.

151 mobile tests, TypeScript and Expo lint passed. Logs are included alongside the screenshots. No backend business changes were made for this UI refinement. Integration data uses a temporary migrated SQLite database and test-only database-password transport. Production accounts, the user's `.env` and Firebase configuration were unchanged. Earlier Gym-inclusive portal screenshots/results are historical; Gym has been removed from the current mobile coach experience.
