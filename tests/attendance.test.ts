import assert from "node:assert/strict";
import test from "node:test";
import { createAuthApi } from "../src/auth/api.ts";
import { attendanceDetail, attendanceRecords, attendanceStart, parseCheckInQr, qrPreview, qrResult, shiftMonth } from "../src/attendance/domain.ts";

const token = "q".repeat(43);
const preview = { categoryCode: "SOCIAL", enrollment: { id: "social-package", packageName: "Social 10", sessionsRemaining: 7, expiryDate: "2026-11-30" }, sessionsDeducted: 1, expectedRemaining: 6 };
const result = { success: true, categoryCode: "SOCIAL", sessionsDeducted: 1, checkInId: "visit-1", enrollment: { id: "social-package", packageName: "Social 10", sessionsRemaining: 6 } };
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });

test("QR parser accepts only the exact trusted venue check-in URL and fragment", () => {
  assert.equal(parseCheckInQr(`https://thezawana.com/check-in#${token}`), token);
  for (const input of [token, `http://thezawana.com/check-in#${token}`, `https://evil.test/check-in#${token}`, `https://thezawana.com.evil.test/check-in#${token}`, `https://thezawana.com/check-in?token=${token}`, `https://thezawana.com/check-in/?x#${token}`, `https://thezawana.com/check-in#short`]) assert.throws(() => parseCheckInQr(input));
});
test("check-in preview uses the backend-selected Social package and server balance", async () => {
  const calls: string[] = [];
  const api = createAuthApi({ baseUrl: "https://api.example.test", getIdToken: async () => "application-token", fetchImpl: async (url, init) => {
    calls.push(String(url));
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer application-token");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { token });
    return json(String(url).endsWith("preview") ? preview : result);
  } });
  assert.deepEqual(await api.previewCheckIn(token), preview);
  assert.deepEqual(await api.confirmCheckIn(token), result);
  assert.deepEqual(calls, ["https://api.example.test/api/check-in/preview", "https://api.example.test/api/check-in/scan"]);
});
test("duplicate or expired QR failures preserve backend explanation without success", async () => {
  for (const message of ["Already checked in to social today. No session was deducted.", "This QR code has expired."]) {
    let calls = 0;
    const api = createAuthApi({ baseUrl: "https://api.example.test", getIdToken: async () => "access", fetchImpl: async () => { calls++; return json({ message }, 409); } });
    await assert.rejects(api.confirmCheckIn(token), { message });
    assert.equal(calls, 1);
  }
});
test("ambiguous scan network failure is never automatically replayed", async () => {
  let calls = 0;
  const api = createAuthApi({ baseUrl: "https://api.example.test", getIdToken: async () => "access", fetchImpl: async () => { calls++; throw Error("connection lost"); } });
  await assert.rejects(api.confirmCheckIn(token));
  assert.equal(calls, 1);
});
test("malformed deductions and negative balances cannot render as successful check-in", () => {
  assert.deepEqual(qrPreview(preview), preview);
  assert.deepEqual(qrResult(result), result);
  assert.throws(() => qrPreview({ ...preview, expectedRemaining: -1 }));
  assert.throws(() => qrPreview({ ...preview, categoryCode: "OTHER" }));
  assert.throws(() => qrResult({ ...result, success: false }));
  assert.throws(() => qrResult({ ...result, enrollment: { ...result.enrollment, sessionsRemaining: "6" } }));
});
test("attendance history uses protected shared endpoint and cancellation signal", async () => {
  const controller = new AbortController();
  const api = createAuthApi({ baseUrl: "https://api.example.test/api", getIdToken: async () => "access", fetchImpl: async (url, init) => {
    assert.equal(url, "https://api.example.test/api/attendance?month=2026-10");
    assert.equal(init?.method, "GET");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer access");
    assert(init?.signal);
    return json({ records: [] });
  } });
  assert.deepEqual(await api.getAttendance("2026-10", { signal: controller.signal }), []);
});
test("malformed attendance records cannot masquerade as empty history", () => {
  assert.deepEqual(attendanceRecords({ records: [] }), []);
  assert.throws(() => attendanceRecords({}));
  assert.throws(() => attendanceRecords({ records: [{ id: "bad", status: "CONFIRMED" }] }));
});
test("attendance month navigation handles year boundaries", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});
test("attendance sorts morning, noon and evening session ranges chronologically", () => {
  assert(attendanceStart("9:00 AM — 10:00 AM") < attendanceStart("12:00 PM — 1:00 PM"));
  assert(attendanceStart("12:00 PM — 1:00 PM") < attendanceStart("2:00 PM — 3:00 PM"));
  assert.equal(attendanceStart("14:30"), 870);
});
test("attendance details accept server summaries and reject invalid percentages", () => {
  const summary = { attended: 2, missed: 1, late: 0, excused: 0, completedScheduled: 3, percentage: 67 };
  assert.deepEqual(attendanceDetail({ history: [], summary }), { history: [], summary });
  assert.throws(() => attendanceDetail({ history: [], summary: { ...summary, percentage: 101 } }));
  assert.throws(() => attendanceDetail({ history: null, summary }));
});
