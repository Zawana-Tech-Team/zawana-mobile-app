# ZAWANA native authentication handoff

## Implemented

The existing Get Started, Sign In and Sign Up screens now call real Firebase authentication. Native platforms use React Native Firebase 26.4.0; the existing Firebase JavaScript adapter remains web-only. Both use the same `zawana-54de8` project and Firebase UIDs. Existing email functionality remains available. Installing the native adapter requires a fresh sign-in; old JavaScript SDK persistence is not migrated into native storage.

- Google: native Credential Manager/Google authentication through Nitro Google Sign-In 2.3.0, then Firebase credential authentication.
- Phone: maintained `libphonenumber-js/max` validation, Myanmar default, E.164 normalization, native Firebase SMS/app verification and six-digit confirmation in Verify.
- Apple: native iOS authorization, random state, SHA-256 nonce, Firebase credential exchange and first-authorization name handling. The button appears only when Apple's native API reports availability.
- Session: Firebase SDK persistence, startup restoration and token refresh; every member session must also pass the existing backend's `POST /api/auth/session`. Protected routes require its canonical user and existing authorization rules. Sign-out immediately removes local route access, then clears identity, pending verification and registration metadata.
- OTP: a 60-second client resend cooldown, Firebase-enforced attempt/expiry/abuse checks, a conservative ten-minute local challenge lifetime, error recovery and cancellation guards. Only phone/timing metadata persists in SecureStore. Codes and Firebase confirmation credentials stay in memory. After restart the user requests a fresh SMS after the remaining cooldown.

Get Started/Sign In/Sign Up were preserved apart from necessary authentication callbacks, state and validation. Verify uses the supplied six-box design with loading, resend and recovery states. Voice verification is unavailable and the existing button explains this. Password and new onboarding screens were not implemented in this task.

## Native Firebase configuration found and prepared

Both files were found directly in Downloads, including the iOS file previously thought missing:

| Setting | Actual value/location |
| --- | --- |
| Firebase project | `zawana-54de8` |
| Android package | `com.zawana.mobile` |
| iOS bundle identifier | `com.zawana.mobile` |
| Android SDK config | `firebase-config/google-services.json` |
| iOS SDK config | `firebase-config/GoogleService-Info.plist` |
| Google Web OAuth ID | Read from Android SDK config; configured locally in `.env` |
| Google iOS OAuth ID and URL scheme | Present in the iOS plist; URL scheme configured through the plugin |

`app.json` and `app.config.ts` configure native Firebase, Google, Apple, development client, APNs entitlement and development-only HTTP. Native directories remain generated through Expo config plugins. These public SDK files are ignored by Git but included in EAS uploads. `.env` and all private Admin/Apple/signing credentials are excluded from EAS uploads. The downloaded Firebase Admin key was **not** copied into the mobile project.

The existing backend's credentials were used to register the actual EAS Android signing certificate and enable Myanmar in the existing SMS region allowlist. Both operations returned HTTP 200. The refreshed Android SDK file contains Android and Web OAuth clients. Read-back confirmed Google and Phone providers enabled, Myanmar permitted and localhost authorized. No billing settings were changed. Other SMS regions must be enabled separately before promising international delivery.

Signing certificate registered in Firebase and extracted from the actual APK:

```text
SHA-1:   BC08D1EEA6148D209239122AB1D5ADD72153185D
SHA-256: 2C287BE0F71522A295F302C6A5F9E02B11D3D22B1C34D9931D1D5C97A189F424
```

Register each additional production/Play App Signing certificate before testing builds signed with it. The QA extraction script reads the APK certificate; it does not perform full APK signature validation.

## Android development build

The EAS Android development build finished successfully; this is actual native compilation, not just a JavaScript export.

