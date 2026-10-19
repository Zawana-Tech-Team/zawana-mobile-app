# Stronger floor-selection feedback

The selected floor now uses navy controls, white labels, a gold checkmark and explicit SELECTED text. A gold outline identifies its actual glazed building band, and the other selectable band dims. Choosing a floor triggers a 170ms lift/pop followed by a 300ms settle; the building also makes a small directional nudge. Repeated selection taps acknowledge the pressed control again. These finite UI-thread animations cancel on rapid changes and respect the system reduced-motion preference.

Expo lint, TypeScript and diff whitespace checks passed. The screenshot is a real Android capture of the strengthened 6th-floor state, using the live booking screen for 21 October. Original asset geometry and live floor/court data remain in use.

The emulator initially had animator, transition and window scales all set to 0. They were set to 1 for the requested motion preview. A native screen-recording attempt stalled the emulator; the recording was discarded and the emulator restarted with software graphics. No successful motion recording is claimed.

After restart, the authenticated native journey reached the live floor selector again. The 6th-floor overlay and matching bottom control both reported selected=true in a fresh Android hierarchy. The emulator was left on that screen with animator scale 1, and the settled screenshot was recaptured after recovery.
