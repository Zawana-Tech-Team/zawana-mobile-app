import { AuthError } from "../auth/errors.ts";
import { reservation } from "../booking/validation.ts";
import type { Reservation } from "../booking/types.ts";

export type StaffRole = "coach" | "admin" | "badminton_fo";
/** Calendar presentation only; availability remains server-owned. */
export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export type StaffBooking = Reservation & {
  coachId: string | null;
  user: { id: string; name: string; email: string; phone?: string | null };
  coach: { id: string; name: string } | null;
  paymentExpiresAt: string | null;
  privateCoursePayment?: CollectedPayment | null;
  changes?: { id: string; action: string; reason: string | null; createdAt: string }[];
};
export type CollectedPayment = {
  id: string; bookingId: string; amount: number; currency: string;
  paymentSource: string; paymentMethod: string; status: string;
  collectedByUserId: string | null; verifiedAt: string | null;
  receivedAt: string | null; createdAt: string; externalReceiptReference: string | null;
};
export type StaffCatalog = {
  courses: { id: string; title: string; description: string; duration: number; price: number; coaches: { id: string; name: string }[] }[];
  courts: { id: string; name: string }[];
};
export type MemberMatch = { id: string; name: string; email: string; phone: string | null };
export type StaffCourseInput = {
  memberId: string; courseId: string; coachId: string; courtId: string;
  date: string; time: string; expectedPrice: number; paymentSource: "UNPAID" | "COACH" | "BADMINTON_FO" | "ONLINE";
  reference?: string; notes?: string;
  requestKey: string;
};
export type ManagedCourseInput = { title: string; description: string; duration: number; price: number; status: "active" | "inactive"; coachIds: string[] };
export function coachProfiles(v: unknown) {
  if (!Array.isArray(v) || v.some(c => !object(c) || !string(c.id) || !string(c.name) || !string(c.department) || !string(c.status) || !(c.user === null || object(c.user)))) return fail();
  return v as { id: string; name: string; department: string; status: string; user: { active: boolean } | null }[];
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === "string";
const nullable = (v: unknown) => v === null || string(v);
const money = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const fail = (): never => { throw new AuthError("invalidResponse", "ZAWANA returned unexpected workspace information. Please refresh."); };
export function collectedPayment(v: unknown): CollectedPayment {
  if (!object(v) || !["id", "bookingId", "currency", "paymentSource", "paymentMethod", "status", "createdAt"].every(k => string(v[k])) || !money(v.amount) || !["collectedByUserId", "verifiedAt", "receivedAt", "externalReceiptReference"].every(k => nullable(v[k]))) return fail();
  return v as CollectedPayment;
}
export function staffBooking(v: unknown): StaffBooking {
  reservation(v);
  if (!object(v) || !object(v.user) || !["id", "name", "email"].every(k => string(v.user && (v.user as Record<string, unknown>)[k])) || !nullable(v.coachId) || !nullable(v.paymentExpiresAt) ||
    !(v.coach === null || (object(v.coach) && string(v.coach.id) && string(v.coach.name)))) return fail();
  if (v.privateCoursePayment) collectedPayment(v.privateCoursePayment);
  if (v.changes !== undefined && (!Array.isArray(v.changes) || v.changes.some(c => !object(c) || !string(c.id) || !string(c.action) || !nullable(c.reason) || !string(c.createdAt)))) return fail();
  return v as StaffBooking;
}
export type PaymentAttempt = { id: string; reference: string; provider: string; providerReference: string | null; amount: number; status: string; paidAt: string | null };
export function paymentAttempts(v: unknown): PaymentAttempt[] {
  if (!Array.isArray(v) || v.some(p => !object(p) || !["id", "reference", "provider", "status"].every(k => string(p[k])) || !nullable(p.providerReference) || !nullable(p.paidAt) || !money(p.amount))) return fail();
  return v as PaymentAttempt[];
}
export function paymentAdjustment(v: unknown) {
  if (!object(v) || !string(v.id) || !string(v.paymentId) || !money(v.amount) || !string(v.reference)) return fail();
  return v as { id: string; paymentId: string; amount: number; reference: string };
}
export function staffBookings(v: unknown): StaffBooking[] { if (!Array.isArray(v)) return fail(); return v.map(staffBooking); }
export function coachCalendar(v: unknown) { if (!object(v)) return fail(); return { bookings: staffBookings(v.bookings) }; }
export function memberMatches(v: unknown): MemberMatch[] {
  if (!Array.isArray(v) || v.some(m => !object(m) || !["id", "name", "email"].every(k => string(m[k])) || !nullable(m.phone))) return fail();
  return v as MemberMatch[];
}
export function staffCatalog(v: unknown): StaffCatalog {
  const named = (x: unknown) => object(x) && string(x.id) && string(x.name);
  if (!object(v) || !Array.isArray(v.courses) || !Array.isArray(v.courts) || !v.courts.every(named) || v.courses.some(c => !object(c) || !string(c.id) || !string(c.title) || !string(c.description) || !money(c.price) || !money(c.duration) || !Array.isArray(c.coaches) || !c.coaches.every(named))) return fail();
  return v as StaffCatalog;
}
export function staffCreated(v: unknown) { return reservation(v); }
export function issuedQr(v: unknown) {
  if (!object(v) || !string(v.id) || !string(v.token) || !/^[A-Za-z0-9_-]{43}$/.test(v.token) || !["FOUNDATION", "SOCIAL", "PATHWAY"].includes(String(v.categoryCode)) || !string(v.expiresAt) || !Number.isFinite(Date.parse(v.expiresAt))) return fail();
  return v as { id: string; token: string; categoryCode: string; expiresAt: string };
}
export function recordedAttendance(v: unknown) {
  if (!object(v) || !string(v.id) || !["present", "late", "absent", "excused"].includes(String(v.status))) return fail();
  return v as { id: string; status: string };
}

export type StaffCourtBooking = Reservation & { user: { id: string; name: string; email: string } };
export function staffCourtBookings(v: unknown): StaffCourtBooking[] {
  if (!Array.isArray(v)) return fail();
  const rows = v.filter(b => object(b) && b.kind === 'court');
  for (const b of rows) {
    reservation(b);
    if (!object(b) || !object(b.user) || !['id','name','email'].every(k => string((b.user as Record<string, unknown>)[k]))) return fail();
  }
  return rows as StaffCourtBooking[];
}
