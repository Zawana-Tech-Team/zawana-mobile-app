import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { brand } from '@/design/tokens';

export { StepProgress } from "./booking-progress";
export function Choice({ title, detail, selected, disabled, onPress, testID }: { title: string; detail?: string; selected?: boolean; disabled?: boolean; onPress: () => void; testID?: string }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ selected: !!selected, disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [f.choice, selected && f.selected, disabled && { opacity: .45 }, pressed && { opacity: .75 }]}>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Text style={[f.strong, { flex: 1 }]}>{title}</Text><View style={[f.radio, selected && { borderColor: brand.accent, backgroundColor: brand.gold }]} /></View>
    {detail ? <Text style={f.caption}>{detail}</Text> : null}
  </Pressable>;
}
export function useStepBack(step: number, onBack: () => void) {
  useFocusEffect(useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (step > 0) { onBack(); return true; } return false; }); return () => sub.remove(); }, [step, onBack]));
}
export const f = StyleSheet.create({
  card: { padding: 20, borderRadius: 22, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, gap: 12 },
  hero: { padding: 24, borderRadius: 24, backgroundColor: brand.ink, gap: 12 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -.8 },
  heroBody: { color: '#D1D5DB', fontSize: 13, lineHeight: 21 },
  kicker: { color: brand.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  strong: { color: brand.ink, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  title: { color: brand.ink, fontSize: 20, fontWeight: '700', lineHeight: 27 },
  caption: { color: brand.muted, fontSize: 12, lineHeight: 19 },
  choice: { minHeight: 60, padding: 16, gap: 6, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 16 },
  selected: { borderColor: brand.gold, backgroundColor: brand.goldSoft },
  radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: brand.border },
  track: { flexDirection: 'row', gap: 5 }, segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: brand.border },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, chip: { minWidth: '46%', flexGrow: 1 },
});
