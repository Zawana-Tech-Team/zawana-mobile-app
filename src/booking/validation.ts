import { AuthError } from "../auth/errors.ts";
import type {
  Availability,
  BookingResult,
  Court,
  Reservation,
  Slot,
} from "./types.ts";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";
const money = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const fail = () => {
  throw new AuthError(
    "invalidResponse",
    "Reservation information could not be read. Please refresh.",
  );
};
export function court(v: unknown): Court {
  if (
    !record(v) ||
    !str(v.id) ||
    !str(v.name) ||
    !str(v.type) ||
    !str(v.surface) ||
    !money(v.price) ||
    !["available", "maintenance", "inactive"].includes(String(v.status)) ||
    !Array.isArray(v.features) ||
    !v.features.every(str)
  )
    return fail();
  return v as Court;
}
export function reservation(v: unknown): Reservation {
  if (
    !record(v) ||
    [
      "id",
      "code",
      "userId",
      "kind",
      "title",
      "date",
      "time",
      "location",
      "status",
    ].some((k) => !str(v[k])) ||
    !money(v.price) ||
    !["pending", "paid", "refunded"].includes(String(v.paymentStatus)) ||
    (v.courtId !== null && !str(v.courtId)) ||
    (v.meta !== null && !str(v.meta)) ||
    (v.reservationExpiresAt !== null && !str(v.reservationExpiresAt))
  )
    return fail();
  if (v.court) court(v.court);
  return v as Reservation;
}
export function reservations(v: unknown): Reservation[] {
  if (!Array.isArray(v)) return fail();
  return v.map(reservation);
}
export function bookingResult(v: unknown): BookingResult {
  if (!record(v) || !money(v.totalPrice)) return fail();
  const bookings = reservations(v.bookings),
    booking = reservation(v.booking);
  if (
    !bookings.length ||
    bookings[0].id !== booking.id ||
    bookings.reduce((sum, row) => sum + row.price, 0) !== v.totalPrice
  )
    return fail();
  return { booking, bookings, totalPrice: v.totalPrice };
}
export function availability(v: unknown): Availability {
  if (
    !record(v) ||
    !str(v.date) ||
    !str(v.today) ||
    !str(v.timeZone) ||
    !str(v.openingTime) ||
    !str(v.closingTime) ||
    v.currency !== "MMK" ||
    v.paymentPolicy !== "venue" ||
    !money(v.maxSelections) ||
    !Array.isArray(v.courts) ||
    !Array.isArray(v.slots)
  )
    return fail();
  const courts = v.courts.map(court);
  for (const s of v.slots) {
    if (
      !record(s) ||
      ["id", "date", "courtId", "courtName", "time", "label"].some(
        (k) => !str(s[k]),
      ) ||
      !money(s.price) ||
      !money(s.startMinute) ||
      !money(s.endMinute) ||
      s.endMinute - s.startMinute !== 60 ||
      typeof s.available !== "boolean" ||
      ![
        "available",
        "booked",
        "reserved",
        "blocked",
        "closed",
        "maintenance",
        "expired",
      ].includes(String(s.status)) ||
      s.available !== (s.status === "available") ||
      (s.reason !== null && !str(s.reason)) ||
      s.date !== v.date ||
      !courts.some((c) => c.id === s.courtId) ||
      s.id !== `${s.date}|${s.courtId}|${s.startMinute}`
    )
      return fail();
  }
  if (new Set(v.slots.map((s) => (s as Slot).id)).size !== v.slots.length)
    return fail();
  return { ...v, courts } as Availability;
}
export function monthAvailability(
  v: unknown,
): import("./types.ts").MonthAvailability {
  if (
    !record(v) ||
    !str(v.month) ||
    !str(v.today) ||
    !Array.isArray(v.days) ||
    v.days.some(
      (d) =>
        !record(d) ||
        !str(d.date) ||
        typeof d.available !== "boolean" ||
        !money(d.availableSlots),
    )
  )
    return fail();
  return v as import("./types.ts").MonthAvailability;
}