- [Build details](https://expo.dev/accounts/zawana/projects/zawana-mobile-app/builds/a5d75ffb-1cec-49cf-b1da-55326ca3d477)
- [Install APK](https://expo.dev/artifacts/eas/matGEMEE51MbUPnrViYFMOZtEi7lskMDaw4kczIjsmY.apk)
- Local copy: `artifacts/auth-visual-qa/zawana-development.apk` (ignored by Git).

EAS project: `104df23b-6450-4217-be6c-7d1ecf98689f`, owned by `zawana`. **ASSUMPTION:** the existing ZAWANA organization is the intended owner; this was stated while awaiting the account preference. Signing material remains on EAS and was not exported.

Install the APK on an authorized Android device with Google Play Services. Expo Go cannot load these native Firebase/Google modules. The dev client loads the latest JavaScript from Metro; later JavaScript changes do not require rebuilding the native binary. Regenerate a build when native configuration/dependencies change:

```powershell
npx eas-cli@latest build --platform android --profile development
```

## Reach the existing backend from a physical device

The backend remains the existing Express application on port **8000**. Its actual route prefix is `/api`; mobile accepts either the origin or an explicit `/api` base without duplicating the prefix.

| Runtime | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Web on this PC | `http://localhost:8000` |
| Android emulator | `http://10.0.2.2:8000` |
| Physical phone on this Wi-Fi | `http://192.168.100.72:8000` (current Wi-Fi IP; recheck after network changes) |
| iOS simulator on the backend's Mac | `http://localhost:8000` |

**Current blocker:** the backend runs inside WSL and Windows forwards it only to localhost. The physical-device LAN address was tested and is currently unreachable. This process does not have Administrator privileges, so the required Windows port-forward/firewall action has not run.

1. Open **Administrator PowerShell** on the PC. On a trusted Private Wi-Fi network run:

   ```powershell
   & 'C:\Users\HP\Documents\zawana-mobile-app\scripts\setup-dev-api-network.ps1'
   ```

   The script forwards the current Wi-Fi interface's port 8000 to the existing WSL backend and allows only the local subnet on the Private firewall profile. It does not start a second backend. Rerun it after WSL/Wi-Fi addresses change.

2. Put the URL printed by the script in the ignored mobile `.env`, with `APP_ENV=development`. The current `.env` remains `http://localhost:8000` for local checks; it must be changed for a physical phone.

3. Restart Metro after changing environment variables:

   ```powershell
   npx expo start --dev-client --lan --max-workers 1
   ```

4. Put the phone on the same Wi-Fi. Open `http://<PC-IP>:8000/api/auth/session` in its browser to confirm reachability: an authentication/method error proves connection, not a successful login. Then open the dev-client Metro link and test real authentication.

The existing backend was restarted with IPv4-first DNS because Google OAuth requests timed out over WSL's default IPv6 path. If starting it manually in WSL, stop its previous instance first and use its existing entrypoint:

```bash
cd /mnt/c/Users/HP/Documents/zawana-web-app/backend
NODE_OPTIONS=--dns-result-order=ipv4first ./node_modules/.bin/tsx watch src/server.ts
```

Development CORS includes localhost/127.0.0.1:8081 for browser checks. Native requests do not require browser CORS. Production builds reject an HTTP API endpoint and must use HTTPS.

## Backend identity and onboarding boundary

Firebase Admin verifies ID tokens, including revocation. An SDK-verified phone identity or verified email can resolve an existing application account **only by Firebase UID**. Matching email/phone never silently binds or merges accounts. Active-account, role and MFA requirements remain enforced.

An unknown UID returns `428 PROFILE_REQUIRED` and cannot enter protected Home. Existing onboarding routes are preserved. The backend's current profile-creation contract still requires a verified email and its database requires email; this task did not create phone-only profiles or invent placeholder email addresses. Therefore a new phone-only identity remains onboarding-blocked until a separate phone-profile/account-linking design is implemented. A legacy account without the matching Firebase UID needs explicit, authorized linking; it will not be auto-linked by contact details.

Before claiming a successful member journey, test with an authorized Firebase identity already linked to the correct ZAWANA member. Inspect the real session response and protected dashboard request, restart the app, then sign out and verify protected navigation is revoked.

## Remaining Firebase SMS and Apple setup

**SMS:** verify the project has the required Blaze billing setup and SMS quota before a real-number test. Billing was not changed or independently confirmed. Use Firebase Console → Authentication → Sign-in method → Phone for development test numbers. No test number/code is hardcoded in the app. Perform at least one real SMS send/confirm on an authorized device/number and prove the backend accepts the resulting ID token. Test invalid/expired code, resend, cancellation and backend rejection. See [Firebase authentication limits](https://firebase.google.com/docs/auth/limits).

**Apple/iOS:** the SDK plist and bundle ID exist. Firebase reports Apple enabled but its Service ID is not configured. Finish the following through the existing project/account:

1. Apple Developer membership/team access; register or confirm `com.zawana.mobile`, enable Sign in with Apple and push notifications, and provision an iOS development build with matching entitlements.
2. Configure the Firebase Apple provider using the appropriate Service ID, Team ID, Key ID and private `.p8` key according to [Firebase's Apple setup](https://firebase.google.com/docs/auth/ios/apple). Store private keys only in Firebase/server configuration, never Expo public variables or app assets. Native-only configurations can differ from web OAuth; confirm the console requirements for the selected setup.
3. Upload the APNs authentication key/certificate in Firebase Project settings → Cloud Messaging for iOS phone app verification; verify the fallback URL scheme, bundle ID and native plist configuration.
4. On Windows, create the iOS dev client through EAS using the existing `development` profile and the authorized Apple team/device registration. For a Mac simulator use `development-simulator`; Windows cannot run an iOS simulator.
5. Test Apple on a supported signed iOS device/build with an eligible Apple ID, including cancellation, private relay/first-authorization data and backend rejection. Test real iOS phone verification separately. No Apple-device test has run yet.

References: [React Native Firebase Expo setup](https://rnfirebase.io/#expo), [Nitro Google Expo setup](https://react-native-nitro-google-sign-in.github.io/docs/setup/expo/), [Expo SDK 57 Apple Authentication](https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/).

## Verification actually performed

- Mobile TypeScript: passed.
- Lint on authentication/config/modified screen files and related tests: passed, no warnings.
- Mobile unit tests: **60 passed**, including phone validation, OTP state/cooldowns/restart/cancellation, session and route guards, backend rejection, API URL normalization, storage and prior authentication behavior. Provider calls are test fixtures in unit tests; these are not real-device provider tests.
- Backend TypeScript: passed. Firebase identity policy tests: **4 passed**.
- Expo native config/plugin introspection: passed. Android and iOS JavaScript/Hermes exports: passed.
- EAS Android native build: passed. APK public signing certificate matches the registered Firebase fingerprints.
- Live local backend rejects an invalid Firebase bearer token with **401**, and development browser CORS was checked. This is a negative integration check, **not** a successful real-user authentication claim.
- Firebase project/provider/region/public certificate setup was queried/configured against the real cloud APIs using existing backend credentials.

No real Google login, real SMS, Apple login or successful Firebase-user → backend → Home end-to-end test has run. No simulator/emulator/device screenshot was captured: this Windows environment has no available Android emulator/ADB setup or connected device, and cannot launch an iOS simulator. Verify was compared statically to its reference, not declared pixel-perfect. Repeatable capture instructions and artifacts are documented in `artifacts/auth-visual-qa/README.md`.

## Relevant files changed in this integration

Mobile: `package.json`, `package-lock.json`, `app.json`, `app.config.ts`, `eas.json`, `.env.example`, `.gitignore`, `.easignore`; `src/auth/{firebase.ts,firebase.native.ts,identity.ts,validation.ts,phone-challenge.ts,auth-provider.tsx,session-controller.ts,navigation-policy.ts,errors.ts,api.ts}`; `src/app/index.tsx`; `src/components/auth/get-started-screen.tsx`; `src/components/auth/screens/{identifier-screen.tsx,verify-screen.tsx}`; `src/components/auth/ui/auth-layout.tsx`; `tests/{auth-api.test.ts,phone-auth.mjs,validation.test.mjs}`; `scripts/setup-dev-api-network.ps1`; `scripts/qa/apk-signing-cert.py`; this guide and the QA README. Local `.env` and native Firebase config files remain ignored.

Existing backend checkout `C:\Users\HP\Documents\zawana-web-app`: `backend/src/config/env.ts`, `backend/src/middleware/auth.ts`, `backend/src/modules/auth/auth.service.ts`, `backend/src/modules/auth/firebaseIdentityPolicy.ts`, `backend/src/services/firebaseAdmin.ts`, `backend/tests/firebase-identity-policy.test.ts`, `backend/scripts/check-firebase-mobile-config.ts`, `backend/scripts/configure-firebase-mobile.ts`. No new backend, deployment or database migration was created.

The checkout also contains prior navigation/auth/UI work. Those existing uncommitted files were preserved, not reset. No commit was made in this task.
