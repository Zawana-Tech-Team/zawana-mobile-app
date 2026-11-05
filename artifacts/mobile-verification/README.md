# Mobile workflow captures

Actual Expo React Native Web captures from an isolated local SQLite QA backend on 29 October 2026. Test accounts are visibly named `QA …`; no production bookings, payments or attendance were created. These are browser previews of the native source, not iOS/Android device screenshots. Some viewport captures include Expo's development toolbar. The receipt image captures the entire rendered receipt card.

| Capture | Evidence |
|---|---|
| [Coach dashboard](coach-dashboard-390.png) | Authenticated coach summary and navigation |
| [Accepted request](coach-accepted-request-390.png) | Server-confirmed decision; payment still required |
| [Cash receipt](coach-cash-receipt-390.png) | Recorded amount, booking, collector, method/source, verification and receipt reference |
| [Coach calendar](coach-calendar-390.png) | Assigned sessions from the calendar API |
| [Coach attendance](coach-attendance-390.png) | Saved attendance record |
| [FO Social QR](fo-social-qr-390.png) | Actual category-specific test QR |
| [FO booking creation](fo-create-booking-390.png) | Member/course/coach/court/time selection |
| [Member attendance](member-attendance-390.png) | Shared attendance history |
| [Attendance details](member-attendance-details-390.png) | Server detail and participant history |
| [Social preview](member-social-preview-390.png) | Backend-selected Social package and expected balance |
| [Social confirmation](member-social-confirmed-390.png) | Actual confirmed deduction and final balance |
| [320px attendance](member-attendance-320.png) | Narrow-screen navigation and layout |
| [Network failure](member-attendance-network-error-320.png) | Connection error and retry control |
| [Admin overview](admin-overview-390.png) | Admin workspace navigation |
| [Admin course catalog](admin-course-catalog-390.png) | Reloaded, persisted 55,000 MMK course price |
| [Admin correction](admin-attendance-correction-390.png) | Persisted attendance correction with audit reason |

[Machine-readable browser results](results.json), [mobile test output](mobile-tests.txt), [backend test output](backend-tests.txt), [native bundling](native-bundles.txt), [Expo Doctor](expo-doctor.txt).
