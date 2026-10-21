# ZAWANA hybrid authentication setup

The mobile implementation supports email/password, phone/Firebase SMS OTP, Google, and native Apple on supported iOS devices. It uses Expo SDK 57 and React Native Firebase 26.4 with the existing native adapters. Backend implementation and contracts are documented in the sibling web repository's `docs/PHONE_OTP_LOGIN.md`.

## Session and onboarding behavior

Backend application sessions authorize navigation and API calls. Firebase SDK persistence alone does not. Access credentials remain in memory; rotating refresh credentials use SecureStore. Refresh is serialized, and canceled or superseded authentication cannot restore an abandoned session.

Phone login uses the registered phone number and a fresh Firebase SMS OTP, then opens Home after the backend issues a validated application session. It never routes to Enter Password, Set Password or account linking. A unique existing contact number can sign in without previously linking a Firebase phone identity; successful OTP sign-in enrolls that verified phone identity atomically against the preserved application user. Ambiguous phone records and conflicting Firebase user mappings return support guidance without a password fallback.

Email login continues to require the account email and password. New registration still provisions the email/password method; explicit account-linking operations remain separate from phone sign-in. Staff and unsupported MFA flows direct users to web authentication. Account disablement, canonical revocation, proof expiry and replay checks remain enforced for OTP sessions and refresh.

Deploy the matching sibling backend before this mobile update. `POST /api/auth/mobile/challenge` returns `next: "session"` for sign-in. `POST /api/auth/mobile/phone-login` accepts only `{ challengeToken, remember }`. The old `/mobile/password` endpoint is removed. The app rejects backend sign-in responses that request a password or linking step. No database schema changes or migrations are required.

Use the separate canonical email/password identity and phone-only identity created by backend enrollment. Never add a password to the Firebase phone identity as a substitute. Apple relay addresses are supported; existing identity details survive omitted subsequent Apple fields.

## Local emulator testing

Cloud EAS builds are deferred by request. Reuse the installed Android development client while testing JavaScript changes. Expo Go cannot load these native authentication modules.

Start the backend from the sibling repository (after reviewed migrations):

```sh
cd ../zawana-web-app/backend
npm run dev
```

Then start Metro and connect Android:

```sh
npx expo start --dev-client --host lan
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
```

Set `EXPO_PUBLIC_API_URL` to the reachable local API, including its existing API path convention. Never include Firebase Admin credentials in mobile `.env`. The current Android emulator/development APK successfully loads updated source and reaches the local API. Invalid email/password returns a safe error without opening Home.

A Firebase Authentication Emulator does **not** send real SMS. Use its displayed/test verification code, or configure fictional Firebase phone numbers and fixed codes, for repeatable testing. Production Firebase on an Android/iOS simulator can send real SMS when configured and permitted; the recipient phone receives it. App verification, billing and quota still apply. Backend Firebase Admin and REST password authentication must use the same intended emulator/project environment; do not mix emulator proofs with production authorization.

The existing iOS native project requires Xcode and a compatible signed development client. Only iOS JavaScript/Hermes export was verified here; this Mac's command-line setup does not currently expose `simctl`. Native configuration changes require rebuilding the development client, locally or through EAS later.

## Native configuration

Project: `zawana-54de8`; Android package/iOS bundle: `com.zawana.mobile`. Existing public native Firebase config files live under ignored `firebase-config/`. Google Web/iOS OAuth configuration and URL scheme are reused. RNFirebase 26's default Swift Package Manager integration is retained; no dynamic-framework override is added.

The Android emulator APK's public debug fingerprints were registered in Firebase during this implementation:

```text
SHA-1: 5E8F16062EA3CD2C4A0D547876BAA6F38CABF625
SHA-256: FAC61745DC0903786FB9EDE62A962B399F7348F0BB6F899B8332667591033B9C
```

Verify the certificate for every differently signed development/production APK. Previous EAS build certificates remain separate. No billing or provider configuration was changed by this hybrid implementation.

For iOS, confirm Sign in with Apple capability, bundle/team provisioning, APNs configuration for Firebase phone authentication, Google URL scheme and Apple provider configuration. Existing Apple adapter validates state and nonce and handles cancellation. Real Apple authentication has not been exercised here.

Register Firebase's sender (normally `noreply@zawana-54de8.firebaseapp.com`, or your configured custom sender/domain) with Apple's private email relay service in the Apple Developer account before testing verification/recovery mail to relay addresses. This account-level operation was not performed here. Follow [Firebase Apple guidance](https://firebase.google.com/docs/auth/ios/apple) and [Expo AppleAuthentication](https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/).

## Validation

```sh
npm run typecheck
npm run lint
npm test
```

106 mobile tests and all 83 sibling backend tests pass. Both projects pass TypeScript, and the mobile app passes Expo lint. Coverage includes the password-free OTP exchange, email/password enforcement, proof expiry/replay, canonical account revocation, MFA, refresh, and protected HTTP requests. Tests use provider fixtures; they do not establish successful live SMS/Google/Apple sign-in. A successful live SMS sign-in was not exercised for this change.

Before release, test successful linked-member login using all four methods, complete onboarding with fictional numbers, offline/restart/cancellation, method switching, provider consent denial, account recovery and revocation. Then separately test real Myanmar SMS, Google and Apple on supported physical devices, including APNs/reCAPTCHA fallback and Apple relay delivery. Production deployment, real-provider acceptance and EAS cloud builds remain pending.
