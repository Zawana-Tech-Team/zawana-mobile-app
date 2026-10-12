import { StyleSheet } from 'react-native';

export const authColors = {
  navy: '#101747',
  muted: '#697590',
  paper: '#FFFEFC',
  outline: '#DDE1EA',
  gold: '#DEAF46',
  goldDark: '#A76D10',
  error: '#B42336',
  success: '#099B61',
} as const;

// The brand's Gotham files are not bundled. Keep the platform font honest until
// an authorized font asset is available; do not substitute a named brand font.
export const authText = StyleSheet.create({
  title: { color: authColors.navy, fontSize: 30, lineHeight: 35, fontWeight: '700', letterSpacing: -0.65 },
  body: { color: authColors.muted, fontSize: 17, lineHeight: 24 },
  label: { color: authColors.muted, fontSize: 15, lineHeight: 21 },
  link: { color: authColors.goldDark, fontSize: 14, textDecorationLine: 'underline' },
});
