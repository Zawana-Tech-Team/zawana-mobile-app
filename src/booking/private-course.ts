import { AuthError } from "../auth/errors.ts";
import { reservation } from "./validation.ts";
import type { DashboardBooking, DashboardCoach } from "../auth/types.ts";

export type PrivateCourse = {
  id: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  status: string;
  imageUrl: string | null;
  category: string;
  coaches: DashboardCoach[];
};
export type CourseInput = {
  courseId: string;
  coachId: string;
  courtId: string;
  date: string;
  time: string;
  expectedPrice?: number;
};
export type CourseAvailabilityInput = Omit<
  CourseInput,
  "time" | "expectedPrice"
> & {
  durationMinutes: number;
};
export type CourseSlot = {
  time: string;
  startMinute: number;
  endMinute: number;
  coachAvailable: boolean;
  courtAvailable: boolean;
  available: boolean;
  reason: string | null;
};
export type CourseAvailability = CourseAvailabilityInput & {
  price: number;
  currency: "MMK";
  timeZone: string;
  today: string;
  slots: CourseSlot[];
};
export type Payment = {
  id: string;
  status: string;
  checkoutUrl: string | null;
  expiresAt: string;
};
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const money = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const fail = (): never => {
  throw new AuthError(
    "invalidResponse",
    "Could not read badminton service information. Please refresh.",
  );
};
export function privateCourses(value: unknown): PrivateCourse[] {
  if (!Array.isArray(value)) return fail();
  for (const c of value) {
    if (
      !record(c) ||
      !["id", "title", "description", "status", "category"].every(
        (k) => typeof c[k] === "string",
      ) ||
      !money(c.price) ||
      !money(c.duration) ||
      c.duration <= 0 ||
      !Array.isArray(c.coaches) ||
      !(c.imageUrl === null || typeof c.imageUrl === "string")
    )
      return fail();
    for (const coach of c.coaches)
      if (
        !record(coach) ||
        !["id", "name", "specialty", "status", "department"].every(
          (k) => typeof coach[k] === "string",
        )
      )
        return fail();
  }
  return value as PrivateCourse[];
}
export function courseAvailability(value: unknown): CourseAvailability {
  if (
    !record(value) ||
    !["courseId", "coachId", "courtId", "date", "today", "timeZone"].every(
      (k) => typeof value[k] === "string",
    ) ||
    value.currency !== "MMK" ||
    !money(value.price) ||
    !money(value.durationMinutes) ||
    !Array.isArray(value.slots)
  )
    return fail();
  for (const s of value.slots)
    if (
      !record(s) ||
      typeof s.time !== "string" ||
      !money(s.startMinute) ||
      !money(s.endMinute) ||
      s.endMinute <= s.startMinute ||
      !["coachAvailable", "courtAvailable", "available"].every(
        (k) => typeof s[k] === "boolean",
      ) ||
      !(s.reason === null || typeof s.reason === "string") ||
      (s.available && (!s.coachAvailable || !s.courtAvailable))
    )
      return fail();
  return value as CourseAvailability;
}
export function courseBooking(value: unknown): DashboardBooking {
  reservation(value);
  if (
    !record(value) ||
    value.kind !== "private_course" ||
    !(
      value.paymentExpiresAt === null ||
      typeof value.paymentExpiresAt === "string"
    )
  )
    return fail();
  return value as DashboardBooking;
}
export function courseBookings(value: unknown): DashboardBooking[] {
  if (!Array.isArray(value)) return fail();
  return value.map(courseBooking);
}
export function bookingEnvelope(value: unknown) {
  if (!record(value)) return fail();
  return { booking: courseBooking(value.booking) };
}
export function paymentEnvelope(value: unknown): {
  payment: Payment;
  booking: DashboardBooking;
} {
  if (!record(value) || !record(value.payment)) return fail();
  const p = value.payment;
  if (
    typeof p.id !== "string" ||
    typeof p.status !== "string" ||
    typeof p.expiresAt !== "string" ||
    !(p.checkoutUrl === null || typeof p.checkoutUrl === "string")
  )
    return fail();
  return { payment: p as Payment, booking: courseBooking(value.booking) };
}
export const courseStatus = (status: string) =>
  ({
    PENDING_COACH_CONFIRMATION: "Awaiting coach",
    PENDING_COACH: "Awaiting coach",
    AWAITING_PAYMENT: "Awaiting payment",
    CONFIRMED: "Confirmed",
    COACH_DECLINED: "Coach declined",
    REJECTED: "Coach declined",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
    COMPLETED: "Completed",
  })[status] ?? status.replace(/_/g, " ").toLowerCase();
export function yangonDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const p = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${p("year")}-${p("month")}-${p("day")}`;
}
export function upcomingDays(start: string, count = 28) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
