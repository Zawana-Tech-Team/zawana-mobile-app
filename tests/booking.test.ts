import test from "node:test";
import assert from "node:assert/strict";
import { createAuthApi } from "../src/auth/api.ts";
import { AuthError } from "../src/auth/errors.ts";
import { availability, bookingResult } from "../src/booking/validation.ts";
import {
  dateKey,
  bookingGroup,
  isSlotAvailable,
  reconcile,
  slotStatusLabel,
  toggleSlot,
  total,
} from "../src/booking/domain.ts";
import type { Slot } from "../src/booking/types.ts";
const slot: Slot = {
  id: "2026-10-16|court-id|480",
  date: "2026-10-16",
  courtId: "court-id",
  courtName: "Court 01",
  time: "8:00 AM — 9:00 AM",
  label: "8:00 AM",
  startMinute: 480,
  endMinute: 540,
  price: 20000,
  available: true,
  status: "available",
  reason: null,
};
const court = {
  id: "court-id",
  name: "Court 01",
  type: "Standard",
  surface: "Indoor",
  price: 20000,
  status: "available",
  features: ["AC"],
};
const calendar = {
  date: slot.date,
  today: "2026-10-14",
  timeZone: "Asia/Yangon",
  currency: "MMK",
  openingTime: "6:00 AM",
  closingTime: "9:00 PM",
  maxSelections: 60,
  paymentPolicy: "venue",
  courts: [court],
  slots: [slot],
};
const reservation = {
  id: "real-booking",
  code: "ZW-real",
  userId: "member-id",
  kind: "court",
  title: "Court 01",
  date: slot.date,
  time: slot.time,
  location: "Zawana",
  price: 20000,
  courtId: court.id,
  paymentStatus: "pending",
  status: "CONFIRMED",
  meta: null,
  reservationExpiresAt: null,
};
const result = {
  booking: reservation,
  bookings: [reservation],
  totalPrice: 20000,
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const api = (fetchImpl: typeof fetch) =>
  createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => "application-session",
    fetchImpl,
  });
