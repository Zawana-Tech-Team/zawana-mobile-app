# Mature graphical building artwork

`mature-building.png` is the transparent, bundled architectural illustration used by `src/components/booking/building-illustration.tsx`. Dimensions: 1211 × 1299 pixels. It is loaded with Expo Image using `contentFit="contain"` in a responsive 342:360 canvas.

Source: the user's `assets/ref/mature-graphical ui.png`, supplied after Figma's Starter-plan quota prevented original-asset downloads. The unobstructed building in the second row's transition screen was used as the edit target. The built-in image-generation tool isolated/adapted the building, removed surrounding UI, and restored the plinth edge. The source reference remains unchanged. This is an AI-adapted raster asset; small architectural differences from the original are possible.

Floor labels, gold selected states, disabled states, hit targets, and entry motion are native components. Both red and green glazed bands remain visible. The chosen band has a gold outline and the other band dims. Selected controls use solid navy, white text, a gold checkmark and an explicit SELECTED label. A 470ms lift/pop acknowledges selection, with a smaller building nudge. Repeated taps acknowledge the already-selected control again. Motion respects the system reduced-motion setting; the persistent selection cues remain visible. The actual court IDs, counts and availability remain supplied by the booking API.

## Final generation prompt

> Use case: background-extraction. Edit target: the attached architectural illustration, extracted for inspection from the user's supplied mature-graphical UI reference. Extract ONLY this exact building as a clean reusable mobile-app illustration on a truly transparent background. Preserve the architecture, precise three-quarter perspective, silhouette, proportions, dark charcoal steel framework, warm ivory left wall and right service tower, slanted roof rising at back left, blue-gray glass, gold ground-floor columns, and all architectural linework. Preserve exactly SIX large glazed story bands above the ground-floor shopfront: top blue, second RED badminton court band (6th Floor), then two blue bands, fifth GREEN badminton court band (2nd Floor), then bottom blue band. Red and green bands contain thin white badminton court/net markings exactly as reference. Remove the pale lavender UI bar fragment above the roof. No labels, phone screens, text, buttons, people, new scenery, or UI. Do not redesign the building. Restore any clipped edge of the ground plinth at the bottom, provide narrow 4% transparent padding on all sides. The entire building including roof and plinth must be visible. Crisp editorial architectural illustration with the same polished fine linework and restrained textures as the input; flat orthographic-like three-quarter elevation, NOT photorealistic. Save the resulting asset into /Users/fred/Documents/zawana-mobile-app/assets/booking/mature-building.png if filesystem output is supported.

## Verification

- Expo lint, TypeScript and all 104 mobile tests passed.
- Android/Hermes production export passed (`/tmp/zawana-mature-android-export`). This verifies bundling; physical-device and iOS rendering remain unverified.
- The actual FloorSelector, BuildingIllustration, JourneyFrame and DateRibbon components were exercised in an isolated Expo web preview. The temporary entry was outside Expo Router; no authentication guards or backend data were modified for previewing.
- At 390 × 844: default, both selected states, synchronized overlay/bottom controls, 44px or larger floor hit targets, normal entry completion, and correct artwork loading passed.
- At 320 × 640: selection, vertical scrolling and absence of horizontal overflow passed. The footer stays accessible as the content scrolls.
- Disabled/unavailable floor pointer input was ignored. Reduced-motion entry completed using a 90ms fade with no camera transforms. No browser runtime exceptions were recorded.
- Captures and geometry evidence: `artifacts/booking/mature/`. These are browser captures of the real components with an explicitly isolated selection harness, not native or authenticated end-to-end booking evidence.
