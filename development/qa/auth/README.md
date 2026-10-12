# Native authentication QA

## Current evidence

**Native visual validation is blocked, and no native screenshots have been captured on this host.** This Windows environment has no ADB executable, Android SDK Platform Tools, connected emulator, or iOS Simulator. iOS Simulator runs on macOS; use a physical iPhone, a Mac, or an available [EAS Simulator](https://docs.expo.dev/workflow/ios-simulator/). A phone-sized browser capture is not native validation.

The supplied designs and approximate inner-display crops are documented in `discovery/REFERENCE-INVENTORY.md` and `discovery/reference-map.json`. They include artificial phone frames and different display proportions; compare the inner display and retain real safe areas. Original background artwork and Gotham font files are missing, so those differences cannot currently be eliminated. Use the complete official logo asset even though its wordmark differs from the mockups.

The existing shared backend requires a Firebase identity with verified email. Its phone field is not a unique sign-in identifier, and SMS is currently a second factor after password. The exact phone OTP → password journey is blocked until the backend contract is extended or an alternative is explicitly agreed. Missing provider support must remain an error/unsupported state; captures must never use fake verification or a guard bypass.

## Device preparation

Keep a single portrait simulator/device profile, display scaling, text size, light appearance, and keyboard state for the primary comparison. Record OS/device details beside captures. Target approximately 390 logical pixels wide, then test a small 320–360-wide Android device, a large Android device, and a modern iPhone with display cutouts and gesture navigation. Capture keyboard-open cases separately. Do not force all designs' different heights onto one device.

Start Metro using `npx expo start --max-workers 1`. On a configured Mac, launch the compatible iOS runtime with `npx expo start --ios --max-workers 1`. After changes involving native modules or custom schemes, create a new development build; see [Expo linking guidance](https://docs.expo.dev/linking/into-your-app/).

For an iPhone development build from Windows, first install/configure `expo-dev-client` using `npx expo install expo-dev-client`, configure the project's EAS development build profile and Expo account, then run:

```powershell
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client --max-workers 1
```

The device build needs Apple signing credentials, device provisioning and iOS Developer Mode; these steps were not initiated here. See [Expo's device build instructions](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/). An iOS simulator build needs a separate EAS profile with `ios.simulator: true`; run `npx eas-cli@latest build --platform ios --profile development-simulator` only after creating that profile. Install the resulting simulator build on a Mac. [Simulator build instructions](https://docs.expo.dev/tutorial/eas/ios-development-build-for-simulators/).

Configure `EXPO_PUBLIC_API_URL` to the existing backend's reachable `/api` URL. Device `localhost` is the device itself; Android Emulator typically reaches its host through `10.0.2.2`, while physical devices need a reachable LAN or HTTPS staging host. Production API requests require HTTPS. Use the same Firebase project as the API; never put Admin credentials in mobile configuration.

## Capture and compare loop

1. Render the actual route and wait for loading, image decoding and transitions to finish.
2. Capture the real device display using the scripts below. Confirm the screenshot shows the intended route, rather than a guard redirect, launch screen or error.
3. Normalize against its PNG reference, then inspect `side-by-side.png`, `overlay.png` and differences.
4. Fix structural layout first: safe areas, photo crop, logo scale, title position, form spacing and button alignment. Then refine typography, borders, icon sizes and colors.
5. Repeat with the next pass number, up to ten focused correction passes per screen. Recheck buttons and keyboard behavior after corrections.
6. Record the conclusion in `VISUAL-RESULTS.md`; label incomplete or blocked steps accurately. MAE is a supplementary diagnostic, never an automatic claim of fidelity.

Android (PowerShell 7, with an already running app/device):

```powershell
adb devices -l
pwsh -File scripts/qa/capture.ps1 -Serial emulator-5554 -DeviceLabel android-primary -Screen get-started -Pass 1 -Navigate
pwsh -File scripts/qa/capture.ps1 -Serial emulator-5554 -DeviceLabel android-primary -Screen sign-in -Pass 1 -Navigate
# After reaching later screens through real provider authentication:
pwsh -File scripts/qa/capture.ps1 -Serial emulator-5554 -DeviceLabel android-primary -Screen verify -Pass 1
```

Use `-AdbPath C:\path\to\platform-tools\adb.exe` if ADB is not on PATH. With Expo Go, pass `-AppUrlPrefix 'exp://REACHABLE_HOST:8081/--/'` instead of the installed development build's default `zawanamobileapp://`. The script streams `adb exec-out screencap -p` through a binary .NET stream and checks its PNG signature, avoiding PowerShell text-redirection corruption. [ADB capture documentation](https://developer.android.com/tools/adb#screencap).

iOS Simulator (macOS/Xcode, explicit already booted device UDID):

```bash
xcrun simctl list devices available
bash scripts/qa/capture-ios.sh YOUR_SIMULATOR_UDID iphone-primary get-started 1 zawanamobileapp://
bash scripts/qa/capture-ios.sh YOUR_SIMULATOR_UDID iphone-primary sign-in 1 zawanamobileapp://
# After reaching a later screen legitimately, omit the URL prefix:
bash scripts/qa/capture-ios.sh YOUR_SIMULATOR_UDID iphone-primary profile-setup 1
```

The script uses [Apple's native screenshot command](https://developer.apple.com/library/archive/documentation/IDEs/Conceptual/iOS_Simulator_Guide/InteractingwiththeiOSSimulator/InteractingwiththeiOSSimulator.html), probes installed command help and records device inventory. It does not install or erase simulators. For a physical iPhone, capture/export the device screenshot into `native/ios/DEVICE_LABEL/`, document OS, dimensions and route state beside it, and run the same comparison command.

Only Get Started, Sign In and Sign Up permit automatic public-route navigation. Verify, password, profile, account creation, completion and Home must be reached through the real flow and current state; scripts refuse automatic deep links to those screens. Screenshots should use consenting staging test accounts and avoid showing actual verification codes or passwords.

Compare with Python and Pillow already available on this Codex host:

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts/qa/compare.py --route get-started --actual development/qa/auth/native/android/android-primary/get-started-pass-01.png
```

On another machine, use its Pillow-enabled `python3` equivalent. `--actual-crop left,top,right,bottom` removes measured capture/window margins if necessary; raw ADB/simctl display screenshots usually need none. `--reference-crop` replaces approximate discovery bounds. Both images scale proportionally to a shared width (`--width 390`), and height mismatch is reported instead of stretched away. `--ignore-top 40` can exclude a documented status-bar region from metrics while leaving the full side-by-side intact. The metrics compare the overlapping aligned height only; unpaired pixels remain visible and are reported separately. No SSIM score or threshold is fabricated.

## Functional QA checklist

All native end-to-end rows remain **not run / native runtime unavailable** until evidence is recorded. Existing unit tests cover individual contracts and state behavior, not SMS delivery or complete real-device journeys.

| Test | Native steps and required result |
| --- | --- |
| Existing user sign-in | Start signed out, enter an existing identifier, complete the supported verification/password flow; canonical API user must resolve before Home. |
| New user registration | Use a new staging identity, verify ownership, complete profile/account/password steps; one canonical member exists and completion navigates to Home. |
| Incorrect password | Enter an incorrect password; stay on password screen with a sanitized error, retained identifier and no protected access. |
| Invalid verification | Submit an incorrect provider code/action; never mark verification complete or unlock later screens. |
| Expired verification | Wait for server/provider expiration; show recovery and request a fresh verification. |
| Duplicate account | Retry an existing identity/profile request; resolve the existing account or report a conflict without duplicate member creation. |
| Network failure | Disconnect during verification, password, profile and dashboard requests; loading ends, state remains consistent, retry does not fabricate success. |
| Password visibility | Toggle each password field; text changes securely, cursor/input stays intact, accessibility label changes, secrets are absent from persisted drafts. |
| Back navigation | Go forward/back on every step; nonsecret draft data survives, password/code does not leak into params/storage, completion cannot back into password. |
| Session restoration | Restart with a valid encrypted session; revalidate backend profile before Home. Repeat expired/revoked/inactive cases and verify signed-out/error recovery. |
| Protected route access | Open Home directly while signed out and during restoration; no member data appears. Do not add a QA-only guard bypass. |
| Sign out | Sign out, restart and attempt Home/back; session is cleared and unauthenticated entry returns. |
| Interrupted registration | Close/reopen between profile steps; restore permissible draft state and verify identity state before continuing. Unverified drafts cannot reach Complete/Home. |
| Successful Home navigation | Both real journeys reach Home after backend session verification; user/profile and dashboard belong to the authenticated member. |

Also test resend cooldown/rate limits, keyboard dismissal, return-key submission, busy-button double taps, photo permission denial, large text, screen-reader labels, safe-area/cutout behavior and support/recovery actions. Verify provider/server expiration and attempt limits externally; client cooldown alone is insufficient.

## Artifact layout

- `discovery/`: authoritative source inventory, approximate reference bounds and QA crops.
- `native/android/DEVICE/` or `native/ios/DEVICE/`: unmodified real captures and provenance.
- `comparisons/ROUTE/CAPTURE/`: normalized copies, side-by-side, overlay, differences and diagnostic JSON.
- `VISUAL-RESULTS.md`: per-screen pass history, fixes, interaction results and remaining blockers.

Never put captures/differences in production `assets/`, and never label a reference crop or script smoke-test image as a simulator capture.
