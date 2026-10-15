import type { Reservation, Slot } from "./types.ts";
export function dateKey(now = new Date(), timeZone = "Asia/Yangon") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const p = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${p("year")}-${p("month")}-${p("day")}`;
}
export const dateLabel = (date: string, long = true) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(long ? { year: "numeric" } : {}),
  });
export const money = (value: number) => `${value.toLocaleString("en-US")} MMK`;
export const total = (slots: Slot[]) =>
  slots.reduce((sum, slot) => sum + slot.price, 0);
export const isSlotAvailable = (slot: Slot) =>
  slot.available && slot.status === "available";
const slotLabels: Record<Slot["status"], string> = {
  available: "Available",
  booked: "Booked",
  reserved: "Reserved",
  blocked: "Reserved",
  closed: "Closed",
  maintenance: "Maintenance",
  expired: "Expired",
};
export const slotStatusLabel = (
  status: Slot["status"],
  reason?: string | null,
) =>
  status === "blocked" && reason === "Class" ? "Class" : slotLabels[status];
export function toggleSlot(slots: Slot[], slot: Slot, limit: number): Slot[] {
  if (!isSlotAvailable(slot)) return slots;
  if (slots.some((s) => s.id === slot.id))
    return slots.filter((s) => s.id !== slot.id);
  return slots.length >= limit ? slots : [...slots, slot];
}
export function reconcile(slots: Slot[], fresh: Slot[], date: string) {
  const byId = new Map(fresh.map((s) => [s.id, s]));
  const available = (id: string) => {
    const slot = byId.get(id);
    return !!slot && isSlotAvailable(slot);
  };
  const removed = slots.filter((s) => s.date === date && !available(s.id));
  const next = slots
    .filter((s) => s.date !== date || available(s.id))
    .map((s) => (s.date === date ? byId.get(s.id)! : s));
  return { slots: next, removed };
}

export const statusLabel = (value: string) => {
  const label = value.toLowerCase().replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function bookingGroup(
  booking: Pick<Reservation, "status" | "date">,
  today = dateKey(),
): "upcoming" | "past" | "cancelled" {
  const status = booking.status.toUpperCase();
  if (["CANCELLED", "EXPIRED", "COACH_DECLINED"].includes(status))
    return "cancelled";
  return booking.date < today || status === "COMPLETED" ? "past" : "upcoming";
}
