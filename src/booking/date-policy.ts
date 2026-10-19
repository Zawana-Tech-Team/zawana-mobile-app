import { dateKey } from "./domain.ts";

/** Facility-local presentation policy. The server's booking contract is unchanged. */
export function bookingDateWindow(now = new Date()) {
  const today = dateKey(now);
  const month = today.slice(0, 7);
  const end = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7), 0));
  return { today, month, lastDate: end.toISOString().slice(0, 10) };
}

export function isBookingDateAllowed(date: string, now = new Date()) {
  const { today, lastDate } = bookingDateWindow(now);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && date <= lastDate;
}
