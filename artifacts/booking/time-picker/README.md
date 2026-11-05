# Time picker refinement

Shared court rental and private coaching time selection now uses day-part tabs, two-column cards, large start times, compact end times, clear selected/disabled states and a chosen-session summary. Sunrise/sun/moon graphics are native SVG. Press feedback, check selection and day-part entrances use Reanimated and respect system reduced motion. Existing backend time values, prices and availability are unchanged.

Verification: lint and TypeScript passed; 137 mobile tests passed. The isolated real-backend browser journey passed 23 assertion/capture entries with no page exceptions, including day-part selection, 320px and 390px layouts, court creation/edit, revision-protected rescheduling and private request creation. These PNGs are Expo React Native Web captures, not native-device screenshots. The native Android emulator remains running, but authenticated rendering of the new time picker has not been verified on the device.

Preview: `rental-selected.png`, `rental-selected-320.png`, `rental-afternoon.png`, `rental-evening.png`.

Reproduce with the existing isolated fixture server and web Metro using `MOBILE_QA_ARTIFACTS=artifacts/booking/time-picker TIME_PICKER_VISUAL=1 node scripts/qa/booking-journeys.cjs`. Playwright module/executable overrides are supported by the driver. Restart fixture data before repeating mutating journeys.
