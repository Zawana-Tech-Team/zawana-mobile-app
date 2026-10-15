import { AuthError } from "../auth/errors.ts";
import type { BookingInput, BookingResult } from "./types.ts";

type Transport = {
  getBookingSubmission: (key: string) => Promise<BookingResult>;
  createCourtBooking: (
    input: BookingInput,
    key: string,
  ) => Promise<BookingResult>;
};
/** Keep the same key even when a POST's acknowledgement is lost. 404 means no committed receipt yet. */
export async function recoverSubmission(
  api: Transport,
  key: string,
  input: BookingInput,
): Promise<BookingResult> {
  try {
    return await api.getBookingSubmission(key);
  } catch (error) {
    if (!(error instanceof AuthError) || error.status !== 404) throw error;
    return api.createCourtBooking(input, key);
  }
}
/** Concurrent taps share exactly one operation, even before React renders its busy state. */
export class SingleSubmission {
  private flight: Promise<BookingResult> | null = null;
  get busy() {
    return this.flight !== null;
  }
  run(action: () => Promise<BookingResult>): Promise<BookingResult> {
    if (this.flight) return this.flight;
    // Defer the action so the flight is established before any awaited work or synchronous failure.
    this.flight = Promise.resolve()
      .then(action)
      .finally(() => {
        this.flight = null;
      });
    return this.flight;
  }
}
