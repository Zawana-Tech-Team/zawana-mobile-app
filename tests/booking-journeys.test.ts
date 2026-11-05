import assert from 'node:assert/strict';
import test from 'node:test';
import { selectedCourtSlots, timeChoices, mergeSelectedSlots, selectedCourtsSlots } from '../src/booking/selection.ts';
import { courtChangeDetail, courtChangeQuote, commitCourtChange } from '../src/booking/changes.ts';
import { calendarDays } from '../src/utils/calendar.ts';
import { attendanceMarkers } from '../src/attendance/calendar.ts';
import { AuthError } from '../src/auth/errors.ts';
import { createAuthApi } from '../src/auth/api.ts';
import type { Availability, Slot, Reservation } from '../src/booking/types.ts';
import type { AttendanceRecord } from '../src/attendance/domain.ts';

const slot = (courtId: string, date: string, time: string, available = true): Slot => ({ id: `${courtId}:${date}:${time}`, courtId, courtName: courtId, date, time, startMinute: 480, endMinute: 540, label: time, price: 20000, available, status: available ? 'available' : 'booked', reason: available ? null : 'Booked' });
const day = (date: string, slots: Slot[]): Availability => ({ date, today: '2026-10-29', timeZone: 'Asia/Yangon', currency: 'MMK', openingTime: '6:00 AM', closingTime: '9:00 PM', maxSelections: 60, paymentPolicy: 'venue', courts: [], slots });
test('time-first choices come from server schedule and preserve future-day hours', () => {
  const d = day('2026-10-29', [slot('one','2026-10-29','8:00 AM — 9:00 AM',false),slot('two','2026-10-29','8:00 AM — 9:00 AM')]);
  assert.equal(timeChoices(d).length, 1);
  assert.equal(timeChoices(d)[0].time, '8:00 AM — 9:00 AM');
});
test('court availability must satisfy every selected time on every selected date', () => {
  const days = ['2026-10-30','2026-10-31'].map(d => day(d, ['8:00 AM — 9:00 AM','9:00 AM — 10:00 AM'].map(t => slot('court-1',d,t))));
  assert.equal(selectedCourtSlots(days,'court-1',['8:00 AM — 9:00 AM','9:00 AM — 10:00 AM'])?.length,4);
  days[1].slots[1] = { ...days[1].slots[1], status: 'blocked', available: false };
  assert.equal(selectedCourtSlots(days,'court-1',['8:00 AM — 9:00 AM','9:00 AM — 10:00 AM']),null);
  assert.equal(selectedCourtSlots(days,'missing',['8:00 AM — 9:00 AM']),null);
  assert.equal(selectedCourtSlots([], 'court-1', ['8:00 AM — 9:00 AM']),null);
});
test('availability flag cannot override a server occupied status', () => {
  const s = { ...slot('one','2026-10-30','8:00 AM — 9:00 AM'), status: 'reserved' as const };
  assert.equal(selectedCourtSlots([day(s.date,[s])],s.courtId,[s.time]),null);
});
const booking: Reservation = { id:'booking-1',code:'PC-1',userId:'member',kind:'court',title:'Court 1',date:'2026-10-31',time:'8:00 AM — 9:00 AM',location:'ZAWANA',status:'CONFIRMED',price:20000,courtId:'court-1',paymentStatus:'paid',meta:null,reservationExpiresAt:null };
const detail = () => ({ booking, eligibility:{eligible:true,message:'At least 24 hours before session'}, revision:'revision-1',history:[],cancellations:[],cancellationPolicy:{message:'Manual refund review'} });
test('reschedule detail and quote validate authoritative eligibility and signed price differences', () => {
  assert.equal(courtChangeDetail(detail()).eligibility.eligible,true);
  const quote = { revision:'revision-1',difference:-5000, original:{date:booking.date,time:booking.time,courtId:'court-1',price:20000},proposed:{date:'2026-10-30',time:booking.time,courtId:'court-2',courtName:'Court 2',price:15000,available:true} };
  assert.equal(courtChangeQuote(quote).difference,-5000);
  assert.throws(()=>courtChangeQuote({...quote,difference:'0'}));
  assert.throws(()=>courtChangeDetail({...detail(),eligibility:{eligible:'true',message:'bad'}}));
});
test('ambiguous reschedule recovers only a server-confirmed exact destination', async () => {
  let writes=0;
  const input={date:'2026-10-30',time:booking.time,courtId:'court-2',revision:'revision-1',reason:'Changed plans'};
  const api={rescheduleCourt:async()=>{writes++;throw new AuthError('network','Connection lost');},getCourtChangeDetail:async()=>({...detail(),booking:{...booking,...input}})};
  const saved=await commitCourtChange(api,booking.id,input);assert.equal(saved.courtId,'court-2');assert.equal(writes,1);
  await assert.rejects(commitCourtChange({...api,getCourtChangeDetail:async()=>detail()},booking.id,input));assert.equal(writes,2);
});
test('reschedule HTTP contract sends revision and reason to the shared court service', async () => {
  const input={date:'2026-10-30',time:booking.time,courtId:'court-2',revision:'revision-1',reason:'Changed plans'};
  const api=createAuthApi({baseUrl:'https://api.example.test',getIdToken:async()=>'access',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.example.test/api/court-booking/bookings/booking-1/reschedule');assert.equal(options?.method,'POST');assert.deepEqual(JSON.parse(String(options?.body)),input);return Response.json({...booking,...input});}});
  assert.equal((await api.rescheduleCourt(booking.id,input)).id,booking.id);
});
test('calendar handles leap years, leading blanks and complete week rows', () => {
  const feb=calendarDays('2028-02');assert.equal(feb.filter(Boolean).length,29);assert(feb.includes('2028-02-29'));assert.equal(feb.length%7,0);
  assert.equal(calendarDays('2027-02').filter(Boolean).length,28);
  assert.equal(calendarDays('2026-11')[0],'2026-11-01');
});
test('attendance markers use actual records without creating visits for empty days', () => {
  const rows=[{date:'2026-10-29',status:'present'},{date:'2026-10-29',status:'late'},{date:'2026-10-30',status:'absent'}] as AttendanceRecord[];
  const markers=attendanceMarkers(rows);assert.equal(markers['2026-10-29'].count,2);assert.equal(markers['2026-10-30'].count,1);assert.equal(markers['2026-10-31'],undefined);assert.deepEqual(attendanceMarkers([]),{});
});

test('editing a session replaces it atomically without duplicating the original court', () => {
  const old = slot('one','2026-10-30','8:00 AM — 9:00 AM');
  const next = slot('two',old.date,old.time);
  assert.deepEqual(mergeSelectedSlots([old],[next],1,[old.id]),[next]);
  assert.deepEqual(mergeSelectedSlots([old],[next],1),[old]);
  assert.deepEqual(mergeSelectedSlots([old],[{...next,available:false}],1,[old.id]),[old]);
  assert.deepEqual(mergeSelectedSlots([old],[old],1),[old]);
});

test('multiple courts require every court, day and hour and never drop a conflicting court', () => {
  const dates = ['2026-10-30','2026-10-31'];
  const times = ['8:00 AM — 9:00 AM','9:00 AM — 10:00 AM'];
  const days = dates.map(date => day(date, ['one','two'].flatMap(id => times.map(t => slot(id,date,t)))));
  const chosen = selectedCourtsSlots(days,['one','two','one'],times);
  assert.equal(chosen?.length,8);
  assert.equal(new Set(chosen?.map(s=>s.id)).size,8);
  assert.equal(selectedCourtsSlots(days,[],times),null);
  days[1].slots[3] = {...days[1].slots[3],available:false,status:'booked'};
  assert.equal(selectedCourtsSlots(days,['one','two'],times),null);
  assert.equal(selectedCourtsSlots(days,['one'],times)?.length,4);
});
