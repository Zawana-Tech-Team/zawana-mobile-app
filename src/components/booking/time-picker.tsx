import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { FadeInDown, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { brand } from '@/design/tokens';
import { SelectionPressable } from './selection-pressable';

type TimeOption = { time: string; startMinute: number; endMinute: number; available?: boolean; detail?: string };
const periods = ['Morning', 'Afternoon', 'Evening'] as const;
const periodOf = (minute: number) => minute < 720 ? 0 : minute < 1020 ? 1 : 2;
function clock(minute: number) { const h = Math.floor(minute / 60) % 24; return { digits: `${h % 12 || 12}:${String(minute % 60).padStart(2, '0')}`, meridiem: h < 12 ? 'AM' : 'PM' }; }
function Daylight({ period, color, size = 22 }: { period: number; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" {...(Platform.OS === 'web' ? { 'aria-hidden': true as const } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const })}>
    {period === 2 ? <Path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" /> : <><Circle cx="12" cy="12" r="4" /><Path d={period === 0 ? 'M3 17h18M5 20h14M12 2v2M4.9 4.9l1.4 1.4M2 12h2M20 12h2M17.7 6.3l1.4-1.4' : 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'} /></>}
  </Svg>;
}
function TimeCard({ option, selected, onPress, testID }: { option: TimeOption; selected: boolean; onPress: () => void; testID: string }) {
  const check = useSharedValue(selected ? 1 : 0);
  useEffect(() => { check.set(withTiming(selected ? 1 : 0, { duration: 180, reduceMotion: ReduceMotion.System })); }, [selected, check]);
  const checkStyle = useAnimatedStyle(() => ({ opacity: check.get(), transform: [{ scale: .65 + check.get() * .35 }] }));
  const start = clock(option.startMinute), end = clock(option.endMinute), disabled = option.available === false;
  return <SelectionPressable testID={testID} selected={selected} selectedColor={brand.ink} restColor={disabled ? '#F0F1F6' : '#FFFFFF'} disabled={disabled} onPress={onPress}
    accessibilityRole="button" accessibilityLabel={`${option.time}${option.detail ? `, ${option.detail}` : ''}`} accessibilityState={{ selected, disabled }} aria-selected={selected}
    style={[s.card, selected && s.cardSelected, disabled && { opacity: .5 }]}>
    <View style={s.between}><Text style={[s.duration, selected && { color: '#D8C58F' }]}>{option.endMinute - option.startMinute} MIN</Text><View style={[s.checkRing, selected && { borderColor: brand.gold, backgroundColor: brand.gold }]}><Animated.Text style={[s.check, checkStyle]}>✓</Animated.Text></View></View>
    <View style={s.clock}><Text style={[s.hour, selected && s.white]}>{start.digits}</Text><Text style={[s.ampm, selected && { color: '#D8C58F' }]}>{start.meridiem}</Text></View>
    <Text style={[s.end, selected && { color: '#C3C4C6' }]}>until {end.digits} {end.meridiem}</Text>
    {option.detail ? <View style={s.detailRow}><View style={[s.dot, { backgroundColor: selected ? brand.gold : disabled ? '#9CA3AF' : brand.accent }]} /><Text style={[s.detail, selected && { color: '#E5E7EB' }]}>{selected ? 'Selected' : option.detail}</Text></View> : selected ? <Text style={[s.detail, { color: brand.gold }]}>Selected</Text> : null}
  </SelectionPressable>;
}

/** A shared presentation of API-provided sessions. Time values are never regenerated locally. */
export function TimePicker({ options, selected, onSelect, testPrefix, multiple = false }: { options: TimeOption[]; selected: string[]; onSelect: (time: string) => void; testPrefix: string; multiple?: boolean }) {
  const [chosenPeriod, setChosenPeriod] = useState<number | null>(null);
  const preferredPeriod = chosenPeriod ?? periodOf(options.find(o => selected.includes(o.time))?.startMinute ?? options[0]?.startMinute ?? 360);
  const availablePeriods = periods.map((_, i) => options.some(o => periodOf(o.startMinute) === i));
  const activePeriod = availablePeriods[preferredPeriod] ? preferredPeriod : Math.max(0, availablePeriods.findIndex(Boolean));
  const visible = options.filter(o => periodOf(o.startMinute) === activePeriod);
  const picked = options.filter(o => selected.includes(o.time));
  const minutes = picked.reduce((sum, o) => sum + o.endMinute - o.startMinute, 0);
  return <View style={{ gap: 18 }}>
    <View style={s.intro}><View style={{ flex: 1, gap: 7 }}><Text style={s.eyebrow}>TIME ON COURT</Text><Text style={s.introTitle}>Find your moment.</Text><Text style={s.introBody}>{multiple ? 'Pick one or more sessions.' : 'Choose your session.'} All times in Yangon.</Text></View><View style={s.sunArtwork}><Daylight period={activePeriod} color={brand.gold} size={48} /><View style={s.artLine} /></View></View>
    <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel="Time of day">{periods.map((label, i) => <SelectionPressable key={label} testID={`${testPrefix}-period-${i}`} accessibilityRole="tab" aria-selected={activePeriod === i} accessibilityState={{ selected: activePeriod === i, disabled: !availablePeriods[i] }} disabled={!availablePeriods[i]} selected={activePeriod === i} selectedColor="#FFFFFF" restColor="transparent" onPress={() => setChosenPeriod(i)} style={[s.tab, activePeriod === i && s.tabActive, !availablePeriods[i] && { opacity: .35 }]}><Daylight period={i} color={activePeriod === i ? brand.accent : brand.muted} /><Text style={[s.tabLabel, activePeriod === i && { color: brand.ink }]}>{label}</Text></SelectionPressable>)}</View>
    <Animated.View key={activePeriod} entering={FadeInDown.duration(200).reduceMotion(ReduceMotion.System)} style={s.grid}>
      {visible.map(option => <View key={option.time} style={s.cell}><TimeCard option={option} selected={selected.includes(option.time)} onPress={() => onSelect(option.time)} testID={`${testPrefix}-${option.startMinute}`} /></View>)}
    </Animated.View>
    {!options.length ? <Text style={s.empty}>No sessions to show yet.</Text> : null}
    {picked.length ? <View style={s.selection} accessibilityLiveRegion="polite"><View style={s.between}><Text style={s.selectionLabel}>{picked.length} SESSION{picked.length === 1 ? '' : 'S'} SELECTED</Text><Text style={s.selectionDuration}>{minutes} min</Text></View><View style={s.pills}>{picked.map(o => <Pressable key={o.time} onPress={() => onSelect(o.time)} accessibilityRole="button" accessibilityLabel={multiple ? `Remove ${o.time}` : `Selected ${o.time}`} style={s.pill}><Text style={s.pillText}>{clock(o.startMinute).digits} {clock(o.startMinute).meridiem}{multiple ? '  ×' : ''}</Text></Pressable>)}</View></View> : null}
  </View>;
}
const s = StyleSheet.create({
  intro: { backgroundColor: brand.ink, borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  eyebrow: { color: '#D8C58F', fontSize: 9, letterSpacing: 2, fontWeight: '700' }, introTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 29, fontWeight: '700', letterSpacing: -.6 }, introBody: { color: '#BDBFC4', fontSize: 12, lineHeight: 18 },
  sunArtwork: { width: 68, height: 80, alignItems: 'center', justifyContent: 'center', gap: 9 }, artLine: { width: 54, height: 1, backgroundColor: '#5B5136' },
  tabs: { padding: 4, flexDirection: 'row', gap: 4, backgroundColor: '#EEF0F7', borderRadius: 18 }, tab: { flex: 1, minHeight: 64, gap: 5, justifyContent: 'center', alignItems: 'center', borderRadius: 14, paddingHorizontal: 2 }, tabActive: { boxShadow: '0px 2px 7px #1017470D' }, tabLabel: { fontSize: 11, color: brand.muted, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, cell: { width: '48%', flexGrow: 1, flexBasis: '46%', maxWidth: '49%' },
  card: { minHeight: 133, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#DDE1EA', gap: 4 }, cardSelected: { borderColor: brand.gold, boxShadow: '0px 5px 12px #10174712' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, duration: { color: '#8A8D91', fontSize: 9, fontWeight: '600', letterSpacing: 1 }, checkRing: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: '#DDE1EA', alignItems: 'center', justifyContent: 'center' }, check: { color: brand.ink, fontSize: 12, fontWeight: '800' },
  clock: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 5, marginTop: 6 }, hour: { fontSize: 29, lineHeight: 35, fontWeight: '600', letterSpacing: -1, color: brand.ink, fontVariant: ['tabular-nums'] }, ampm: { fontSize: 10, color: brand.muted, fontWeight: '600' }, white: { color: '#FFFFFF' }, end: { color: brand.muted, fontSize: 11, lineHeight: 17 }, detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }, dot: { width: 4, height: 4, borderRadius: 2 }, detail: { fontSize: 10, color: brand.muted, lineHeight: 16 },
  selection: { borderRadius: 18, backgroundColor: '#FFF5D4', padding: 16, gap: 12 }, selectionLabel: { fontSize: 9, letterSpacing: 1, color: brand.accent, fontWeight: '700' }, selectionDuration: { color: brand.accent, fontSize: 12, fontWeight: '600' }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, pill: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#FFFFFF' }, pillText: { fontSize: 12, color: brand.ink, fontWeight: '600' }, empty: { color: brand.muted, fontSize: 13, paddingVertical: 12 },
});
