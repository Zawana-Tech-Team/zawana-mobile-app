import { Platform } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { authColors } from './tokens';

export type AuthIconName = 'arrow' | 'back' | 'help' | 'lock' | 'eye' | 'eye-off' | 'person' | 'phone' | 'calendar' | 'check' | 'camera' | 'heart' | 'retail' | 'cafe' | 'dumbbell' | 'badminton' | 'chevron-down';

type AuthIconProps = { name: AuthIconName; size?: number; color?: string };

const decoration = Platform.OS === 'web'
  ? { 'aria-hidden': true as const }
  : {
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants' as const
  };

export function AuthIcon({ name, size = 22, color = authColors.navy }: AuthIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...decoration}
    >
      {name === 'arrow' ? <Path d="M4 12h16m-7-7 7 7-7 7" /> : null}
      {name === 'back' ? <Path d="M20 12H4m7-7-7 7 7 7" /> : null}
      {name === 'chevron-down' ? <Path d="m6 9 6 6 6-6" /> : null}
      {name === 'check' ? <Path d="m5 12 4 4L19 6" /> : null}
      {name === 'help' ? <>
        <Circle cx="12" cy="12" r="9" />
        <Path d="M9.7 8.9a2.4 2.4 0 0 1 4.6.8c0 1.7-2.3 1.8-2.3 3.6m0 3.1h.01" />
      </> : null}
      {name === 'lock' ? <>
        <Rect x="5.5" y="10" width="13" height="11" rx="2" />
        <Path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10m-3.5 5v2" />
        <Circle cx="12" cy="14.8" r=".6" />
      </> : null}
      {name === 'eye' || name === 'eye-off' ? <>
        <Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <Circle cx="12" cy="12" r="3" />
        {name === 'eye-off' ? <Path d="M3 3l18 18" /> : null}
      </> : null}
      {name === 'person' ? <><Circle cx="12" cy="7" r="4" /><Path d="M4 21v-2a8 8 0 0 1 16 0v2H4Z" /></> : null}
      {name === 'phone' ? <Path
        d="M7 3 4 4c-1 1 .1 6 4.7 10.6S18.6 21 20 19.7l1-3-4.6-3-2 2c-2.7-1.3-4.8-3.4-6.1-6.1l2-2L7 3Z"
      /> : null}
      {name === 'calendar' ? <>
        <Rect x="3" y="5" width="18" height="16" rx="2" />
        <Path d="M7 3v4m10-4v4M3 10h18m-14 4h1m3 0h1m3 0h1m-9 3h1m3 0h1" />
      </> : null}
      {name === 'camera' ? <>
        <Path d="M4 6h4l2-3h4l2 3h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2Z" />
        <Circle cx="12" cy="12" r="4" />
      </> : null}
      {name === 'heart' ? <>
        <Path d="M12 21 3.9 13.1C-2.3 7 6.9-1 12 5.3c5.1-6.3 14.3 1.7 8.1 7.8L12 21Z" />
        <Path d="M6 12h3l2-4 2 8 2-4h3" />
      </> : null}
      {name === 'retail' ? <><Path d="M4 8h16l1 13H3L4 8Z" /><Path d="M8 10V6a4 4 0 0 1 8 0v4" /></> : null}
      {name === 'cafe' ? <>
        <Path
          d="M4 8h13v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Zm13 2h2a3 3 0 0 1 0 6h-2M7 5c2-2-1-3 0-4m4 4c2-2-1-3 0-4m4 4c2-2-1-3 0-4"
        />
      </> : null}
      {name === 'dumbbell' ? <>
        <Rect x="4" y="4" width="4" height="16" rx="1" />
        <Rect x="16" y="4" width="4" height="16" rx="1" />
        <Path d="M8 12h8M2 8v8m20-8v8" />
      </> : null}
      {name === 'badminton' ? <>
        <Path d="m5 21 8-12m6 12L11 9m-3 7 3 2m5-2-3 2" />
        <Path
          d="M6.2 3.3c2.2-1.1 4.4.3 5 2.8s-.5 5.2-2.5 6.1-4.4-.3-5-2.8.5-5.1 2.5-6.1Zm11.6 0c-2.2-1.1-4.4.3-5 2.8s.5 5.2 2.5 6.1 4.4-.3 5-2.8-.5-5.1-2.5-6.1Z"
        />
      </> : null}
    </Svg>
  );
}
