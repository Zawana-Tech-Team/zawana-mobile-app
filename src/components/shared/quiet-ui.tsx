import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ContextSurface } from './context-surface';
import { brand } from '@/design/tokens';
import { SelectionPressable } from '../booking/selection-pressable';
import { AuthIcon, type AuthIconName } from '../auth/ui/auth-icon';

export function Reveal({ children }: { children: ReactNode }) {
  return <Animated.View entering={FadeInDown.duration(200).reduceMotion(ReduceMotion.System)} style={{ gap: 12 }}>{children}</Animated.View>;
}
export function DetailSheet({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: ReactNode }) {
  return <ContextSurface title={title} visible={visible} onClose={onClose}>{children}</ContextSurface>;
}
export function QuietRow({ title, subtitle, icon, trailing, onPress, testID, expanded }: { title: string; subtitle?: string; icon?: AuthIconName; trailing?: ReactNode; onPress: () => void; testID?: string; expanded?: boolean }) {
  return <SelectionPressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityState={expanded === undefined ? undefined : { expanded }} accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`} style={q.row}>
    {icon ? <View style={q.icon}><AuthIcon name={icon} color={brand.navy} size={21} /></View> : null}
    <View style={{ flex: 1, gap: 4 }}><Text style={q.label}>{title}</Text>{subtitle ? <Text numberOfLines={2} style={q.caption}>{subtitle}</Text> : null}</View>{trailing}<Text style={q.chevron}>›</Text>
  </SelectionPressable>;
}
export function BalanceRing({ remaining, total }: { remaining: number; total: number }) {
  const fraction = Math.max(0, Math.min(1, total > 0 ? remaining / total : 0)), radius = 29, length = 2 * Math.PI * radius;
  return <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${remaining} of ${total} sessions remaining`}>
    <Svg width={72} height={72} style={StyleSheet.absoluteFill}><Circle cx={36} cy={36} r={radius} fill="none" stroke={brand.border} strokeWidth={4} /><Circle cx={36} cy={36} r={radius} fill="none" stroke={brand.gold} strokeWidth={4} strokeDasharray={`${length * fraction} ${length}`} strokeLinecap="round" transform="rotate(-90 36 36)" /></Svg>
    <Text style={{ color: brand.navy, fontSize: 23, fontWeight: '700' }}>{remaining}</Text><Text style={{ fontSize: 9, color: brand.muted }}>LEFT</Text>
  </View>;
}
export const q = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, minHeight: 76, borderRadius: 20, borderWidth: 1, borderColor: brand.border },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F1F2F7', alignItems: 'center', justifyContent: 'center' },
  label: { color: brand.navy, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  caption: { color: brand.muted, fontSize: 12, lineHeight: 18 },
  chevron: { color: brand.muted, fontSize: 23 },
  action: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: brand.navy, fontWeight: '700', fontSize: 24, flex: 1, letterSpacing: -.5 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#080D2A66' },
  sheet: { width: '100%', maxWidth: 600, alignSelf: 'center', maxHeight: '88%', backgroundColor: brand.page, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: brand.border, alignSelf: 'center' },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 12 },
});
