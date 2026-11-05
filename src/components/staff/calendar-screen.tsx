import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { yangonDate } from '@/booking/private-course';
import { useResource } from '@/booking/use-resource';
import { attendanceStart, shiftMonth } from '@/attendance/domain';
import { sessionHasEnded } from '@/coach/domain';
import { addDays } from '@/staff/domain';
import { brand } from '@/design/tokens';
import { a } from '../attendance/ui';
import { Notice, shortDate } from '../member/ui';
import { SelectionPressable } from '../booking/selection-pressable';
import { MonthCalendar } from '../shared/month-calendar';
import { Segments } from '../shared/controls';
import { QuietRow, Reveal } from '../shared/quiet-ui';
import { Empty, SessionCard, StaffPage } from './ui';

export function CoachCalendarScreen() {
 const { api, user } = useAuth(), today = yangonDate();
 const [date, setDate] = useState(today), [view, setView] = useState('upcoming'), [dayOnly, setDayOnly] = useState(false), [anchor, setAnchor] = useState(today);
 const month = date.slice(0, 7), last = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().slice(0, 10);
 const start = view === 'month' ? month + '-01' : anchor, end = view === 'month' ? last : addDays(anchor, view === 'upcoming' ? 13 : 6);
 const resource = useResource(useCallback((signal: AbortSignal) => api.getCoachCalendar(start, end, { signal }), [api, start, end]), `${user?.id}:${start}:${end}`, user?.role === 'coach');
 const rows = (resource.data?.bookings ?? []).filter(b => !['CANCELLED', 'COACH_DECLINED', 'EXPIRED'].includes(b.status) && (view !== 'upcoming' || !sessionHasEnded(b.date, b.time)));
 const markers = Object.fromEntries([...new Set(rows.map(b => b.date))].map(d => [d, { count: rows.filter(b => b.date === d).length }]));
 const visible = (view === 'month' || dayOnly ? rows.filter(b => b.date === date) : rows).sort((x, y) => x.date.localeCompare(y.date) || attendanceStart(x.time) - attendanceStart(y.time));
 const dates = [...new Set(visible.map(b => b.date))];
 const move = (direction: number) => { setDayOnly(false); const next = view === 'month' ? shiftMonth(month, direction) + '-01' : addDays(anchor, direction * 7); setDate(next); setAnchor(next); };
 return <StaffPage title="Your calendar." active="calendar">
  <Segments label="Calendar view" value={view} onChange={v => { setView(v); setAnchor(date); setDayOnly(false); }} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
  {view === 'month' ? <MonthCalendar month={month} selected={[date]} markers={markers} label="Coach schedule" onPrevious={() => move(-1)} onNext={() => move(1)} onSelect={setDate} /> : <>
   <View style={a.row}><SelectionPressable accessibilityRole="button" accessibilityLabel="Previous schedule week" onPress={() => move(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}><Text style={a.title}>‹</Text></SelectionPressable><Text style={[a.link, { flex: 1, textAlign: 'center' }]}>{shortDate(start).replace(/\s+\d{4}$/, '')} — {shortDate(end).replace(/\s+\d{4}$/, '')}</Text><SelectionPressable accessibilityRole="button" accessibilityLabel="Next schedule week" onPress={() => move(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}><Text style={a.title}>›</Text></SelectionPressable></View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
    {Array.from({ length: view === 'upcoming' ? 14 : 7 }, (_, i) => addDays(start, i)).map(d => <SelectionPressable key={d} testID={`schedule-day-${d}`} selected={dayOnly && date === d} accessibilityRole="button" accessibilityLabel={`${d}, ${markers[d]?.count ?? 0} sessions`} accessibilityState={{ selected: dayOnly && date === d }} onPress={() => { setDate(d); setDayOnly(true); }} style={{ width: 52, minHeight: 82, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: d === today ? brand.gold : brand.border }}>
     <Text style={{ color: dayOnly && date === d ? '#FFFFFF' : brand.muted, fontSize: 10 }}>{new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Asia/Yangon' })}</Text><Text style={{ color: dayOnly && date === d ? '#FFFFFF' : brand.navy, fontWeight: '700', fontSize: 20 }}>{+d.slice(-2)}</Text><View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: markers[d]?.count ? brand.gold : 'transparent' }} />
    </SelectionPressable>)}
   </ScrollView>
  </>}
  <View style={a.row}><Text style={[a.muted, { flex: 1 }]}>Yangon time</Text><SelectionPressable accessibilityRole="button" accessibilityLabel="Today" onPress={() => { setDate(today); setAnchor(today); setDayOnly(false); }} style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 14 }}><Text style={a.link}>Today</Text></SelectionPressable></View>
  <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
  <Reveal key={`${date}:${view}:${dayOnly}`}>{dates.map(d => <View key={d} style={{ gap: 10 }}><Text style={a.kicker}>{d === today ? 'TODAY' : shortDate(d).toUpperCase()}</Text>{visible.filter(b => b.date === d).map(b => <SessionCard key={b.id} item={b} />)}</View>)}{resource.data && !visible.length ? <Empty title="Room to breathe." body={view === 'upcoming' ? 'No upcoming sessions in these two weeks.' : 'No assigned sessions on this date.'} /> : null}</Reveal>
  <QuietRow title="Session notifications" icon="calendar" onPress={() => router.push('/(staff)/notifications')} />
 </StaffPage>;
}
