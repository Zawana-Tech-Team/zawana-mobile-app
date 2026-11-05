# Premium member experience

[Audit, implementation inventory and limitations](../../docs/MEMBER-PREMIUM-EXPERIENCE.md).

## Screenshots

Expo React Native Web at mobile and desktop widths:

- [Home, 390px](member-home-390.png) · [Home, 320px](home-320.png)
- [Services, 390px](services-390.png) · [320px](services-320.png) · [Desktop](services-desktop.png)
- [Preserved Badminton hub](badminton-hub.png)
- [Notification center](notifications-390.png) · [Message sheet](notification-detail-sheet.png) · [Partial read failure](notifications-partial-failure.png)
- [Payment records](payment-records-320.png)
- [Profile](profile-390.png) · [Desktop account dialog](account-dialog-desktop.png) · [Mobile confirmation](signout-confirmation-320.png)
- [Public production reference](production-reference.png): unauthenticated landing page only.

[Premium suite results](results.json): 20 assertion/capture entries, zero page exceptions. Covers real notification read/navigation and partial mark-all recovery plus accessibility/responsiveness. [Booking regression results](booking-regression/results.json): 19 entries, zero page exceptions, including actual reservation, reschedule, private request, package/history and calendar flows. Each suite uses the isolated real backend and seeded test records. This is not production verification.

Native Android member verification could not finish: ADB hierarchy/screenshot calls timed out, and the cold-booted emulator remained offline. No new native member screenshots are claimed. See `native-verification.log`. Authenticated Android/iOS rendering, provider/camera and PostgreSQL testing remain outstanding.

156 mobile tests, lint and TypeScript passed. The final combined Android/iOS/web export passed; build and test logs are included in this directory. No production writes, environment edits, authentication bypasses or dependencies were introduced.
