# Remaining work — 30 October 2026

Completed baseline: protected member/coach/Admin/FO workspaces, Badminton hub, time-first multi-court rentals across floors, private requests and supported coach profiles, booking history, calendar attendance, category-correct QR check-in, authorized private-course cash collection, course management, selected-record finance summaries, member court rescheduling and Admin/FO court cancellation review. The brand now uses navy and gold.

Next product increments:

1. Staff-assisted court creation for a selected member, and a staff reschedule selector. The existing creation endpoint binds the actor as owner; do not submit FO-owned bookings while pretending to book for a member. Establish/reuse a shared backend contract and explicit authorization first.
2. Broader member/package operations: verify actual staff APIs and package activation/payment rules before adding mutation forms.
3. Broader Admin financial reporting using verified transaction/allocation/settlement records. Coach partial handover, FO receipt and scoped payment history/filtering are implemented. Legacy dashboard snapshots and the staff court feed remain capped at 300 records. The new Finance page uses the full server-authorized report for its selected session-date filters; this is not an earnings or independently verified global revenue report.
4. Broader Admin/FO notification entry points. The coach inbox/history and server-confirmed mark-read are implemented; no placeholder alerts.
5. Court map detail/gesture improvements where they improve selection without changing the existing arrangement.

Release verification:

- Deploy the paired shared-backend changes before enabling the new staff court feed in production.
- Signed-in Android/iOS device tests: safe areas, keyboard/back/background, screen readers/large text, reduced motion and real camera permission/QR behavior.
- Real Firebase/provider return/session restoration and authorized payment-provider return flows.
- PostgreSQL concurrency and migration tests against a designated test database; production deployment was not performed.

No separate mobile backend, new roles, fake financial records or authoritative local package deductions are required for these tasks.


Coach portal delivery: see `COACH-PORTAL-PARITY.md`. Supported badminton coach workflows are implemented: Calendar, Attendance, Coaching, Finance and More, with notifications/students, coach booking, receipts and partial handovers. The latest badminton-only direction removes Gym from mobile navigation and loading. See `BADMINTON-MINIMAL-UI.md`. Remaining coach work is release/device/provider/PostgreSQL verification and optional backend feed pagination/session-detail improvements, not placeholder financial or attendance screens.
