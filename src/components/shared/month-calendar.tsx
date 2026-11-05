import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brand } from '@/design/tokens';
import { dateKey } from '@/booking/domain';
import { calendarDays } from '@/utils/calendar';

export function MonthCalendar({ month, selected = [], onSelect, markers = {}, disabled, onPrevious, onNext, previousDisabled, nextDisabled, label = 'Calendar' }: {
  month: string; selected?: string[]; onSelect: (date: string) => void;
  markers?: Record<string, { count?: number; color?: string; available?: boolean }>;
  disabled?: (date: string) => boolean; onPrevious?: () => void; onNext?: () => void;
  previousDisabled?: boolean; nextDisabled?: boolean; label?: string;
}) {
  const today = dateKey();
  return <View style={styles.card} accessibilityLabel={label}>
    <View style={styles.heading}>
      {onPrevious ? <Pressable accessibilityRole="button" accessibilityLabel={`Previous ${label.toLowerCase()} month`} disabled={previousDisabled} onPress={onPrevious} style={styles.arrow}><Text style={[styles.arrowText, previousDisabled && styles.faded]}>‹</Text></Pressable> : null}
      <Text style={styles.month}>{new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Yangon' })}</Text>
      {onNext ? <Pressable accessibilityRole="button" accessibilityLabel={`Next ${label.toLowerCase()} month`} disabled={nextDisabled} onPress={onNext} style={styles.arrow}><Text style={[styles.arrowText, nextDisabled && styles.faded]}>›</Text></Pressable> : null}
    </View>
    <View style={styles.grid}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <Text key={d} style={styles.weekday}>{d}</Text>)}</View>
    <View style={styles.grid}>{calendarDays(month).map((day, i) => {
      if (!day) return <View key={`empty-${i}`} style={styles.cell} />;
      const active = selected.includes(day), blocked = disabled?.(day) ?? false, marker = markers[day];
      return <Pressable key={day} testID={`calendar-day-${day}`} accessibilityRole="button" accessibilityLabel={`${day}${marker?.count !== undefined ? `, ${marker.count} sessions` : ''}${marker?.available === false ? ', unavailable' : ''}`} accessibilityState={{ selected: active, disabled: blocked }} disabled={blocked} onPress={() => onSelect(day)} style={styles.cell}>
        <View style={[styles.day, day === today && styles.today, active && styles.selected]}><Text style={[styles.number, blocked && styles.faded, active && styles.white]}>{Number(day.slice(-2))}</Text></View>
        <View style={[styles.dot, { backgroundColor: marker?.color ?? (marker?.available ? brand.gold : 'transparent') }, !!marker?.count && { backgroundColor: marker.color ?? brand.gold }]} />
      </Pressable>;
    })}</View>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border, borderRadius: 22, padding: 12, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  month: { flex: 1, textAlign: 'center', color: brand.ink, fontSize: 17, fontWeight: '700' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, arrowText: { color: brand.ink, fontSize: 26 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.2857%', textAlign: 'center', color: brand.muted, fontSize: 10, paddingVertical: 6 },
  cell: { width: '14.2857%', minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  day: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: 'transparent' },
  number: { color: brand.ink, fontSize: 14 }, today: { borderColor: brand.gold }, selected: { backgroundColor: brand.ink, borderColor: brand.ink },
  white: { color: '#FFFFFF', fontWeight: '700' }, faded: { color: '#C2C4CA' }, dot: { width: 4, height: 4, borderRadius: 2 },
});
