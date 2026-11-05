import { AuthError } from '../auth/errors.ts';
import { reservation } from '../booking/validation.ts';
import { collectedPayment, type CollectedPayment } from '../staff/domain.ts';
import type { Reservation } from '../booking/types.ts';
export type GymScope = 'today' | 'upcoming' | 'completed' | 'all';
export type GymStatus = 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type GymSession = { id: string; date: string; startTime: string; endTime: string; durationMinutes: number; status: GymStatus; notes?: string | null; enrollmentId: string | null; member: { id: string; name: string }; coach: { id: string; name: string }; attendance: { userId: string; user: { id: string; name: string }; status: string }[]; enrollment: { id: string; code: string; sessionsRemaining: number; sessionsTotal: number; expiryDate: string; snapshot: { title: string } } | null; debit: { sessionId: string } | null };
export type Notification = { id: string; title: string; body: string; read: boolean; activeInInbox: boolean; createdAt: string; type: string | null; entityId: string | null; link: string | null };
export type SettlementInput = { requestKey: string; notes?: string; items: { paymentId: string; amount: number }[] };
export type Settlement = { id: string; amount: number; status: string; submittedAt: string; receivedAt: string | null; collectorId: string; receivedById: string | null; notes: string | null; items?: { paymentId: string; amount: number }[] };
export type FinanceRow = Reservation & { user: { id: string; name: string }; source: string; method: string | null; verificationStatus: string; payment: CollectedPayment | null; availableForHandover: number; cashHeld: number; received: number };
export type Finance = { rows: FinanceRow[]; settlements: Settlement[]; actors: { id: string; name: string }[]; summary: { revenue: number; foCash: number; coachCash: number; online: number; unpaid: number; refunds: number; personallyCollected: number; cashHeld: number; received: number } };
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const nullable = (v: unknown) => v === null || text(v);
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const person = (v: unknown) => obj(v) && text(v.id) && text(v.name);
const invalid = (): never => { throw new AuthError('invalidResponse', 'Could not read your coaching workspace. Please refresh.'); };
export function gymSession(v: unknown): GymSession {
  if (!obj(v) || !['id','date','startTime','endTime'].every(k => text(v[k])) || !count(v.durationMinutes) || !['SCHEDULED','CHECKED_IN','COMPLETED','CANCELLED','NO_SHOW'].includes(String(v.status)) || !nullable(v.enrollmentId) || !person(v.member) || !person(v.coach) || !Array.isArray(v.attendance) || v.attendance.some(a => !obj(a) || !text(a.userId) || !person(a.user) || !['PRESENT','ABSENT','EXPECTED'].includes(String(a.status)))) return invalid();
  if (v.enrollment !== null && (!obj(v.enrollment) || !text(v.enrollment.id) || !text(v.enrollment.code) || !text(v.enrollment.expiryDate) || !count(v.enrollment.sessionsRemaining) || !count(v.enrollment.sessionsTotal) || !obj(v.enrollment.snapshot) || !text(v.enrollment.snapshot.title))) return invalid();
  if (v.debit !== null && (!obj(v.debit) || !text(v.debit.sessionId))) return invalid();
  return v as GymSession;
}
export function gymSessions(v: unknown): GymSession[] { if (!Array.isArray(v)) return invalid(); return v.map(gymSession); }
export function notification(v: unknown): Notification {
  if (!obj(v) || !['id','title','body','createdAt'].every(k => text(v[k])) || typeof v.read !== 'boolean' || typeof v.activeInInbox !== 'boolean' || !['type','entityId','link'].every(k => nullable(v[k]))) return invalid();
  return v as Notification;
}
export function notifications(v: unknown): Notification[] { if (!Array.isArray(v)) return invalid(); return v.map(notification); }
export function settlement(v: unknown): Settlement {
  if (!obj(v) || !['id','collectorId','submittedAt','status'].every(k => text(v[k])) || !count(v.amount) || !['receivedAt','receivedById','notes'].every(k => nullable(v[k]))) return invalid();
  if (v.items !== undefined && (!Array.isArray(v.items) || v.items.some(i => !obj(i) || !text(i.paymentId) || !count(i.amount)))) return invalid();
  return v as Settlement;
}
export function finance(v: unknown): Finance {
  if (!obj(v) || !Array.isArray(v.rows) || !Array.isArray(v.settlements) || !Array.isArray(v.actors) || !v.actors.every(person) || !obj(v.summary) || !['revenue','foCash','coachCash','online','unpaid','refunds','personallyCollected','cashHeld','received'].every(k => count((v.summary as Record<string,unknown>)[k]))) return invalid();
  for (const row of v.rows) {
    reservation(row);
    if (!obj(row) || !person(row.user) || !text(row.source) || !nullable(row.method) || !text(row.verificationStatus) || !['availableForHandover','cashHeld','received'].every(k => count(row[k]))) return invalid();
    if (row.payment !== null) collectedPayment(row.payment);
  }
  v.settlements.forEach(settlement);
  return v as Finance;
}
/** Local form validation only; custody and over-allocation are revalidated transactionally by the server. */
export function handoverItems(values: Record<string, string>, rows: FinanceRow[], collectorId: string) {
  return Object.entries(values).filter(([,value]) => value.trim() !== '' && value !== '0').map(([paymentId,value]) => {
    const row = rows.find(r => r.payment?.id === paymentId);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0 || !row || row.source !== 'COACH' || row.payment?.collectedByUserId !== collectorId || Number(value) > row.availableForHandover) throw new AuthError('invalidInput','Choose a valid amount from your available coach collections.');
    return { paymentId, amount: Number(value) };
  });
}
/** Presentation eligibility only; the server revalidates every completion or no-show. */
export function sessionHasEnded(date: string, time: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Yangon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const part = (key:string) => parts.find(p=>p.type===key)?.value ?? '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  if (date !== today) return date < today;
  const end = time.split(/\s*[—–]\s*|\s+-\s+/)[1];
  const match = end?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return false;
  const hour=match[3]?Number(match[1])%12+(match[3].toUpperCase()==='PM'?12:0):Number(match[1]);
  return hour*60+Number(match[2]) <= Number(part('hour'))*60+Number(part('minute'));
}
