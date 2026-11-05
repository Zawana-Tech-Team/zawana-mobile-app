/** Mobile brand follows the established navy/gold authentication identity and the user's brand direction. */
export const brand = {
  navy: "#101747", ink: "#101747", gold: "#DEAF46", accent: "#A76D10", goldSoft: "#FFF5D4",
  page: "#FFFEFC", surface: "#FFFFFF", border: "#DDE1EA", muted: "#697590",
  success: "#16A34A", warning: "#F59E0B", error: "#DC2626", info: "#2563EB",
} as const;

/** Shared dimensions for member surfaces and controls. Existing court graphics keep their source geometry. */
export const ui = {
 spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
 radius: { control: 14, card: 20, dialog: 26, sheet: 28 },
 type: { caption: 12, body: 14, title: 23, display: 32 },
 motion: { press: 110, reveal: 220, transition: 280 },
 border: { subtle: brand.border, focus: brand.accent },
} as const;