test("date keys use Yangon rather than device timezone", () => {
  assert.equal(dateKey(new Date("2026-10-14T18:00:00Z")), "2026-10-15");
});
test("booking tabs classify actual statuses and dates", () => {
  for (const status of ["cancelled", "CANCELLED", "EXPIRED", "COACH_DECLINED"])
    assert.equal(
      bookingGroup({ status, date: "2026-10-17" }, "2026-10-15"),
      "cancelled",
    );
  assert.equal(
    bookingGroup({ status: "CONFIRMED", date: "2026-10-14" }, "2026-10-15"),
    "past",
  );
  assert.equal(
    bookingGroup({ status: "COMPLETED", date: "2026-10-15" }, "2026-10-15"),
    "past",
  );
  for (const status of [
    "confirmed",
    "CONFIRMED",
    "AWAITING_PAYMENT",
    "pending",
  ])
    assert.equal(
      bookingGroup({ status, date: "2026-10-17" }, "2026-10-15"),
      "upcoming",
    );
});
test("slot selection uses stable IDs and supports deselection", () => {
  const selected = toggleSlot([], slot, 60);
  assert.equal(selected.length, 1);
  assert.deepEqual(toggleSlot(selected, { ...slot }, 60), []);
});
test("every unavailable status is labelled without requiring a reason and cannot be selected", () => {
  for (const status of [
    "booked",
    "reserved",
    "blocked",
    "closed",
    "maintenance",
    "expired",
  ] as const) {
    const unavailable = { ...slot, status, available: false, reason: null };
    assert.equal(
      slotStatusLabel(status),
      status === "blocked"
        ? "Reserved"
        : status.charAt(0).toUpperCase() + status.slice(1),
    );
    assert.equal(isSlotAvailable(unavailable), false);
    assert.deepEqual(toggleSlot([], unavailable, 60), []);
    assert.equal(
      availability({ ...calendar, slots: [unavailable] }).slots[0].status,
      status,
    );
  }
});
test("facility sessions display Class or Reserved without exposing private block titles", () => {
  assert.equal(slotStatusLabel("blocked", "Class"), "Class");
  assert.equal(slotStatusLabel("blocked", "Reserved"), "Reserved");
  assert.equal(slotStatusLabel("blocked", null), "Reserved");
  assert.equal(
    slotStatusLabel("blocked", "Staff-only private note"),
    "Reserved",
  );
  assert.equal(slotStatusLabel("booked", "Class"), "Booked");
});
test("status prevents selection and removes stale selections even if an available flag is incorrect", () => {
  const inconsistent: Slot = { ...slot, status: "booked", available: true };
  assert.equal(isSlotAvailable(inconsistent), false);
  assert.deepEqual(toggleSlot([], inconsistent, 60), []);
  assert.deepEqual(reconcile([slot], [inconsistent], slot.date), {
    slots: [],
    removed: [slot],
  });
});
test("custom unavailable reasons do not replace the status label", () => {
  const closed: Slot = {
    ...slot,
    status: "closed",
    available: false,
    reason: "Public holiday closure",
  };
  const parsed = availability({ ...calendar, slots: [closed] }).slots[0];
  assert.equal(slotStatusLabel(parsed.status), "Closed");
  assert.equal(parsed.reason, "Public holiday closure");
});
test("multi-court and multi-date totals retain individual sessions", () => {
  const other = {
    ...slot,
    id: "2026-10-17|other-court|900",
    courtId: "other-court",
    date: "2026-10-17",
    price: 25000,
  };
  assert.equal(total(toggleSlot([slot], other, 60)), 45000);
});
test("selection limit permits deselection while preventing additions", () => {
  assert.equal(toggleSlot([slot], { ...slot, id: "other" }, 1).length, 1);
  assert.equal(toggleSlot([slot], slot, 1).length, 0);
});
test("refresh removes invalid slots on its own date and updates prices", () => {
  const nextDate = {
    ...slot,
    date: "2026-10-17",
    id: "2026-10-17|court-id|480",
  };
  const update = reconcile(
    [slot, nextDate],
    [{ ...slot, available: false }],
    slot.date,
  );
  assert.deepEqual(update.slots, [nextDate]);
  assert.equal(update.removed.length, 1);
  assert.equal(
    reconcile([slot], [{ ...slot, price: 30000 }], slot.date).slots[0].price,
    30000,
  );
});
test("valid server availability retains exact slot identifiers and prices", () => {
  assert.deepEqual(availability(calendar), calendar);
});
test("malformed and duplicate server slots are refused", () => {
  for (const slots of [
    [{ ...slot, id: "0" }],
    [slot, slot],
    [{ ...slot, price: -1 }],
    [{ ...slot, endMinute: 550 }],
    [{ ...slot, status: "booked" }],
    [{ ...slot, available: false }],
    [{ ...slot, status: "unknown" }],
  ])
    assert.throws(() => availability({ ...calendar, slots }), AuthError);
});
test("confirmation must contain real IDs and an internally consistent total", () => {
  assert.deepEqual(bookingResult(result), result);
  assert.throws(() => bookingResult({ ...result, totalPrice: 1 }), AuthError);
  assert.throws(() => bookingResult({ ...result, bookings: [] }), AuthError);
});
test("court availability request is authenticated and passes cancellation", async () => {
  let called = false;
  const transport = api(async (url, options) => {
    called = true;
    assert.equal(
      String(url),
      "http://localhost:8000/api/court-booking/availability?date=2026-10-16",
    );
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      "Bearer application-session",
    );
    return response(calendar);
  });
  assert.deepEqual(await transport.getCourtAvailability(slot.date), calendar);
  assert.ok(called);
});
test("20 October availability uses the authenticated endpoint and server slot statuses", async () => {
  const date = "2026-10-20";
  const payload = {
    ...calendar,
    date,
    slots: [
      {
        ...slot,
        date,
        id: `${date}|${slot.courtId}|${slot.startMinute}`,
        status: "reserved",
        available: false,
        reason: null,
      },
    ],
  };
  const transport = api(async (url, options) => {
    assert.equal(
      String(url),
      `http://localhost:8000/api/court-booking/availability?date=${date}`,
    );
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      "Bearer application-session",
    );
    return response(payload);
  });
  const data = await transport.getCourtAvailability(date);
  assert.equal(slotStatusLabel(data.slots[0].status), "Reserved");
  assert.equal(isSlotAvailable(data.slots[0]), false);
});
test("atomic submission sends a retry key with exact court/date/time contract", async () => {
  const input = {
    kind: "court" as const,
    bookings: [{ date: slot.date, courtId: slot.courtId, time: slot.time }],
  };
  const transport = api(async (url, options) => {
    assert.equal(String(url), "http://localhost:8000/api/bookings");
    assert.equal(
      (options?.headers as Record<string, string>)["Idempotency-Key"],
      "retry-key",
    );
    assert.deepEqual(JSON.parse(String(options?.body)), input);
    return response(result, 201);
  });
  assert.equal(
    (await transport.createCourtBooking(input, "retry-key")).booking.id,
    "real-booking",
  );
});
test("conflict gives actionable feedback without a success result", async () => {
  const transport = api(async () =>
    response({ message: "Some slots were just reserved." }, 409),
  );
  await assert.rejects(
    transport.createCourtBooking({ kind: "court", bookings: [] }, "key"),
    (e) =>
      e instanceof AuthError &&
      e.code === "bookingConflict" &&
      e.status === 409,
  );
});
test("receipt query distinguishes missing receipt from unavailable backend", async () => {
  const transport = api(async () => response({ message: "No receipt" }, 404));
  await assert.rejects(
    transport.getBookingSubmission("key"),
    (e) => e instanceof AuthError && e.status === 404,
  );
});
test("server errors and transport outages cannot manufacture confirmation", async () => {
  await assert.rejects(
    api(async () =>
      response({ message: "SQL diagnostics" }, 500),
    ).getBookingSubmission("key"),
    (e) => e instanceof AuthError && !e.message.includes("SQL"),
  );
  await assert.rejects(
    api(async () => {
      throw new TypeError("offline");
    }).getBookingSubmission("key"),
    (e) => e instanceof AuthError && e.code === "network",
  );
});
test("member bookings and details use real protected endpoints", async () => {
  const calls: string[] = [];
  const transport = api(async (url) => {
    calls.push(String(url));
    return response(
      String(url).includes("?kind=") ? [reservation] : reservation,
    );
  });
  await transport.getCourtBookings();
  await transport.getCourtBooking(reservation.id);
  assert.deepEqual(calls, [
    "http://localhost:8000/api/bookings?kind=court",
    "http://localhost:8000/api/court-booking/bookings/real-booking",
  ]);
});
test("cancellation requests only the allowed status and preserves payment", async () => {
  const transport = api(async (_, options) => {
    assert.equal(options?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(options?.body)), {
      status: "cancelled",
    });
    return response({ ...reservation, status: "cancelled" });
  });
  assert.equal(
    (await transport.cancelCourtBooking(reservation.id)).paymentStatus,
    "pending",
  );
});

