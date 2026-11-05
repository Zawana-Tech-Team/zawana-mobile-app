import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useBooking } from '@/booking/provider';
import { useResource } from '@/booking/use-resource';
import { commitCourtChange } from '@/booking/changes';
import { useFormTask } from '@/hooks/use-form-task';
import { brand } from '@/design/tokens';
import { Button, MemberPage, Notice, money, shortDate } from '../member/ui';
import { Fact } from '../attendance/ui';
import { f, StepProgress } from './flow-ui';

export function ChangeReviewScreen() {
  const params = useLocalSearchParams<{ id: string; date: string; courtId: string; time: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const date = typeof params.date === 'string' ? params.date : '';
  const time = typeof params.time === 'string' ? params.time : '';
  const courtId = typeof params.courtId === 'string' ? params.courtId : '';
  const { api, user } = useAuth();
  const booking = useBooking();
  const task = useFormTask();
  const [reason, setReason] = useState('');
  const quote = useResource(useCallback(async (signal: AbortSignal) => {
    const [quote, original] = await Promise.all([api.quoteCourtChange(id, { date, time, courtId }, { signal }), api.getCourtBooking(id, { signal })]);
    return { quote, original };
  }, [api, id, date, time, courtId]), `${user?.id}:${id}:${date}:${time}:${courtId}`, !!id && !!date && !!time && !!courtId);
  const q = quote.data?.quote;
  const save = () => void task.run(async () => {
    if (!q || q.difference !== 0 || reason.trim().length < 3) return;
    await commitCourtChange(api, id, { date, time, courtId, revision: q.revision, reason: reason.trim() });
    booking.invalidate();
    router.replace({ pathname: '/(member)/bookings/[id]', params: { id } });
  });
  return <MemberPage title="Review your change." subtitle="The original reservation stays in place until ZAWANA confirms the replacement." tab="My Bookings" back footer={<View style={{ gap: 10 }}><Notice error={task.error} /><Button label="Confirm reschedule" busy={task.loading} disabled={!q || q.difference !== 0 || reason.trim().length < 3} onPress={save} testID="confirm-reschedule" /></View>}>
    <StepProgress steps={['Time','Date','Floor','Court','Review']} current={4} />
    <Notice loading={quote.loading} error={quote.error} onRetry={quote.retry} />
    {q ? <>
      <View style={f.card}><Text style={f.kicker}>ORIGINAL SESSION</Text><Text style={f.title}>{quote.data?.original.court?.name ?? quote.data?.original.title}</Text><Fact label="Date" value={shortDate(q.original.date)} /><Fact label="Time" value={q.original.time} /><Fact label="Price" value={money(q.original.price)} /></View>
      <View style={[f.card, { borderColor: brand.gold, backgroundColor: brand.goldSoft }]}><Text style={f.kicker}>REPLACEMENT SESSION</Text><Text style={f.title}>{q.proposed.courtName}</Text><Fact label="Date" value={shortDate(q.proposed.date)} /><Fact label="Time" value={q.proposed.time} /><Fact label="Price" value={money(q.proposed.price)} /><Fact label="Price difference" value={`${q.difference > 0 ? '+' : ''}${money(q.difference)}`} /></View>
      {q.difference !== 0 ? <View style={f.card}><Text style={f.strong}>A payment adjustment needs staff review.</Text><Text style={f.caption}>Choose an equal-price session, or contact ZAWANA to arrange the difference. Your existing booking has not changed.</Text></View> : <Text style={f.caption}>No payment adjustment. Your booking reference and transaction history are retained.</Text>}
      <Text style={f.strong}>Reason for changing</Text>
      <TextInput accessibilityLabel="Reschedule reason" placeholder="Tell us why you’re changing the session" placeholderTextColor={brand.muted} value={reason} onChangeText={setReason} maxLength={1000} multiline editable={!task.loading} style={[f.card, { color: brand.ink, minHeight: 92 }]} />
      <Text style={f.caption}>Changes must be confirmed at least 24 hours before the original session. Availability and the booking revision are checked again when saving.</Text>
    </> : null}
  </MemberPage>;
}
