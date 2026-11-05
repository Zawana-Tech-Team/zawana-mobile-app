import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { brand } from '@/design/tokens';
import { AuthIcon } from '../auth/ui/auth-icon';
function StepIcon({ name, color, complete }: { name: string; color: string; complete: boolean }) {
  if (complete || name === 'Review') return <AuthIcon name="check" size={17} color={color} />;
  if (['Coach','Member'].includes(name)) return <AuthIcon name="person" size={17} color={color} />;
  if (name === 'Package') return <AuthIcon name="retail" size={17} color={color} />;
  if (name === 'Date') return <AuthIcon name="calendar" size={17} color={color} />;
  return <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    {name === 'Time' ? <><Circle cx="12" cy="12" r="9" /><Path d="M12 6v6l4 2" /></> : name === 'Floor' ? <><Path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5" /></> : <><Rect x="5" y="2" width="14" height="20" rx="1" /><Path d="M5 12h14M7 2v20M17 2v20M5 7h14M5 17h14M12 2v5M12 17v5" /></>}
  </Svg>;
}
function StepNode({ name, current, complete }: { name: string; current: boolean; complete: boolean }) {
  const emphasis = useSharedValue(current ? 1 : 0);
  useEffect(() => { emphasis.set(withTiming(current ? 1 : 0, { duration: 180, reduceMotion: ReduceMotion.System })); }, [current, emphasis]);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: 1 + emphasis.get() * .07 }] }));
  return <View style={s.step} accessible accessibilityLabel={`${name}, ${current ? 'current step' : complete ? 'completed' : 'upcoming'}`}><Animated.View style={[s.circle, complete && s.complete, current && s.current, motion]}><StepIcon name={name} color={current ? '#FFFFFF' : complete ? brand.accent : '#92969C'} complete={complete} /></Animated.View><Text style={[s.label, current && { color: brand.ink, fontWeight: '700' }, complete && { color: brand.accent }]}>{name}</Text></View>;
}
export function StepProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  const scroll = useRef<ScrollView>(null);
  const fraction = useSharedValue(current / Math.max(1, steps.length - 1));
  useEffect(() => { fraction.set(withTiming(current / Math.max(1, steps.length - 1), { duration: 280, reduceMotion: ReduceMotion.System })); scroll.current?.scrollTo({ x: Math.max(0, current - 2) * 64, animated: false }); }, [current, steps.length, fraction]);
  const progress = useAnimatedStyle(() => ({ width: `${fraction.get() * 100}%` as `${number}%` }));
  return <View style={s.panel}><View style={s.between}><Text style={s.eyebrow}>YOUR BOOKING</Text><Text style={s.count}>{String(current + 1).padStart(2, '0')} <Text style={{ color: '#92969C' }}>/ {String(steps.length).padStart(2, '0')}</Text></Text></View>
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.route} onContentSizeChange={() => scroll.current?.scrollTo({ x: Math.max(0, current - 2) * 64, animated: false })}>{steps.map((name, i) => <View key={name} style={s.node}><StepNode name={name} current={i === current} complete={i < current} />{i < steps.length - 1 ? <View style={[s.connector, i < current && { backgroundColor: '#DEAF4688' }]} /> : null}</View>)}</ScrollView>
    <View style={s.track} accessibilityRole="progressbar" accessibilityLabel={`Booking step ${current + 1} of ${steps.length}: ${steps[current]}`} accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}><Animated.View style={[s.fill, progress]} /></View>
  </View>;
}
const s = StyleSheet.create({
  panel: { gap: 16, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#DDE1EA' }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { fontSize: 9, letterSpacing: 1.8, fontWeight: '700', color: brand.accent }, count: { color: brand.ink, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }, route: { paddingVertical: 3, paddingRight: 3 }, node: { flexDirection: 'row', alignItems: 'flex-start' }, step: { width: 48, gap: 8, alignItems: 'center' }, circle: { width: 34, height: 34, borderRadius: 13, backgroundColor: '#EEF0F7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' }, current: { backgroundColor: brand.ink, borderColor: brand.gold }, complete: { backgroundColor: brand.goldSoft, borderColor: '#E7DCBF' }, label: { color: '#92969C', fontSize: 10, lineHeight: 14 }, connector: { width: 16, height: 1, marginTop: 17, backgroundColor: '#DDE1EA' }, track: { height: 2, backgroundColor: '#E4E7F0', borderRadius: 2, overflow: 'hidden' }, fill: { height: 2, backgroundColor: brand.gold },
});
