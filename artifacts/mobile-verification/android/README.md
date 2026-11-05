# Android emulator launch — 29 October 2026

- AVD: `Zawana_API_37`, connected as `emulator-5554`.
- Native development APK rebuilt and installed successfully with Expo SDK 57 and the installed Java 17 toolchain. The Android Studio Java 25 runtime caused a Prefab configuration failure; Java 17 resolved it.
- Native camera permission was generated through Expo prebuild from the existing app configuration.
- Metro: `http://localhost:8081`.
- API: the user's existing `.env` setting, `http://localhost:8000`.
- ADB reverse forwards device ports 8081 and 8000 to the Mac. The host API health endpoint returned HTTP 200.
- The current Android JS bundle loaded, the welcome screen rendered, and the checked ReactNativeJS/AndroidRuntime error logs contained no launch errors.
- [Native emulator screenshot](launch.png).

This verifies development-build installation and initial native rendering. Authenticated role workflows, camera scanning and payment interactions were not exercised in this launch check. No account credentials or production records were changed. The emulator and Metro were left running for interactive testing.
