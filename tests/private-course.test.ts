import test from "node:test";
import assert from "node:assert/strict";
import {
  courseAvailability,
  privateCourses,
  yangonDate,
  upcomingDays,
} from "../src/booking/private-course.ts";
import { createAuthApi } from "../src/auth/api.ts";
const selection = {
  courseId: "course",
  coachId: "coach",
  courtId: "court",
  date: "2026-10-23",
  durationMinutes: 90,
};
const availability = {
  ...selection,
  price: 50000,
  currency: "MMK",
  timeZone: "Asia/Yangon",
  today: "2026-10-21",
  slots: [
    {
      time: "8:00 AM — 9:30 AM",
      startMinute: 480,
      endMinute: 570,
      available: true,
      courtAvailable: true,
      coachAvailable: true,
      reason: null,
    },
  ],
};
test("Yangon day boundary stays independent of device timezone", () => {
  assert.equal(yangonDate(new Date("2026-10-21T17:29:59Z")), "2026-10-21");
  assert.equal(yangonDate(new Date("2026-10-21T17:30:00Z")), "2026-10-22");
  assert.deepEqual(upcomingDays("2026-12-31", 3), [
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
  ]);
});
test("availability rejects contradictory coach/court status and malformed amounts", () => {
  assert.equal(courseAvailability(availability).slots[0].available, true);
  assert.throws(() =>
    courseAvailability({
      ...availability,
      slots: [{ ...availability.slots[0], coachAvailable: false }],
    }),
  );
  assert.throws(() => courseAvailability({ ...availability, price: -1 }));
  assert.throws(() => privateCourses([{ id: "untrusted" }]));
});
test("combined availability sends the verified backend contract and application bearer", async () => {
  const api = createAuthApi({
    baseUrl: "https://zawana.test/api",
    getIdToken: async () => "app-token",
    fetchImpl: async (url, options) => {
      const parsed = new URL(String(url));
      assert.equal(parsed.pathname, "/api/private-courses/availability");
      assert.equal(parsed.searchParams.get("coachId"), "coach");
      assert.equal(parsed.searchParams.get("durationMinutes"), "90");
      assert.equal(
        (options?.headers as Record<string, string>).Authorization,
        "Bearer app-token",
      );
      return new Response(JSON.stringify(availability), { status: 200 });
    },
  });
  assert.equal(
    (await api.getPrivateCourseAvailability(selection)).price,
    50000,
  );
});
test("conflict and unavailable payment errors stay actionable without recording success", async () => {
  const api = createAuthApi({
    baseUrl: "https://zawana.test",
    getIdToken: async () => "token",
    fetchImpl: async () =>
      new Response(JSON.stringify({ message: "Coach is already booked." }), {
        status: 409,
      }),
  });
  await assert.rejects(
    api.requestPrivateCourse({ ...selection, time: "8:00 AM — 9:30 AM" }),
    /Coach is already booked/,
  );
  const down = createAuthApi({
    baseUrl: "https://zawana.test",
    getIdToken: async () => "token",
    fetchImpl: async () =>
      new Response(JSON.stringify({ message: "Internal error" }), {
        status: 503,
      }),
  });
  await assert.rejects(
    down.payPrivateCourse("booking"),
    /Reservations are unavailable/,
  );
});
