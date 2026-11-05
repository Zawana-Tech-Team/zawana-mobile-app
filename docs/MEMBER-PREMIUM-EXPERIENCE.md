# Premium member experience — 30 October 2026

## Audit and scope

Implemented in the existing Expo SDK 57 mobile repository. The pasted brief names the web repository; that checkout remains the workflow/API/identity reference, not the implementation target. Inspected member Home, shared member navigation/buttons/dialogs, badminton hub, court/private booking flows, package discovery/activation/history, attendance/details, profile/avatar, notification validation/API wrappers and member routing.

The sibling web `src/components/NotificationBell.tsx`, `src/pages/Notifications.tsx` and registered notification routes in `backend/src/server.ts` establish current notification behavior. The older standalone `backend/src/routes/notifications.ts` is not the registered source of truth. The active server checks ownership/audience, returns the latest 100 messages, supports `history=1`, and marks an individual record read/archived. There is no bulk-read endpoint. Public production landing-page access succeeded in browser automation; only unauthenticated public content was inspected, with no production mutations.

Findings: Services and Badminton were aliases for the same hub; Home contained multiple competing cards, selectable unavailable facilities and a legacy display-only notification modal. Profile repeated package and activity counts. Confirmation dialogs and attendance/package sheets had different layouts. Notification `entityId` does not reliably identify court versus private course, while their detail workflows differ.

Plan completed: retain backend/auth/navigation architecture; introduce Services discovery; use one member-scoped notification store/center; standardize contextual surfaces; reduce Home/Profile clutter; expose existing payment records; verify real member workflows and responsive keyboard/dialog behavior.

## Changes and key files

| Area | Files/components | Result |
| --- | --- | --- |
| Services | `components/member/services-screen.tsx`, new `badminton-screen.tsx`, `app/(member)/badminton.tsx`, member navigation | Services is the primary entry point. Badminton opens its existing court/packages/check-in/private-course hub. High Performance Gym, Revive Clinic and Café have real existing imagery and Coming Soon labels, without booking actions. Existing staff workflows remain available. |
| Notifications | `notifications/provider.tsx`, `presentation.ts`, `components/member/notifications-screen.tsx`, `notification-bell.tsx`, `app/(member)/notifications.tsx`, member layout | Shared server-confirmed unread state; All/Unread, chronological groups, relative dates, category icons, empty/error states, individual/bulk read, direct contextual links, full-message sheet for announcements/long press. Foreground/focus/minute refresh. |
| Booking destinations | `booking/member-navigation.ts`, notification/Home/payment consumers | Known court and private-course records use their matching routes. Ambiguous notification IDs are resolved against the existing authorized private-course feed. Unrecognized/external/staff links are not launched. |
| Shared interactions | `components/shared/context-surface.tsx`, `quiet-ui.tsx`, member `ui.tsx`, attendance `ui.tsx`, `booking/selection-pressable.tsx`, `design/tokens.ts` | One safe-area/keyboard-aware contextual surface, mobile bottom sheets and compact desktop dialogs; consistent typography/spacing/radii/motion; disabled/loading states, focus/hover/press feedback, web focus containment/Escape and reduced-motion support. Existing court time sheet retains its specialized gesture/spring behavior. |
| Home | `components/home/member-home-screen.tsx` | Crowned-lion logo retained; one court CTA, next actual booking, package/coaching shortcuts, server package balance and Services entry. Unsupported-service actions and obsolete fallback panels removed. |
| Profile and payment records | `components/member/profile-screen.tsx`, new `payments-screen.tsx`, `app/(member)/payments.tsx` | Concise account actions; account details on demand, notifications, packages, attendance, private courses, payment records and guarded logout. Payment records reuse actual booking/purchase statuses; prices are not represented as collected cash/revenue. Avatar behavior is preserved. |
| Existing workflows | court/private booking, packages, attendance and receipts | Time/date/floor/multiple-court selection, backend availability, reschedule policy, package rules, payment confirmation and backend deductions preserved. |

Only shared UI, member screens, presentation/state helpers and QA drivers changed. No business endpoint, database schema, role, auth flow, production record or user `.env` change was required. No dependency was added.

## Notification behavior and integrity

Read state updates only from successful API responses. Mark-all uses the existing per-record calls; partial failures retain unread records and accurate badges. Existing read history remains available in All. Loading/error states do not fabricate an empty inbox. Unknown notification links retain the full message without launching unsupported functionality. Async navigation is ignored after the originating screen loses focus.

No local operational events, authoritative deduction calculations, inferred coach earnings, made-up payment methods or fake financial transactions were introduced.

## Executed checks

- TypeScript, Expo lint and `git diff --check` passed.
- 156 mobile tests passed, including notification allowlisting, malformed/external links, Yangon date groups, and court/private-course routing.
- Member premium browser suite: 20 assertion/capture entries, zero page exceptions. Actual shared backend reads/writes verify notification-to-owned-booking navigation, server read state, partial mark-all failure/retry, synchronized badges, inactive service cards, 320/390px layouts, 1280px dialog focus containment and Escape dismissal.
- Existing booking browser regression: 19 entries, zero page exceptions. Includes court reservation/edit, server-approved rescheduling and audit history, private-course request, booking history, package discovery/history and attendance calendar.
- Android, iOS Hermes and web static exports succeeded separately. The final combined Android/iOS/web export also passed. Native member automation could not finish: ADB stalled, and the cold-booted emulator remained offline. No new native member screenshots are claimed.

QA uses a migrated temporary SQLite database, real shared backend business routes and a local test-only password transport to the existing database-password verifier. Test notifications are seeded only into this isolated database. Browser screenshots are Expo React Native Web, not native-device proof. Current evidence and screenshots are indexed in `artifacts/member-premium/README.md`.

## Backend dependencies and release limits

- Notifications are limited to the latest 100 records. The UI discloses this when the cap is reached; mark-all applies to the loaded records. Full-history paging or a true entire-account bulk action needs a backend contract.
- Broadcast notifications currently share the server's `read` field; independent per-member broadcast read receipts require backend changes. The mobile app preserves the existing server behavior rather than fabricating local read receipts.
- Notification kind resolution and existing private-course detail views inherit the authorized feed's existing record limit. A dedicated ownership-scoped private-course-by-ID endpoint would remove that limitation for old notifications.
- Account editing/preferences and a comprehensive transaction ledger were not invented where no established mobile contract exists. Payment records show the actual existing booking/purchase data, with payment verification still server-owned.
- Authenticated iOS device testing, large text/screen-reader coverage, physical camera, provider/Firebase return, background/network scenarios and PostgreSQL concurrency remain release work. Successful JavaScript exports do not establish those behaviors.
