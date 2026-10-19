import test from "node:test";
import assert from "node:assert/strict";
import { bookingDateWindow, isBookingDateAllowed } from "../src/booking/date-policy.ts";
import { courtFloor, courtsOnFloor } from "../src/components/booking/court-presentation.ts";
import type { Court } from "../src/booking/types.ts";

test("booking dates are limited to today through this facility month", () => {
  const now = new Date("2026-10-16T04:00:00Z");
  assert.deepEqual(bookingDateWindow(now), { today: "2026-10-16", month: "2026-10", lastDate: "2026-10-31" });
  for (const date of ["2026-10-16", "2026-10-31"]) assert.equal(isBookingDateAllowed(date, now), true);
  for (const date of ["2026-10-15", "2026-11-01", "2026-09-30", "2026-10-32", "invalid"]) assert.equal(isBookingDateAllowed(date, now), false);
});

test("the permitted month advances at Yangon midnight, including year rollover", () => {
  assert.equal(bookingDateWindow(new Date("2026-10-31T17:29:59Z")).month, "2026-10");
  const midnight = new Date("2026-10-31T17:30:00Z");
  assert.deepEqual(bookingDateWindow(midnight), { today: "2026-11-01", month: "2026-11", lastDate: "2026-11-30" });
  assert.equal(isBookingDateAllowed("2026-10-31", midnight), false);
  assert.deepEqual(bookingDateWindow(new Date("2026-12-31T17:30:00Z")), { today: "2027-01-01", month: "2027-01", lastDate: "2027-01-31" });
});

test("February uses its actual month end, including leap years", () => {
  assert.equal(bookingDateWindow(new Date("2028-02-01T00:00:00Z")).lastDate, "2028-02-29");
  assert.equal(bookingDateWindow(new Date("2027-02-01T00:00:00Z")).lastDate, "2027-02-28");
});

test("floor grouping retains backend court IDs and names on both floors", () => {
  const courts: Court[] = Array.from({ length: 8 }, (_, index) => ({
    id: `server-court-${index + 1}`, name: `Court ${index + 1}`,
    surface: index < 4 ? "2nd Floor" : "6th Floor", type: "Standard",
    price: 25000, status: "available", features: [],
  }));
  assert.deepEqual(courtsOnFloor(courts, "2nd Floor").map(c => c.id), courts.slice(0, 4).map(c => c.id));
  assert.deepEqual(courtsOnFloor(courts, "6th Floor").map(c => c.name), ["Court 5", "Court 6", "Court 7", "Court 8"]);
  assert.equal(courtsOnFloor(courts, "6th Floor")[0], courts[4]);
});

test("floor mapping uses facility metadata and never guesses from court order or identifiers", () => {
  assert.equal(courtFloor({ surface: " 6TH FLOOR " }), "6th Floor");
  assert.equal(courtFloor({ surface: "2nd Floor" }), "2nd Floor");
  for (const surface of ["Indoor", "", "4th Floor", "Court 5", "6"]) {
    assert.equal(courtFloor({ surface }), null);
  }
});
