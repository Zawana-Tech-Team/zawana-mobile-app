import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/auth-provider';
import { attendanceStart, shiftMonth, type AttendanceRecord, type AttendanceStatus } from '@/attendance/domain';
import { yangonDate } from '@/booking/private-course';
import { useResource } from '@/booking/use-resource';
import { attendanceMarkers } from '@/attendance/calendar';
import { useFormTask } from '@/hooks/use-form-task';
import { brand } from '@/design/tokens';
import { MonthCalendar } from '../shared/month-calendar';
import { Segments } from '../shared/controls';
import { AttendanceLegend } from '../shared/attendance-legend';
import { DetailSheet, QuietRow, Reveal } from '../shared/quiet-ui';
import { Button, Confirm, MemberPage, Notice, shortDate } from '../member/ui';
import { StaffPage, w } from '../staff/ui';
import { a, AttendanceCard, AttendanceDetailSheet, Fact } from './ui';

export function CalendarAttendance({ coach = false }: { coach?: boolean }) {
 const { api, user } = useAuth(), today = yangonDate();
 const [month, setMonth] = useState(today.slice(0, 7)), [day, setDay] = useState(today), [tab, setTab] = useState('calendar'), [query, setQuery] = useState(''), [summary, setSummary] = useState(false), [selected, setSelected] = useState<AttendanceRecord | null>(null), [detail, setDetail] = useState<AttendanceRecord | null>(null), [notes, setNotes] = useState('');
 const [mark, setMark] = useState<{ item: AttendanceRecord; status: Exclude<AttendanceStatus, 'pending'> } | null>(null), task = useFormTask();
 const resource = useResource(useCallback((signal: AbortSignal) => api.getAttendance(month, { signal }), [api, month]), `${user?.id}:${month}`, !!user);
 const rows = resource.data ?? [], filtered = rows.filter(r => `${r.name} ${r.title} ${r.coach ?? ''} ${r.categoryCode ?? ''} ${r.status}`.toLowerCase().includes(query.trim().toLowerCase()));
 const activeDay = day.startsWith(month) ? day : month + '-01';
 const visible = (tab === 'calendar' ? filtered.filter(r => r.date === activeDay) : filtered).sort((x, y) => y.date.localeCompare(x.date) || attendanceStart(x.time) - attendanceStart(y.time));
 const canMark = selected?.kind === 'course' && selected.status === 'pending' && selected.date === today && (selected.canCheckIn ?? true);
 const content = <>
  <Segments label="Attendance sections" value={tab} onChange={setTab} options={[{ value: 'calendar', label: 'Calendar' }, { value: 'history', label: 'History' }]} />
  <View style={a.row}><Text style={[a.muted, { flex: 1 }]}>{resource.data ? `${rows.filter(r => ['present', 'late'].includes(r.status)).length} attended this month` : 'Your monthly attendance'}</Text><Button secondary label="Summary" onPress={() => setSummary(true)} /></View>
  <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
  {tab === 'calendar' ? <MonthCalendar month={month} selected={[activeDay]} markers={attendanceMarkers(filtered)} label={coach ? 'Staff attendance' : 'Attendance'} onPrevious={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} onSelect={setDay} /> : <View style={a.row}><Button secondary label="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} /><Text style={[a.muted, { flex: 1, textAlign: 'center' }]}>{month}</Text><Button secondary label="Next month" onPress={() => setMonth(shiftMonth(month, 1))} /></View>}
  {query ? <Button secondary label={`Clear search: ${query}`} onPress={() => setQuery('')} /> : null}
  <Text style={a.kicker}>{tab === 'calendar' ? shortDate(activeDay).toUpperCase() : 'MONTHLY HISTORY'}</Text>
  <Reveal key={`${month}:${activeDay}:${tab}`}>
   {visible.map(item => <View key={`${item.kind}:${item.id}`} testID={coach ? `staff-attendance-${item.kind}-${item.id}` : undefined}><AttendanceCard item={item} showMember={coach} onPress={() => { task.setError(null); setSelected(coach ? item : null); if (!coach) setDetail(item); }} /></View>)}
   {resource.data && !visible.length ? <View style={a.card}><Text style={a.title}>No sessions here.</Text><Text style={a.muted}>Choose another date to see your sessions.</Text></View> : null}
  </Reveal>
  {!coach ? <QuietRow title="My packages" icon="badminton" onPress={() => router.push('/(member)/membership')} /> : null}
  {!coach ? <Button label="Scan front desk QR" onPress={() => router.push('/(member)/check-in')} /> : null}
  <DetailSheet title="Monthly summary" visible={summary} onClose={() => setSummary(false)}><Fact label="Recorded sessions" value={resource.data ? String(rows.length) : '—'} /><Fact label="Attended" value={resource.data ? String(rows.filter(r => ['present', 'late'].includes(r.status)).length) : '—'} /><Fact label="Not recorded" value={resource.data ? String(rows.filter(r => r.status === 'pending').length) : '—'} /><AttendanceLegend /><TextInput accessibilityLabel="Search attendance" placeholder="Search class, member or status" value={query} onChangeText={setQuery} style={w.search} placeholderTextColor={brand.muted} /><Button secondary label="Today" onPress={() => { setMonth(today.slice(0, 7)); setDay(today); setTab('calendar'); setSummary(false); }} /></DetailSheet>
  <DetailSheet title="Student attendance" visible={!!selected} onClose={() => setSelected(null)}>{selected ? <><Text style={a.title}>{selected.name}</Text><Text style={a.muted}>{selected.title} · {shortDate(selected.date)} · {selected.time}</Text>{canMark ? <><Text style={a.kicker}>RECORD ATTENDANCE</Text><View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{(['present', 'late', 'absent', 'excused'] as const).map(status => <Button key={status} secondary label={status.charAt(0).toUpperCase() + status.slice(1)} onPress={() => { setNotes(''); setMark({ item: selected, status }); setSelected(null); }} />)}</View></> : null}<QuietRow title="Session details & history" icon="calendar" onPress={() => { setDetail(selected); setSelected(null); }} /></> : null}</DetailSheet>
  <AttendanceDetailSheet item={detail} onClose={() => setDetail(null)} />
  <Confirm visible={!!mark} title="Record attendance?" body={`${mark?.item.name ?? ''} · ${mark?.status ?? ''}. ZAWANA verifies eligibility before saving.`} label="Confirm attendance" busy={task.loading} error={task.error} onClose={() => setMark(null)} onConfirm={() => void task.run(async () => { if (!mark) return; await api.markCourseAttendance(mark.item.id, mark.status, notes.trim()); setMark(null); resource.retry(); })}><TextInput accessibilityLabel="Attendance notes" placeholder="Notes (optional)" value={notes} onChangeText={setNotes} maxLength={2000} editable={!task.loading} style={w.search} /></Confirm>
 </>;
 return coach ? <StaffPage title="Attendance." active="attendance">{content}</StaffPage> : <MemberPage title="Attendance." tab="Performance">{content}</MemberPage>;
}
