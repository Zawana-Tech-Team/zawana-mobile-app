import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useBooking } from '@/booking/provider';
import { useResource } from '@/booking/use-resource';
import { useBookingDateWindow } from '@/booking/use-booking-date-window';
import { selectedCourtSlots, selectedCourtsSlots, timeChoices } from '@/booking/selection';
import { dateLabel, money, total } from '@/booking/domain';
import { isBookingDateAllowed } from '@/booking/date-policy';
import { MonthCalendar } from '../shared/month-calendar';
import { Button, MemberPage, Notice } from '../member/ui';
import { FloorSelector } from './floor-selector';
import { CourtPlan } from './court-plan';
import { TimePicker } from './time-picker';
import { bookingFloors, courtsOnFloor, type BookingFloor } from './court-presentation';
import { f, StepProgress, useStepBack } from './flow-ui';

const steps = ['Time', 'Date', 'Floor', 'Court', 'Review'];
const titles = ['Choose your time.', 'Pick your playing dates.', 'Choose your arena.', 'Choose your courts.'];
export function RentalFlowScreen({ changing = false }: { changing?: boolean }) {
  const { id: param, editId } = useLocalSearchParams<{ id?: string; editId?: string }>();
  const id = typeof param === 'string' ? param : '';
  const { api, user } = useAuth();
  const booking = useBooking();
  const editing = !changing ? booking.slots.find(s => s.id === editId) : undefined;
  const window = useBookingDateWindow();
  const [step, setStep] = useState(0);
  const [times, setTimes] = useState<string[]>(() => editing ? [editing.time] : []);
  const [dates, setDates] = useState<string[]>(() => editing ? [editing.date] : []);
  const [floor, setFloor] = useState<BookingFloor | null>(null);
  const [courtIds, setCourtIds] = useState<string[]>([]);
  const singleCourt = changing || !!editing;
  const [zooming, setZooming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detail = useResource(useCallback((signal: AbortSignal) => api.getCourtChangeDetail(id, { signal }), [api, id]), `${user?.id}:${id}`, changing && !!id);
  const allowed = !changing || detail.data?.eligibility.eligible === true;
  const schedule = useResource(useCallback((signal: AbortSignal) => api.getCourtAvailability(window.today, { signal }), [api, window.today]), `${user?.id}:${window.today}`, !!user);
  const dateKey = dates.join(',');
  const loadDays = useCallback((signal: AbortSignal) => Promise.all(dateKey.split(',').filter(Boolean).map(date => api.getCourtAvailability(date, { signal }))), [api, dateKey]);
  const days = useResource(loadDays, `${user?.id}:${dateKey}:${booking.revision}`, step >= 1 && !!dates.length && allowed);
  const month = useResource(useCallback((signal: AbortSignal) => api.getCourtMonth(window.month, { signal }), [api, window.month]), `${user?.id}:${window.month}`, step === 1);
  const data = days.data ?? [];
  const courts = data[0]?.courts ?? schedule.data?.courts ?? [];
  const options = schedule.data ? timeChoices(schedule.data) : [];
  const availability = Object.fromEntries(courts.map(c => {
    const valid = selectedCourtSlots(data, c.id, times);
    const states = data.flatMap(d => d.slots.filter(s => s.courtId === c.id && times.includes(s.time)));
    return [c.id, { available: !!valid, label: valid ? 'Available' : states.some(s => ['blocked','maintenance','closed'].includes(s.status)) ? 'Blocked' : states.some(s => ['booked','reserved'].includes(s.status)) ? 'Occupied' : 'Unavailable' }];
  }));
  const availableFloors = bookingFloors.filter(value => courtsOnFloor(courts, value).some(c => availability[c.id]?.available));
  const selected = selectedCourtsSlots(data, courtIds, times);
  const retainedSlots = booking.slots.filter(s => s.id !== editing?.id);
  const newSlots = (selected ?? []).filter(s => !retainedSlots.some(existing => existing.id === s.id));
  const limit = data[0]?.maxSelections ?? 0;
  const ready = allowed && (step === 0 ? !!times.length : step === 1 ? !!dates.length && dates.every(d => isBookingDateAllowed(d)) && !!days.data : step === 2 ? !!floor && availableFloors.includes(floor) : !!selected);
  const back = useCallback(() => { if (step > 0) { setStep(s => s - 1); setZooming(false); } else if (router.canGoBack()) router.back(); else router.replace('/(member)/home'); }, [step]);
  useStepBack(step, back);
  const selectCourt = (id: string) => {
    setError(null);
    const next = singleCourt ? [id] : courtIds.includes(id) ? courtIds.filter(v => v !== id) : [...courtIds, id];
    const candidate = selectedCourtsSlots(data, next, times);
    if (candidate && new Set([...retainedSlots, ...candidate].map(s => s.id)).size > limit) { setError(`This booking allows up to ${limit} sessions. Remove a court, date or time before adding another.`); return; }
    setCourtIds(next);
  };
  const proceed = () => {
    if (!ready || zooming) return;
    setError(null);
    if (step === 2) { setZooming(true); return; }
    if (step < 3) { setStep(s => s + 1); return; }
    if (!selected?.length) return;
    if (changing) {
      const target = selected[0];
      router.push({ pathname: '/(member)/book/change-review', params: { id, date: target.date, courtId: target.courtId, time: target.time } });
    } else {
      if (retainedSlots.length + newSlots.length > limit) { setError(`Your selection exceeds the ${limit}-session limit. Review the existing booking first.`); return; }
      booking.setDates([...new Set([...booking.dates, ...dates])]);
      booking.addSlots(selected, limit, editing ? [editing.id] : []);
      router.push('/(member)/book/review');
    }
  };
  const markers = Object.fromEntries((month.data?.days ?? []).map(d => [d.date, { available: d.available }]));
  return <MemberPage title={changing ? `Change booking · ${steps[step].toLowerCase()}` : titles[step]} subtitle={changing ? 'Choose a replacement using the same rental journey. Your original court stays reserved until confirmation.' : 'Your next rally starts here.'} tab="Book" back onBack={back} scrollKey={step} footer={<View style={{ gap: 10 }}>
    {selected ? <Text style={f.strong}>{courtIds.length} court{courtIds.length === 1 ? '' : 's'} · {selected.length} court-hour{selected.length === 1 ? '' : 's'} · {money(total(selected))}</Text> : times.length > 0 ? <Text numberOfLines={2} style={f.caption}>{times[0]}{times.length > 1 ? ` +${times.length - 1} more` : ''}{dates.length ? ` · ${dates.length} date${dates.length === 1 ? '' : 's'}` : ''}{floor ? ` · ${floor}` : ''}</Text> : null}
    <Notice error={error} />
    <Button label={zooming ? 'Entering floor…' : step === 0 ? 'Choose dates' : step === 1 ? 'Choose floor' : step === 2 ? 'Find available courts' : changing ? 'Review change' : 'Review booking'} disabled={!ready || zooming || (!changing && (booking.pending || booking.restoring))} onPress={proceed} testID="rental-next" />
  </View>}>
    <StepProgress steps={steps} current={step} />
    {changing ? <><Notice loading={detail.loading} error={detail.error} onRetry={detail.retry} />{detail.data ? <View style={f.card}><Text style={f.kicker}>{detail.data.booking.code}</Text><Text style={f.caption}>{detail.data.eligibility.message}</Text>{detail.data.eligibility.deadline ? <Text style={f.caption}>Change by {new Date(detail.data.eligibility.deadline).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })} · Yangon</Text> : null}</View> : null}</> : null}
    {!changing && booking.pending ? <Button secondary label="Recover pending reservation" onPress={() => router.replace('/(member)/book/review')} /> : null}
    {step === 0 ? <>
      <Notice loading={schedule.loading} error={schedule.error} onRetry={schedule.retry} />
      <TimePicker options={options} selected={times} multiple={!changing && !editing} testPrefix="rental-time" onSelect={time => { setTimes(prev => (changing || editing) ? [time] : prev.includes(time) ? prev.filter(v => v !== time) : [...prev, time]); setCourtIds([]); }} />
      {!changing && booking.slots.length ? <Button secondary label={`Review ${booking.slots.length} existing selection${booking.slots.length === 1 ? '' : 's'}`} onPress={() => router.push('/(member)/book/review')} /> : null}
    </> : step === 1 ? <>
      <View style={f.card}>{times.map(time => <Text key={time} style={f.strong}>{time}</Text>)}<Text style={f.caption}>Bookings are available through the end of this month.</Text></View>
      <Notice loading={month.loading} error={month.error} onRetry={month.retry} />
      <MonthCalendar month={window.month} selected={dates} markers={markers} label="Rental dates" disabled={d => !isBookingDateAllowed(d) || month.data?.days.find(day => day.date === d)?.available === false} onSelect={d => { setDates(prev => (changing || editing) ? [d] : prev.includes(d) ? prev.filter(v => v !== d) : [...prev, d].sort()); setFloor(null); setCourtIds([]); }} />
      <Notice loading={days.loading} error={days.error} onRetry={days.retry} />
      <Text style={f.caption}>Gold dots show dates with available sessions. The next steps check your exact selected times.</Text>
    </> : step === 2 ? <>
      <Notice loading={days.loading} error={days.error} onRetry={days.retry} />
      <FloorSelector floor={floor} zooming={zooming} availableFloors={availableFloors} disabled={!days.data || !allowed} onSelect={v => { setFloor(v); if (singleCourt) setCourtIds([]); }} onEntered={() => { setZooming(false); setStep(3); }} />
      {!availableFloors.length && days.data ? <View style={f.card}><Text style={f.title}>No courts match these sessions.</Text><Text style={f.caption}>Go back to choose another time or date.</Text></View> : null}
    </> : <>
      <View style={f.card}><Text style={f.kicker}>{floor?.toUpperCase()}</Text>{dates.map(d => <Text key={d} style={f.strong}>{dateLabel(d, false)}</Text>)}{times.map(t => <Text key={t} style={f.caption}>{t}</Text>)}</View>
      <Notice loading={days.loading} error={days.error} onRetry={days.retry} />
      {floor ? <CourtPlan courts={courtsOnFloor(courts, floor)} floor={floor} selectedIds={courtIds} availability={availability} onSelect={c => selectCourt(c.id)} /> : null}
      <Text style={f.caption}>{singleCourt ? 'Choose one available court for this session.' : 'Tap each court you want. Tap a selected court again to remove it.'}</Text>
      {courtIds.length ? <View style={f.card}><Text style={f.kicker}>{courtIds.length} COURT{courtIds.length === 1 ? '' : 'S'} SELECTED</Text>{courtIds.map(id => <View key={id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><Text style={[f.strong, { flex: 1 }]}>{courts.find(c => c.id === id)?.name} · {courts.find(c => c.id === id)?.surface}</Text><Button secondary label="Remove" testID={`remove-court-${id}`} onPress={() => setCourtIds(prev => prev.filter(v => v !== id))} /></View>)}{!selected ? <Text style={f.caption}>A selected court is no longer available. Remove it or choose another session.</Text> : null}</View> : null}
      {!singleCourt ? <Button secondary label="Choose courts on another floor" testID="rental-another-floor" onPress={() => { setZooming(false); setStep(2); }} /> : null}
      <Button secondary label="Refresh courts" onPress={days.retry} />
    </>}
  </MemberPage>;
}
export function ChangeRentalScreen() { return <RentalFlowScreen changing />; }
