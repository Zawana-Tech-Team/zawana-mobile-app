# Android emulator test — 2026-10-12

Device: `Zawana_API_37`, Pixel 6 profile, Android API 37 Google Play revision 6, x86_64.
App: `com.zawana.mobile`, Expo SDK 57, native development build.

## Verified

- Native debug build succeeded and installed on the emulator.
- Metro compiled the Android bundle and served the app.
- Welcome screen rendered; phone sign-in and email sign-in navigation worked.
- Empty phone, email, and password submissions showed validation errors.
- A fictitious email/password submission reached native Firebase and returned the expected incorrect-credentials message; the password was cleared afterward.
- Password recovery screen opened without sending a reset email.
- Email sign-up reached profile setup without creating an account.
- Back navigation worked across these screens.
- Google sign-in opened Google's account setup UI; cancellation returned safely to ZAWANA.
- The backend was reachable from Android at `http://10.0.2.2:8000`; an unauthenticated `/api/auth/me` request returned HTTP 401.
- The user-supplied test account signed in through native Firebase and the ZAWANA backend to member Home. The dashboard loaded with no retry/error control.
- A force-stop and app restart restored the authenticated session to member Home, again without a dashboard error.
- Sign Out removed the authenticated session. After a full emulator reboot, the app returned to the welcome screen instead of restoring member Home.
- No fatal exception was found in the running app process.
- All 60 existing authentication tests passed. Lint and TypeScript checks passed.

## Fix made

The password-screen description rendered a literal `\n`. It now uses a JavaScript string with a real newline, verified on the emulator.

## Remaining provider checks

- Successful Google login and Firebase token exchange.
- SMS delivery and valid OTP confirmation.
- Registration, email verification, and reset-email delivery.

The test account was entered directly through emulator input. Credentials and authenticated account screenshots are not saved in this report or its screenshot artifacts. The app is left running on the welcome screen, signed out.

## Running setup

Metro was started with:

```sh
APP_ENV=development EXPO_PUBLIC_API_URL=http://10.0.2.2:8000 npx expo start --dev-client --localhost --port 8081
```

The emulator uses `-gpu swiftshader -feature -Vulkan`. Hardware keyboard input has been enabled in its AVD configuration (`hw.keyboard=yes`), and the restarted emulator's generated hardware configuration confirms `hw.keyboard = true`. Forward Metro after each emulator restart:

```sh
~/Library/Android/sdk/platform-tools/adb -s emulator-5554 reverse tcp:8081 tcp:8081
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk` and contains the native Firebase and Google sign-in modules. The shared `.env` API URL was left unchanged.

Screenshots in this directory record the welcome, validation, recovery, sign-up, and Google cancellation checks. The first screenshot captures loading before the bundle finished.
