import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Crypto from "expo-crypto";
import { useAuth } from "@/auth/auth-provider";
import { AuthError, sanitizeAuthError } from "@/auth/errors";
import { secureDeviceStorage } from "@/auth/storage";
import { recoverSubmission, SingleSubmission } from "./submission";
import { bookingResult } from "./validation";
import { isSlotAvailable, reconcile, toggleSlot } from "./domain";
import type { Availability, BookingInput, BookingResult, Slot } from "./types";

type Pending = { key: string; input: BookingInput };
type BookingState = {
  dates: string[];
  slots: Slot[];
  notes: string;
  busy: boolean;
  restoring: boolean;
  pending: boolean;
  result: BookingResult | null;
  notice: string | null;
  revision: number;
  setDates: (dates: string[]) => void;
  toggle: (slot: Slot, limit: number) => void;
  remove: (id: string) => void;
  setNotes: (notes: string) => void;
  refresh: (availability: Availability) => void;
  submit: () => Promise<BookingResult>;
  reset: () => void;
  invalidate: () => void;
};
const Context = createContext<BookingState | null>(null);
export function BookingProvider({ children }: { children: ReactNode }) {
  const { api, user } = useAuth();
  const [dates, setDatesState] = useState<string[]>([]),
    [notes, setNotesState] = useState("");
  const [selection, setSelection] = useState<{
    slots: Slot[];
    removed: Slot[];
  }>({ slots: [], removed: [] });
  const slots = selection.slots;
  const setSlots = (update: Slot[] | ((slots: Slot[]) => Slot[])) =>
    setSelection((previous) => ({
      slots: typeof update === "function" ? update(previous.slots) : update,
      removed: [],
    }));
  const [busy, setBusy] = useState(false),
    [restoring, setRestoring] = useState(true),
    [pendingState, setPendingState] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null),
    [notice, setNotice] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  const pending = useRef<Pending | null>(null),
    flight = useRef(new SingleSubmission());
  const currentUser = useRef(user?.id);
  useEffect(() => {
    currentUser.current = user?.id;
    return () => {
      currentUser.current = undefined;
    };
  }, [user?.id]);
  const key = `booking.pending.v1.${user?.id || ""}`;
  useEffect(() => {
    let active = true;
    void secureDeviceStorage
      .getItem(key)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          const value: unknown = JSON.parse(raw);
          if (
            typeof value === "object" &&
            value !== null &&
            "key" in value &&
            typeof value.key === "string" &&
            "input" in value &&
            typeof value.input === "object" &&
            value.input !== null &&
            "kind" in value.input &&
            value.input.kind === "court" &&
            "bookings" in value.input &&
            Array.isArray(value.input.bookings)
          ) {
            pending.current = value as Pending;
            setPendingState(true);
            setNotice(
              "An earlier reservation needs checking. Open Review to recover its result safely.",
            );
          } else throw new Error("Invalid pending reservation");
        }
      })
      .catch(() => {
        if (active)
          setNotice(
            "Could not restore your reservation. Please refresh before booking.",
          );
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [key]);
  const invalidate = useCallback(() => setRevision((v) => v + 1), []);
  const refresh = useCallback((data: Availability) => {
    if (pending.current || flight.current.busy) return;
    setSelection((previous) =>
      reconcile(previous.slots, data.slots, data.date),
    );
  }, []);
  const submit = () => {
    const owner = user?.id;
    const run = async () => {
      if (!owner || restoring)
        throw new AuthError("sessionExpired", "Please sign in again.");
      setBusy(true);
      setNotice(null);
      try {
        let attempt = pending.current;
        if (!attempt) {
          if (!slots.length)
            throw new AuthError(
              "invalidInput",
              "Select at least one available time slot.",
            );
          // Refresh every selected date before persisting the immutable submission.
          const fresh = await Promise.all(
            [...new Set(slots.map((s) => s.date))].map((date) =>
              api.getCourtAvailability(date),
            ),
          );
          if (currentUser.current !== owner)
            throw new AuthError(
              "sessionExpired",
              "The active account has changed.",
            );
          const all = new Map(
            fresh.flatMap((a) => a.slots).map((s) => [s.id, s]),
          );
          const valid = slots
            .map((s) => all.get(s.id))
            .filter((s): s is Slot => !!s && isSlotAvailable(s));
          if (valid.length !== slots.length) {
            setSlots(valid);
            invalidate();
            throw new AuthError(
              "bookingConflict",
              "Some selected slots are no longer available. Review your selection.",
            );
          }
          if (valid.some((s, i) => s.price !== slots[i].price)) {
            setSlots(valid);
            throw new AuthError(
              "bookingConflict",
              "Prices have changed. Review the updated total before confirming.",
            );
          }
          attempt = {
            key: Crypto.randomUUID(),
            input: {
              kind: "court",
              bookings: valid.map(({ date, courtId, time }) => ({
                date,
                courtId,
                time,
              })),
              meta: notes,
            },
          };
          await secureDeviceStorage.setItem(key, JSON.stringify(attempt));
          pending.current = attempt;
          setPendingState(true);
        }
        const sameOwner = () => {
          if (currentUser.current !== owner)
            throw new AuthError(
              "sessionExpired",
              "The active account has changed.",
            );
        };
        const response = await recoverSubmission(
          {
            getBookingSubmission: (key) => {
              sameOwner();
              return api.getBookingSubmission(key);
            },
            createCourtBooking: (input, key) => {
              sameOwner();
              return api.createCourtBooking(input, key);
            },
          },
          attempt.key,
          attempt.input,
        );
        bookingResult(response);
        if (response.bookings.some((row) => row.userId !== owner))
          throw new AuthError(
            "invalidResponse",
            "Reservation ownership could not be verified.",
          );
        if (currentUser.current !== owner)
          throw new AuthError(
            "sessionExpired",
            "The active account has changed.",
          );
        setResult(response);
        setSlots([]);
        setDatesState([]);
        setNotesState("");
        pending.current = null;
        setPendingState(false);
        invalidate();
        await secureDeviceStorage.removeItem(key).catch(() => undefined);
        return response;
      } catch (error) {
        const failure = sanitizeAuthError(error);
        if (
          failure.code === "invalidInput" ||
          failure.code === "bookingConflict"
        ) {
          pending.current = null;
          setPendingState(false);
          await secureDeviceStorage.removeItem(key).catch(() => undefined);
          invalidate();
        }
        throw failure;
      } finally {
        setBusy(false);
      }
    };
    return flight.current.run(run);
  };
  const canEdit = () =>
    !flight.current.busy &&
    !pending.current &&
    !busy &&
    !pendingState &&
    !restoring;
  return (
    <Context.Provider
      value={{
        dates,
        slots,
        notes,
        busy,
        restoring,
        pending: pendingState,
        result,
        notice:
          notice ||
          (selection.removed.length
            ? `${selection.removed.length} selected session(s) became unavailable and were removed. Review your remaining selections.`
            : null),
        revision,
        setDates: (next) => {
          if (canEdit()) {
            setDatesState([...new Set(next)].sort());
            setSlots((s) => s.filter((slot) => next.includes(slot.date)));
          }
        },
        toggle: (slot, limit) => {
          if (canEdit()) setSlots((s) => toggleSlot(s, slot, limit));
        },
        remove: (id) => {
          if (canEdit()) setSlots((s) => s.filter((slot) => slot.id !== id));
        },
        setNotes: (next) => {
          if (canEdit()) setNotesState(next.slice(0, 200));
        },
        refresh,
        submit,
        invalidate,
        reset: () => {
          if (canEdit()) {
            setDatesState([]);
            setSlots([]);
            setNotesState("");
            setResult(null);
            setNotice(null);
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useBooking() {
  const context = useContext(Context);
  if (!context) throw new Error("BookingProvider missing");
  return context;
}
