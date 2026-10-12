# Native authentication QA

## Actual artifacts

- `zawana-development.apk`: successfully compiled EAS Android development client; ignored by Git.
- `eas-build.json` / `eas-build-worker.log`: actual finished build metadata/logs; ignored by Git.
- `native-bundles/`: successful Android/iOS JavaScript exports; ignored by Git.
- `native-config.log`: successful config-plugin introspection; ignored by Git.

No simulator screenshots or pixel-difference artifacts exist yet. There is no available Android emulator/ADB installation or connected device in this environment, and Windows cannot run iOS Simulator. Static reference inspection does not establish pixel-perfect fidelity.

The actual APK signer certificate was extracted using `scripts/qa/apk-signing-cert.py` and matches the SHA-1/SHA-256 registered in Firebase. This diagnostic reads public signer metadata; it is not a full cryptographic APK verifier.

## Capture Verify when a native device is available

1. Follow `AUTHENTICATION_SETUP.md` to install the actual development client, make port 8000 reachable and start Metro.
2. On an authorized device, enter an authorized Firebase test/real phone number and reach Verify through the actual SMS request. Do not bypass the authentication flow just to capture a screen.
3. Choose a consistent device/resolution. Record device name, pixel dimensions, display/font scaling, platform and safe-area in the comparison notes. Dismiss the keyboard for comparison with `assets/ref/verify.png`; capture keyboard-open behavior separately.
4. With Android platform tools available, run from this project (replace `DEVICE_SERIAL` with `adb devices` output):

   ```powershell
   adb -s DEVICE_SERIAL shell screencap -p /sdcard/zawana-verify.png
   adb -s DEVICE_SERIAL pull /sdcard/zawana-verify.png artifacts/auth-visual-qa/verify-pass-1.png
   ```

   Using `adb pull` preserves PNG bytes on Windows. For iOS on a Mac after installing/running its dev client:

   ```bash
   xcrun simctl io booted screenshot artifacts/auth-visual-qa/verify-pass-1.png
   ```

5. Compare the captured PNG to the original `assets/ref/verify.png` side by side. Normalize to equivalent content/device dimensions before calculating differences; status bars, safe areas and dynamic text need separate interpretation. Prioritize background crop, geometry, six OTP boxes, typography, number/edit row, button and footer spacing.
6. Correct only actual component/style differences, capture `verify-pass-2.png` and document remaining differences. Limit this phase to two screen comparison iterations. Never use a screenshot as a replacement for native UI.

Save real capture/difference files and written device findings here, not in production assets. Do not place Firebase codes, tokens, private credentials or identifiable treatment data in screenshots or logs.

## Current functional checks

Mobile: 60 unit tests, TypeScript and scoped lint passed. Backend: 4 policy tests and TypeScript passed. The local session endpoint rejected an invalid token with 401; this proves rejection behavior only. Native Google, real SMS, Apple and a valid member-session/Home end-to-end journey remain untested on devices.

Commands used for repeatable mobile checks:

```powershell
npx tsc --noEmit
node --experimental-strip-types --test tests/auth-api.test.ts tests/session-policy.mjs tests/validation.test.mjs tests/navigation-session.mjs tests/phone-auth.mjs
```

Backend checks run in its existing WSL environment:

```bash
./node_modules/.bin/tsx --test tests/firebase-identity-policy.test.ts
./node_modules/.bin/tsc --noEmit
```
