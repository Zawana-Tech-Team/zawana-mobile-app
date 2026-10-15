export type Court = {
  id: string;
  name: string;
  type: string;
  surface: string;
  price: number;
  status: "available" | "maintenance" | "inactive";
  features: string[];
};
export type Slot = {
  id: string;
  date: string;
  courtId: string;
  courtName: string;
  time: string;
  startMinute: number;
  endMinute: number;
  label: string;
  price: number;
  available: boolean;
  status:
    | "available"
    | "booked"
    | "reserved"
    | "blocked"
    | "closed"
    | "maintenance"
    | "expired";
  reason: string | null;
};
export type Availability = {
  date: string;
  today: string;
  timeZone: string;
  currency: "MMK";
  openingTime: string;
  closingTime: string;
  maxSelections: number;
  paymentPolicy: "venue";
  courts: Court[];
  slots: Slot[];
};
export type Reservation = {
  id: string;
  code: string;
  userId: string;
  kind: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: string;
  price: number;
  courtId: string | null;
  paymentStatus: "pending" | "paid" | "refunded";
  meta: string | null;
  reservationExpiresAt: string | null;
  court?: Court | null;
};
export type BookingResult = {
  booking: Reservation;
  bookings: Reservation[];
  totalPrice: number;
};
export type BookingInput = {
  kind: "court";
  bookings: { date: string; courtId: string; time: string }[];
  meta?: string;
};
export type MonthAvailability = {
  month: string;
  today: string;
  days: { date: string; available: boolean; availableSlots: number }[];
};
