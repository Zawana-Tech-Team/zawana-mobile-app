# Authentication implementation

## Discovery

- Expo 57 / React Native 0.86 / Expo Router / NativeWind 4.2.7. Only the Get Started route exists; there is no implemented member Home or auth guard.
- References and their screen mapping are recorded in `discovery/REFERENCE-INVENTORY.md`. The original photo backgrounds and Gotham font files are absent.
- Current shared backend checkout: `../zawana-web-app`, HEAD `f2a7062`, confirmed against the supplied GitHub repository.
- Firebase Admin verifies and checks revocation of identity tokens. `/api/auth/session`, `/auth/complete-profile`, and `/auth/me` use the shared member records.
- Existing session/profile endpoints require verified email. They reject primary phone-only identities. Phone SMS exists only as MFA after password; the phone field is not unique. The requested phone OTP → password journey is therefore not currently supported.

## Execution sequence

1. Preserve the existing Get Started screen and replace the constructed wordmark with official complete brand artwork; wire navigation.
2. Build reusable safe-area/keyboard-aware layouts, form fields, buttons, password visibility, verification controls, errors, and progress components.
3. Implement entry, verification, password, profile, account details, password creation, and completion routes with state preserved across back navigation.
4. Integrate the agreed Firebase contract, encrypted device session persistence, canonical backend profiles, restoration, and protected routes. Never bypass verification or manufacture a successful response.
5. Connect an authenticated Home to the existing member dashboard API. The Home image is a design, not an existing implementation.
6. Run tests, lint/typecheck, and native bundle checks; capture native screenshots if a device runtime becomes available. Keep all captures/diffs under this development QA directory.

## Blocking contract decision

Requested phone OTP before password conflicts with the verified-email/password-first backend. A question is pending with the user. UI and API work can proceed independently; identity/schema changes must wait for the answer.

## Runtime limitations

This Windows host has no working native simulator/emulator. iOS Simulator requires macOS; EAS Simulator is limited-access preview and Expo CLI is not signed in. Expo Go on a physical iPhone requires the same signed-in Expo account on CLI and phone. No native screenshots have been captured.
