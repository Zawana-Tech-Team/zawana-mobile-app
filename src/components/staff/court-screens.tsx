import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useResource } from '@/booking/use-resource';
import { bookingGroup, statusLabel } from '@/booking/domain';
import { brand } from '@/design/tokens';
import { useFormTask } from '@/hooks/use-form-task';
import { Button, Confirm, Notice, money, shortDate } from '../member/ui';
import { a, Fact } from '../attendance/ui';
import { Empty, PageMore, StaffPage, w } from './ui';
const courtStaff = (role?: string) => role === 'admin' || role === 'badminton_fo';

export function StaffCourtsScreen() {
  const { api, user } = useAuth();
  const allowed = courtStaff(user?.role);
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('upcoming');
  const [limit, setLimit] = useState(20);
  const resource = useResource(useCallback((signal: AbortSignal) => api.getStaffCourtBookings({ signal }), [api]), user?.id ?? '', allowed);
  const rows = (resource.data ?? []).filter(b => (period === 'all' || bookingGroup(b) === period) && `${b.user.name} ${b.code} ${b.title} ${b.court?.name ?? ''} ${b.date}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <StaffPage title="Every court, in view." subtitle="Court reservations and cancellation review." active="bookings" back>
    {!allowed ? <Empty title="Court operations are available to badminton front desk and administrators." /> : <>
      <TextInput accessibilityLabel="Search court reservations" placeholder="Member, reference, court or date" placeholderTextColor={brand.muted} value={query} onChangeText={v => { setQuery(v); setLimit(20); }} style={w.search} autoCorrect={false} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[['upcoming','Upcoming'],['past','History'],['cancelled','Cancelled'],['all','All reservations']].map(([value,label]) => <Button key={value} secondary={period !== value} label={label} onPress={() => { setPeriod(value); setLimit(20); }} />)}</View>
      <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
      {rows.slice(0,limit).map(b => <View key={b.id} style={a.card} testID={`staff-court-${b.id}`}><Text style={a.kicker}>{b.code} · {statusLabel(b.status)}</Text><Text style={a.title}>{b.user.name}</Text><Text style={a.muted}>{b.court?.name ?? b.title}{b.court?.surface ? ` · ${b.court.surface}` : ''}</Text><Text style={a.muted}>{shortDate(b.date)} · {b.time}</Text><Fact label="Amount" value={money(b.price)} /><Fact label="Payment" value={statusLabel(b.paymentStatus)} /><Button secondary label="Manage court reservation" onPress={() => router.push({ pathname: '/(staff)/courts/[id]', params: { id: b.id } })} /></View>)}
      <PageMore shown={limit} total={rows.length} onMore={() => setLimit(v => v + 20)} />
      {resource.data && !rows.length ? <Empty title="No court reservations in this view." /> : null}
      <Text style={a.muted}>Latest 300 court reservations. Payment status is separate from refund approval.</Text>
      <Button secondary label="Refresh court reservations" onPress={resource.retry} />
    </>}
  </StaffPage>;
}
export function StaffCourtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const allowed = courtStaff(user?.role), task = useFormTask();
  const [reason,setReason] = useState('');
  const [action,setAction] = useState<{ kind: 'request' | 'approve' | 'reject'; requestId?: string } | null>(null);
  const [success,setSuccess] = useState<string | null>(null);
  const detail = useResource(useCallback((signal: AbortSignal) => api.getCourtChangeDetail(id, { signal }), [api,id]), `${user?.id}:${id}`, allowed && !!id);
  const data = detail.data, b = data?.booking;
  const requested = data?.cancellations.filter(c => c.status === 'requested') ?? [];
  const perform = () => void task.run(async () => {
    if (!action || reason.trim().length < 3) return;
    if (action.kind === 'request') { const result = await api.requestCourtCancellation(id,reason.trim()); setSuccess(`Cancellation ${result.status}. Refund status: ${statusLabel(result.refundStatus)}.`); }
    else { const result = await api.reviewCourtCancellation(id,action.requestId!,action.kind === 'approve',reason.trim()); setSuccess(`Cancellation ${result.status}. Refund status: ${statusLabel(result.refundStatus)}.`); }
    setAction(null);setReason('');detail.retry();
  });
  return <StaffPage title="Court reservation." subtitle={b?.code} active="bookings" back>
    {!allowed ? <Empty title="This workspace requires badminton front desk or administrator access." /> : <>
      <Notice loading={detail.loading} error={detail.error} onRetry={detail.retry} />
      {success ? <View style={a.card} accessibilityLiveRegion="polite"><Text style={a.title}>{success}</Text></View> : null}
      {b && data ? <>
        <View style={a.card}><Text style={a.kicker}>{statusLabel(b.status)}</Text><Text style={a.title}>{b.title}</Text><Fact label="Member" value={data.customer ?? "Member details unavailable"} /><Fact label="Date" value={shortDate(b.date)} /><Fact label="Time" value={b.time} /><Fact label="Amount" value={money(b.price)} /><Fact label="Payment" value={statusLabel(b.paymentStatus)} /><Text style={a.muted}>{data.cancellationPolicy.message}</Text></View>
        {['pending','confirmed','CONFIRMED'].includes(b.status) ? <>
          <Text style={a.title}>Cancellation review</Text><Text style={a.muted}>Add a reason before recording a decision. Approval cancels the reservation; any refund or credit requires separate financial review.</Text>
          <TextInput accessibilityLabel="Court cancellation review reason" placeholder="Required reason" value={reason} onChangeText={setReason} maxLength={1000} editable={!task.loading} style={w.search} placeholderTextColor={brand.muted} multiline />
          {requested.length ? requested.map(c => <View key={c.id} style={a.card} testID={`court-cancellation-${c.id}`}><Fact label="Request" value={c.reason} /><Fact label="Status" value={statusLabel(c.status)} /><Fact label="Refund" value={statusLabel(c.refundStatus)} /><Button label="Approve cancellation" disabled={reason.trim().length < 3} onPress={() => { task.setError(null);setAction({kind:'approve',requestId:c.id}); }} /><Button secondary label="Reject cancellation" disabled={reason.trim().length < 3} onPress={() => { task.setError(null);setAction({kind:'reject',requestId:c.id}); }} /></View>) : <Button label="Request cancellation" disabled={reason.trim().length < 3} onPress={() => { task.setError(null);setAction({kind:'request'}); }} />}
        </> : null}
        <Text style={a.title}>Reservation timeline</Text>
        {data.history.map(h => <View key={h.id} style={a.card}><Text style={a.link}>{h.action.replaceAll('_',' ')}</Text><Text style={a.muted}>{h.reason}</Text><Text style={a.muted}>{new Date(h.createdAt).toLocaleString('en-GB',{timeZone:'Asia/Yangon'})}</Text></View>)}
        {data.cancellations.filter(c => c.status !== 'requested').map(c => <View key={c.id} style={a.card}><Fact label="Cancellation" value={statusLabel(c.status)} /><Fact label="Reason" value={c.reason} /><Fact label="Refund" value={statusLabel(c.refundStatus)} /></View>)}
        {!data.history.length && !data.cancellations.length ? <Text style={a.muted}>No reservation changes recorded.</Text> : null}
      </> : null}
    </>}
    <Confirm visible={!!action} title={action?.kind === 'approve' ? 'Approve this cancellation?' : action?.kind === 'reject' ? 'Reject this cancellation?' : 'Request cancellation?'} body={action?.kind === 'approve' ? 'The server will cancel the reservation and retain its audit and payment history. This does not issue a refund.' : reason} label={action?.kind === 'approve' ? 'Approve cancellation' : action?.kind === 'reject' ? 'Reject cancellation' : 'Request cancellation'} busy={task.loading} error={task.error} onClose={() => setAction(null)} onConfirm={perform} />
  </StaffPage>;
}
