import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useBooking } from '@/booking/provider';
import { courseStatus } from '@/booking/private-course';
import { money, dateLabel } from '@/booking/domain';
import { useResource } from '@/booking/use-resource';
import { useFormTask } from '@/hooks/use-form-task';
import { brand } from '@/design/tokens';
import { Button, Confirm, MemberPage, Notice } from '../member/ui';
import { Fact } from '../attendance/ui';
import { f } from './flow-ui';

export function DetailScreen() {
  const { id: param } = useLocalSearchParams<{ id: string }>();
  const id = typeof param === 'string' ? param : '';
  const { api, user } = useAuth();
  const booking = useBooking();
  const task = useFormTask();
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const row = useResource(useCallback((signal: AbortSignal) => api.getCourtBooking(id, { signal }), [api, id]), `${user?.id}:${id}:${booking.revision}`, !!id);
  const change = useResource(useCallback((signal: AbortSignal) => api.getCourtChangeDetail(id, { signal }), [api, id]), `${user?.id}:${id}:${booking.revision}`, !!id);
  const b = row.data;
  return <MemberPage title="Your court reservation." subtitle="Session details, changes and history." tab="My Bookings" back>
    <Notice loading={row.loading} error={row.error} onRetry={row.retry} />
    {message ? <View style={f.card} accessibilityLiveRegion="polite"><Text style={f.strong}>{message}</Text></View> : null}
    {b ? <>
      <View style={f.hero}><Text style={[f.kicker, { color: brand.gold }]}>{courseStatus(b.status).toUpperCase()}</Text><Text style={f.heroTitle}>{b.title}</Text><Text selectable style={f.heroBody}>{b.code}</Text></View>
      <View style={f.card}><Fact label="Date" value={dateLabel(b.date)} /><Fact label="Time" value={b.time} /><Fact label="Court / floor" value={b.court ? `${b.court.name} · ${b.court.surface}` : b.location} /><Fact label="Total" value={money(b.price)} /><Fact label="Payment" value={b.paymentStatus} />{b.meta ? <Fact label="Notes" value={b.meta} /> : null}</View>
      <View style={f.card}><Text style={f.title}>Need a different session?</Text><Text style={f.caption}>Choose a new time, date, floor and available court, then review the original and replacement before confirming.</Text>
        <Notice loading={change.loading} error={change.error} onRetry={change.retry} />
        {change.data ? <><Text style={f.strong}>{change.data.eligibility.message}</Text>{change.data.eligibility.deadline ? <Text style={f.caption}>Change deadline · {new Date(change.data.eligibility.deadline).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })}</Text> : null}
          <Button label="Reschedule court" disabled={!change.data.eligibility.eligible} testID="booking-reschedule" onPress={() => router.push({ pathname: '/(member)/book/change', params: { id } })} />
        </> : null}
      </View>
      {['PENDING','CONFIRMED'].includes(b.status.toUpperCase()) ? <View style={f.card}><Text style={f.title}>{b.paymentStatus === 'paid' ? 'Cancellation review' : 'Cancel this reservation'}</Text><Text style={f.caption}>{change.data?.cancellationPolicy.message ?? 'Paid reservations require staff review. A refund is not automatic.'}</Text>
        <TextInput accessibilityLabel="Court cancellation reason" placeholder="Reason for cancellation" placeholderTextColor={brand.muted} multiline value={reason} onChangeText={setReason} maxLength={1000} style={[f.choice, { color: brand.ink }]} />
        <Button secondary label={b.paymentStatus === 'paid' ? 'Request cancellation review' : 'Cancel reservation'} disabled={reason.trim().length < 3} onPress={() => { task.setError(null); setCancel(true); }} />
      </View> : null}
    </> : null}
    {change.data?.cancellations.map(c => <View key={c.id} style={f.card}><Text style={f.kicker}>CANCELLATION · {c.status.toUpperCase()}</Text><Text style={f.caption}>{c.reason}</Text><Text style={f.caption}>Refund: {c.refundStatus.replaceAll('_', ' ')}</Text></View>)}
    {change.data ? <View style={f.card}><Text style={f.title}>Booking history</Text>{change.data.history.length ? change.data.history.map(h => <View key={h.id} style={{ gap: 5, borderLeftWidth: 2, borderLeftColor: brand.gold, paddingLeft: 14, paddingVertical: 8 }}><Text style={f.strong}>{h.action.replaceAll('_', ' ')}</Text><Text style={f.caption}>{new Date(h.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })}</Text><Text style={f.caption}>{h.reason}</Text></View>) : <Text style={f.caption}>No changes have been recorded.</Text>}</View> : null}
    <Confirm visible={cancel} title={b?.paymentStatus === 'paid' ? 'Request cancellation review?' : 'Cancel this reservation?'} body={b?.paymentStatus === 'paid' ? 'Your court remains reserved until staff approve the request. Refunds require separate review.' : 'The court is released after ZAWANA confirms cancellation.'} label="Confirm cancellation request" busy={task.loading} error={task.error} onClose={() => setCancel(false)} onConfirm={() => void task.run(async () => {
      const result = await api.requestCourtCancellation(id, reason.trim());
      setMessage(result.status === 'completed' ? 'Your reservation is cancelled.' : 'Cancellation requested. Your court stays reserved until approval.');
      setCancel(false); booking.invalidate(); row.retry(); change.retry();
    })} />
  </MemberPage>;
}
