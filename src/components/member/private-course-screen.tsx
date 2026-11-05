import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import type { AuthApi } from '@/auth/api';
import { AuthError } from '@/auth/errors';
import { useResource } from '@/booking/use-resource';
import { yangonDate } from '@/booking/private-course';
import { shiftMonth } from '@/attendance/domain';
import { useFormTask } from '@/hooks/use-form-task';
import { brand } from '@/design/tokens';
import { MonthCalendar } from '../shared/month-calendar';
import { FloorSelector } from '../booking/floor-selector';
import { CourtPlan } from '../booking/court-plan';
import { TimePicker } from '../booking/time-picker';
import { bookingFloors, courtsOnFloor, type BookingFloor } from '../booking/court-presentation';
import { f, StepProgress, useStepBack } from '../booking/flow-ui';
import { Fact } from '../attendance/ui';
import { Button, MemberPage, Notice, money, shortDate } from './ui';

const steps = ['Package', 'Coach', 'Date', 'Time', 'Floor', 'Court', 'Review'];
const titles = ['A package for your progress.', 'The right coach for you.', 'Make it a date.', 'Choose your training time.', 'Choose your arena.', 'Find your training court.', 'Review your session.'];
async function loadCourtSchedule(api: AuthApi, courtKey: string, courseId: string, coachId: string, date: string, durationMinutes: number, signal: AbortSignal) {
  return Promise.all(courtKey.split(',').filter(Boolean).map(courtId => api.getPrivateCourseAvailability({ courseId, coachId, date, durationMinutes, courtId }, { signal })));
}
function useCourtSchedule(api: AuthApi, courtKey: string, courseId: string, coachId: string, date: string, duration: number, identity: string, enabled: boolean) {
  const load = useCallback((signal: AbortSignal) => loadCourtSchedule(api, courtKey, courseId, coachId, date, duration, signal), [api, courtKey, courseId, coachId, date, duration]);
  return useResource(load, `${identity}:${courseId}:${coachId}:${date}:${duration}:${courtKey}`, enabled);
}
export function PrivateCourseScreen() {
  const { api, user } = useAuth();
  const { profileCoachId, profileCourseId } = useLocalSearchParams<{ profileCoachId?: string; profileCourseId?: string }>();
  const task = useFormTask();
  const [step, setStep] = useState(0);
  const [courseId, setCourseId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [date, setDate] = useState('');
  const [month, setMonth] = useState(yangonDate().slice(0, 7));
  const [time, setTime] = useState('');
  const [floor, setFloor] = useState<BookingFloor | null>(null);
  const [courtId, setCourtId] = useState('');
  const [zooming, setZooming] = useState(false);
  const catalog = useResource(useCallback(async (signal: AbortSignal) => {
    const [courses, day] = await Promise.all([api.getPrivateCourses({ signal }), api.getCourtAvailability(yangonDate(), { signal })]);
    return { courses: courses.filter(c => c.status === 'active'), courts: day.courts, today: day.today };
  }, [api]), user?.id ?? '', !!user);
  useFocusEffect(useCallback(() => {
    if (!profileCoachId || !profileCourseId || !catalog.data) return;
    const eligible = catalog.data.courses.find(c => c.id === profileCourseId && c.coaches.some(coach => coach.id === profileCoachId && coach.status === 'active' && coach.department === 'Badminton'));
    if (eligible) { setCourseId(eligible.id); setCoachId(profileCoachId); setTime(''); setFloor(null); setCourtId(''); setStep(2); }
    router.setParams({ profileCoachId: '', profileCourseId: '' });
  }, [profileCoachId, profileCourseId, catalog.data]));
  const course = catalog.data?.courses.find(c => c.id === courseId);
  const coaches = course?.coaches.filter(c => c.status === 'active' && c.department === 'Badminton') ?? [];
  const coach = coaches.find(c => c.id === coachId);
  const courts = catalog.data?.courts ?? [];
  const courtKey = courts.map(c => c.id).join(',');
  const duration = course?.duration ?? 0;
  const availability = useCourtSchedule(api, courtKey, courseId, coachId, date, duration, user?.id ?? '', step >= 3 && !!course && !!coach && !!date && !!courtKey);
  const times = [...new Map((availability.data ?? []).flatMap(a => a.slots).map(s => [s.time, s])).values()].sort((a, b) => a.startMinute - b.startMinute);
  const availableCount = (value: string) => (availability.data ?? []).filter(a => a.slots.some(s => s.time === value && s.available)).length;
  const courtAvailability = Object.fromEntries(courts.map(c => {
    const a = availability.data?.find(a => a.courtId === c.id);
    const slot = a?.slots.find(s => s.time === time);
    return [c.id, { available: !!slot?.available, label: slot?.available ? 'Available' : slot?.reason ?? 'Unavailable' }];
  }));
  const floors = bookingFloors.filter(fl => courtsOnFloor(courts, fl).some(c => courtAvailability[c.id]?.available));
  const court = courts.find(c => c.id === courtId);
  const selectedAvailability = availability.data?.find(a => a.courtId === courtId);
  const selectedSlot = selectedAvailability?.slots.find(s => s.time === time && s.available);
  const ready = step === 0 ? !!course : step === 1 ? !!coach : step === 2 ? !!date && date >= (catalog.data?.today ?? yangonDate()) : step === 3 ? !!time && availableCount(time) > 0 : step === 4 ? !!floor && floors.includes(floor) : !!court && !!selectedSlot;
  const back = useCallback(() => { task.setError(null); if (step > 0) { setStep(s => s - 1); setZooming(false); } else if (router.canGoBack()) router.back(); else router.replace('/(member)/home'); }, [step, task]);
  useStepBack(step, back);
  const send = () => void task.run(async () => {
    if (!course || !coach || !court || !selectedSlot || !selectedAvailability) return;
    const existing = await api.getPrivateCourseBookings();
    if (existing.some(b => b.coachId === coach.id && b.courtId === court.id && b.date === date && b.time === time && ['PENDING_COACH_CONFIRMATION','AWAITING_PAYMENT','CONFIRMED'].includes(b.status))) { router.replace('/(member)/courses'); return; }
    const latest = await api.getPrivateCourseAvailability({ courseId, coachId, courtId, date, durationMinutes: course.duration });
    if (!latest.slots.some(s => s.time === time && s.available)) { availability.retry(); setTime(''); setStep(3); throw new AuthError('bookingConflict', 'Your coach or court is no longer available. Choose another time.'); }
    if (latest.price !== selectedAvailability.price) { availability.retry(); throw new AuthError('bookingConflict', 'The price changed. Review the updated total before sending.'); }
    await api.requestPrivateCourse({ courseId, coachId, courtId, date, time, expectedPrice: latest.price });
    router.replace('/(member)/courses');
  });
  const next = () => { task.setError(null); if (!ready) return; if (step === 6) send(); else if (step === 4) setZooming(true); else setStep(s => s + 1); };
  return <MemberPage title={titles[step]} subtitle="Private badminton coaching, built around your game." tab="Book" back onBack={back} scrollKey={step} footer={<View style={{ gap: 10 }}>
    {course ? <Text style={f.strong}>{course.duration} minutes · {money(selectedAvailability?.price ?? course.price)}</Text> : null}
    <Notice error={task.error} />
    <Button label={task.loading ? 'Sending request…' : zooming ? 'Entering floor…' : step === 6 ? 'Send coach request' : step === 5 ? 'Review session' : `Choose ${steps[step + 1]?.toLowerCase()}`} disabled={!ready || zooming} busy={task.loading} onPress={next} testID="private-next" />
  </View>}>
    <StepProgress steps={steps} current={step} />
    <Notice loading={catalog.loading} error={catalog.error} onRetry={catalog.retry} />
    {step === 0 ? <>
      <View style={f.hero}><Text style={[f.kicker, { color: brand.gold }]}>PRIVATE BADMINTON</Text><Text style={f.heroTitle}>Focused coaching. Lasting progress.</Text><Text style={f.heroBody}>Choose your training package first, then meet its eligible coaches.</Text></View>
      {catalog.data?.courses.map(c => <Pressable key={c.id} testID={`private-package-${c.id}`} accessibilityRole="button" accessibilityState={{ selected: courseId === c.id }} onPress={() => { setCourseId(c.id); setCoachId(''); setTime(''); setFloor(null); setCourtId(''); }} style={[f.card, courseId === c.id && f.selected]}>
        {c.imageUrl ? <Image source={{ uri: mediaUrl(c.imageUrl) }} contentFit="cover" style={{ width: '100%', height: 150, borderRadius: 14 }} /> : null}
        <Text style={f.kicker}>{c.category}</Text><Text style={f.title}>{c.title}</Text><Text style={f.caption}>{c.description}</Text><Text style={f.strong}>{money(c.price)} · {c.duration} minutes</Text><Text style={f.caption}>{c.coaches.length} eligible coach{c.coaches.length === 1 ? '' : 'es'}{courseId === c.id ? ' · Selected ✓' : ''}</Text>
      </Pressable>)}
      {catalog.data && !catalog.data.courses.length ? <Text style={f.caption}>Private packages are currently unavailable.</Text> : null}
    </> : step === 1 ? <>
      <Text style={f.caption}>Coaches eligible for {course?.title}.</Text>
      {coaches.map(c => <View key={c.id} style={{ gap: 8 }}><Pressable testID={`private-coach-${c.id}`} accessibilityRole="button" accessibilityState={{ selected: coachId === c.id }} onPress={() => { setCoachId(c.id); setTime(''); setFloor(null); setCourtId(''); }} style={[f.card, coachId === c.id && f.selected]}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>{c.imageUrl ? <Image source={{ uri: mediaUrl(c.imageUrl) }} style={{ width: 72, height: 72, borderRadius: 36 }} contentFit="cover" /> : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: brand.goldSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={f.title}>{c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</Text></View>}<View style={{ flex: 1, gap: 6 }}><Text style={f.title}>{c.name}</Text><Text style={f.caption}>{c.specialty}</Text><Text style={f.kicker}>{coachId === c.id ? 'SELECTED' : 'ELIGIBLE COACH'}</Text></View></View>
      </Pressable><Button secondary label={`View ${c.name}’s profile`} testID={`coach-profile-${c.id}`} onPress={() => router.push({ pathname: '/(member)/coach/[id]', params: { id: c.id, courseId } })} /></View>)}
    </> : step === 2 ? <MonthCalendar month={month} selected={date ? [date] : []} label="Private course dates" onPrevious={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} previousDisabled={month <= (catalog.data?.today ?? yangonDate()).slice(0, 7)} disabled={d => d < (catalog.data?.today ?? yangonDate())} onSelect={d => { setDate(d); setTime(''); setFloor(null); setCourtId(''); }} /> : step === 3 ? <>
      <Text style={f.strong}>{shortDate(date)} · {coach?.name}</Text>
      <Notice loading={availability.loading} error={availability.error} onRetry={availability.retry} />
      <TimePicker options={times.map(t => ({ ...t, available: availableCount(t.time) > 0, detail: availableCount(t.time) ? `${availableCount(t.time)} courts available` : 'Unavailable' }))} selected={time ? [time] : []} testPrefix="private-time" onSelect={value => { setTime(value); setFloor(null); setCourtId(''); }} />
    </> : step === 4 ? <>
      <Notice loading={availability.loading} error={availability.error} onRetry={availability.retry} />
      <FloorSelector floor={floor} zooming={zooming} availableFloors={floors} disabled={!availability.data} onSelect={fl => { setFloor(fl); setCourtId(''); }} onEntered={() => { setZooming(false); setStep(5); }} />
    </> : step === 5 ? <>
      <View style={f.card}><Text style={f.strong}>{shortDate(date)}</Text><Text style={f.caption}>{time} · {coach?.name}</Text></View>
      <Notice loading={availability.loading} error={availability.error} onRetry={availability.retry} />
      {floor ? <CourtPlan courts={courtsOnFloor(courts, floor)} floor={floor} selectedId={selectedSlot ? courtId : undefined} availability={courtAvailability} onSelect={c => setCourtId(c.id)} /> : null}
    </> : <>
      <View style={f.hero}><Text style={[f.kicker, { color: brand.gold }]}>YOUR PRIVATE SESSION</Text><Text style={f.heroTitle}>{course?.title}</Text><Text style={f.heroBody}>A request goes to your coach. This is not confirmed until ZAWANA verifies acceptance and payment.</Text></View>
      <View style={f.card}><Fact label="Coach" value={coach?.name ?? ''} /><Fact label="Date" value={shortDate(date)} /><Fact label="Time" value={time} /><Fact label="Floor / court" value={`${floor} · ${court?.name}`} /><Fact label="Duration" value={`${course?.duration} minutes`} /><Fact label="Total" value={money(selectedAvailability?.price ?? 0)} /></View>
      <Notice loading={availability.loading} error={availability.error} onRetry={availability.retry} />
      <Text style={f.caption}>Your booking history will show coach acceptance, payment status and the actual payment deadline.</Text>
    </>}
  </MemberPage>;
}
export function mediaUrl(path: string) {
  const origin = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  return path.startsWith('/') ? `${origin}${path}` : path;
}
