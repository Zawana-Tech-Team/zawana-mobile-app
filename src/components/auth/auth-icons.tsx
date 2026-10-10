import Svg, { Path } from 'react-native-svg';
import { Platform } from 'react-native';

const decorativeProps = Platform.OS === 'web'
  ? { 'aria-hidden': true as const }
  : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

export function GoogleIcon({ size = 29 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" {...decorativeProps}>
      <Path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.65-.35-3.91H24v7.4h11.04a9.45 9.45 0 0 1-4.1 6.2v5.14h6.65c3.89-3.58 6.02-8.85 6.02-14.83Z" />
      <Path fill="#34A853" d="M24 44c5.4 0 9.94-1.79 13.25-4.85l-6.65-5.14c-1.85 1.24-4.2 1.98-6.6 1.98-5.21 0-9.62-3.52-11.2-8.26H5.93v5.32A20 20 0 0 0 24 44Z" />
      <Path fill="#FBBC05" d="M12.8 27.73A12.02 12.02 0 0 1 12.16 24c0-1.3.23-2.56.64-3.73v-5.32H5.93A20 20 0 0 0 4 24c0 3.24.78 6.31 1.93 9.05l6.87-5.32Z" />
      <Path fill="#EA4335" d="M24 12.01c2.94 0 5.58 1.02 7.65 3.01l5.74-5.73A19.22 19.22 0 0 0 24 4 20 20 0 0 0 5.93 14.95l6.87 5.32c1.58-4.74 5.99-8.26 11.2-8.26Z" />
    </Svg>
  );
}

export function AppleIcon({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorativeProps}>
      <Path fill="#000" d="M17.05 12.3c.03 3.14 2.76 4.19 2.79 4.21-.02.08-.44 1.49-1.45 2.95-.87 1.26-1.78 2.52-3.2 2.55-1.39.03-1.84-.82-3.43-.82-1.6 0-2.1.8-3.42.85-1.37.05-2.41-1.36-3.29-2.61-1.79-2.57-3.16-7.26-1.32-10.44a5.1 5.1 0 0 1 4.33-2.62c1.36-.03 2.64.91 3.47.91.83 0 2.4-1.13 4.04-.96.69.03 2.62.28 3.86 2.1-.1.06-2.4 1.4-2.38 3.88ZM14.41 4.64c.73-.88 1.23-2.1 1.1-3.32-1.05.04-2.32.7-3.07 1.58-.68.77-1.28 2-1.12 3.17 1.17.09 2.36-.59 3.09-1.43Z" />
    </Svg>
  );
}

export function ArrowIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorativeProps}>
      <Path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="#111" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
