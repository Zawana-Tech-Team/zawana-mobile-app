import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { TextInput } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useResource } from '@/booking/use-resource';
import { yangonDate } from '@/booking/private-course';
import { Segments } from '../shared/controls';
import { Reveal } from '../shared/quiet-ui';
import { Button, Notice } from '../member/ui';
import { Empty, PageMore, SessionCard, StaffPage, w } from './ui';
export function CoachingScreen() {
 const { api, user } = useAuth(), [tab, setTab] = useState('requests'), [query, setQuery] = useState(''), [limit, setLimit] = useState(20);
 const resource = useResource(useCallback((signal: AbortSignal) => api.getStaffBookings({ signal }), [api]), user?.id ?? '', user?.role === 'coach');
 const rows = (resource.data ?? []).filter(b => (tab === 'requests' ? b.status === 'PENDING_COACH_CONFIRMATION' : tab === 'upcoming' ? ['CONFIRMED', 'AWAITING_PAYMENT'].includes(b.status) && b.date >= yangonDate() : b.status !== 'PENDING_COACH_CONFIRMATION' && (!['CONFIRMED', 'AWAITING_PAYMENT'].includes(b.status) || b.date < yangonDate())) && `${b.user.name} ${b.title} ${b.code} ${b.date}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <StaffPage title="Private coaching." active="bookings">
  <Segments label="Coach booking status" value={tab} onChange={v => { setTab(v); setLimit(20); }} options={[{ value: 'requests', label: 'Requests' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'history', label: 'History' }]} />
  <TextInput accessibilityLabel="Search bookings" placeholder="Search member or session" value={query} onChangeText={v => { setQuery(v); setLimit(20); }} style={w.search} />
  <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
  <Reveal key={tab}>{rows.slice(0, limit).map(b => <SessionCard key={b.id} item={b} />)}{resource.data && !rows.length ? <Empty title={tab === 'requests' ? 'All requests reviewed.' : 'No sessions in this view.'} body="Your assigned badminton coaching sessions appear here." /> : null}</Reveal>
  <PageMore shown={limit} total={rows.length} onMore={() => setLimit(v => v + 20)} />
  <Button label="Book a session" onPress={() => router.push('/(staff)/create-course')} />
 </StaffPage>;
}