import {
  recoverSubmission,
  SingleSubmission,
} from "../src/booking/submission.ts";
const input = {
  kind: "court" as const,
  bookings: [{ date: slot.date, courtId: slot.courtId, time: slot.time }],
};
test("double taps share a single in-flight reservation", async () => {
  let calls = 0;
  const single = new SingleSubmission();
  const action = async () => {
    calls++;
    return bookingResult(result);
  };
  const a = single.run(action),
    b = single.run(action);
  assert.equal(a, b);
  await Promise.all([a, b]);
  assert.equal(calls, 1);
  assert.equal(single.busy, false);
});
test("lost acknowledgement is recovered without another creation", async () => {
  let posts = 0;
  const transport = {
    getBookingSubmission: async () => bookingResult(result),
    createCourtBooking: async () => {
      posts++;
      return bookingResult(result);
    },
  };
  assert.equal(
    (await recoverSubmission(transport, "original-key", input)).booking.id,
    "real-booking",
  );
  assert.equal(posts, 0);
});
test("an uncommitted request retries its original immutable key", async () => {
  let observed = "";
  const transport = {
    getBookingSubmission: async () => {
      throw new AuthError("notFound", "not committed", { status: 404 });
    },
    createCourtBooking: async (_: unknown, key: string) => {
      observed = key;
      return bookingResult(result);
    },
  };
  await recoverSubmission(transport, "original-key", input);
  assert.equal(observed, "original-key");
});
test("receipt lookup timeout leaves submission uncertain and never posts", async () => {
  let posts = 0;
  const transport = {
    getBookingSubmission: async () => {
      throw new AuthError("timeout", "timeout");
    },
    createCourtBooking: async () => {
      posts++;
      return bookingResult(result);
    },
  };
  await assert.rejects(recoverSubmission(transport, "original-key", input));
  assert.equal(posts, 0);
});
test("a lost POST response can be recovered on the next attempt", async () => {
  let committed = false,
    posts = 0;
  const transport = {
    getBookingSubmission: async () => {
      if (committed) return bookingResult(result);
      throw new AuthError("notFound", "not committed", { status: 404 });
    },
    createCourtBooking: async () => {
      committed = true;
      posts++;
      throw new AuthError("timeout", "lost response");
    },
  };
  await assert.rejects(recoverSubmission(transport, "original-key", input));
  assert.equal(
    (await recoverSubmission(transport, "original-key", input)).booking.id,
    "real-booking",
  );
  assert.equal(posts, 1);
});

test("busy database conflict remains an uncertain request rather than a rejected selection", async () => {
  const transport = api(async () =>
    response(
      { code: "BOOKING_BUSY", message: "Another request is committing." },
      409,
    ),
  );
  await assert.rejects(
    transport.createCourtBooking(input, "original-key"),
    (e) =>
      e instanceof AuthError && e.code === "unavailable" && e.status === 409,
  );
});
