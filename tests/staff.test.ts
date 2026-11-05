import assert from "node:assert/strict";
import test from "node:test";
import { createAuthApi } from "../src/auth/api.ts";
import { sessionNavigation } from "../src/auth/navigation-policy.ts";
import { collectedPayment, staffBookings, staffCatalog } from "../src/staff/domain.ts";
import type { UserRole } from "../src/auth/types.ts";

const user = { id: "staff-1", name: "Coach", email: "coach@example.test", phone: null, avatar: null, membership: null };
const identity = { uid: user.id, email: user.email, emailVerified: true };
test("validated staff sessions route only into the staff workspace", () => {
  for (const role of ["coach", "admin", "badminton_fo"] as const) {
    const policy = sessionNavigation({ status: "authenticated", identity, user: { ...user, role } });
    assert.equal(policy.staff, true); assert.equal(policy.member, false);
    assert.equal(policy.authentication, false); assert.equal(policy.landing, role === "coach" ? "/(staff)/calendar" : "/(staff)/overview");
    assert.equal(sessionNavigation({ status: "loading", identity, user: { ...user, role } }).staff, false);
    assert.equal(sessionNavigation({ status: "authenticated", identity: null, user: { ...user, role } }).staff, false);
  }
});
test("member and unsupported roles cannot enter staff routes", () => {
  for (const role of ["member", "owner", "gym_fo", "doctor"] as UserRole[]) assert.equal(sessionNavigation({ status: "authenticated", identity, user: { ...user, role } }).staff, false);
});
const receipt = { id: "receipt", bookingId: "booking", amount: 50000, currency: "MMK", paymentSource: "COACH", paymentMethod: "CASH", status: "PAID", collectedByUserId: user.id, verifiedAt: "2026-10-29T01:00:00Z", receivedAt: "2026-10-29T01:00:00Z", createdAt: "2026-10-29T01:00:00Z", externalReceiptReference: null };
test("cash collection submits only backend-supported fields and preserves receipt identity", async () => {
  const api = createAuthApi({ baseUrl: "https://api.example.test", getIdToken: async () => "access", fetchImpl: async (url, init) => {
    assert.equal(url, "https://api.example.test/api/staff/private-courses/bookings/booking/cash");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { reference: "FO-1", notes: "Received in person" });
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer access");
    return Response.json(receipt);
  } });
  assert.deepEqual(await api.recordCourseCash("booking", "FO-1", "Received in person"), receipt);
});
test("malformed financial data fails instead of displaying a successful collection", () => {
  assert.throws(() => collectedPayment({ ...receipt, amount: -1 }));
  assert.throws(() => collectedPayment({ ...receipt, collectedByUserId: undefined }));
  assert.throws(() => staffBookings([{ id: "booking" }]));
  assert.throws(() => staffCatalog({ courses: [{ price: "50000" }], courts: [] }));
});
test("staff creation retains requestKey and unpaid source without inventing amount or method", async () => {
  const input = { memberId: "member", courseId: "course", coachId: "coach", courtId: "court", date: "2026-10-30", time: "8:00 AM — 9:00 AM", expectedPrice: 50000, paymentSource: "UNPAID" as const, requestKey: "same-staff-key-1234" };
  let calls = 0;
  const api = createAuthApi({ baseUrl: "https://api.example.test", getIdToken: async () => "access", fetchImpl: async (_url, init) => {
    calls++; assert.deepEqual(JSON.parse(String(init?.body)), input); throw Error("ambiguous network outcome");
  } });
  await assert.rejects(api.createStaffCourse(input)); assert.equal(calls, 1);
});
test("staff permission failures preserve the server rejection and are never replayed", async () => {
  let calls = 0;
  const api = createAuthApi({ baseUrl: "https://api.example.test", getIdToken: async () => "access", fetchImpl: async () => { calls++; return Response.json({ message: "This booking belongs to another coach." }, { status: 403 }); } });
  await assert.rejects(api.recordCourseCash("other", "", ""), { message: "This booking belongs to another coach." });
  assert.equal(calls, 1);
});
test("QR issuance and revocation use category and server ID contracts", async () => {
  const calls: string[] = [];
  const api = createAuthApi({ baseUrl: "https://api.example.test", getIdToken: async () => "access", fetchImpl: async (url, init) => {
    calls.push(`${init?.method} ${url}`);
    if (init?.method === "DELETE") return Response.json({ revoked: true });
    assert.deepEqual(JSON.parse(String(init?.body)), { categoryCode: "SOCIAL" });
    return Response.json({ id: "qr", token: "q".repeat(43), categoryCode: "SOCIAL", expiresAt: "2026-10-29T20:00:00Z" });
  } });
  const qr = await api.issueEntryQr("SOCIAL"); await api.revokeEntryQr(qr.id);
  assert.deepEqual(calls, ["POST https://api.example.test/api/check-in/qr", "DELETE https://api.example.test/api/check-in/qr/qr"]);
});
test("online reconciliation and refunds retain backend evidence contracts", async () => {
  const calls: { path: string; body: unknown }[] = [];
  const api = createAuthApi({ baseUrl: "https://api.example.test", getIdToken: async () => "access", fetchImpl: async (url, init) => {
    calls.push({ path: String(url), body: JSON.parse(String(init?.body)) });
    return Response.json(String(url).endsWith("/refund") ? { id: "adjustment", paymentId: receipt.id, amount: receipt.amount, reference: "REFUND-1" } : receipt);
  } });
  await api.reconcileCoursePayment("booking", "verified-attempt");
  await api.refundCoursePayment("booking", { reason: "Member requested cancellation", evidence: "Refund completed at front desk", reference: "REFUND-1" });
  assert.deepEqual(calls[0], { path: "https://api.example.test/api/staff/private-courses/bookings/booking/reconcile-online", body: { paymentAttemptId: "verified-attempt" } });
  assert.deepEqual(calls[1].body, { reason: "Member requested cancellation", evidence: "Refund completed at front desk", reference: "REFUND-1" });
});


test('staff court reads retain member identity and filter non-court rows from the shared endpoint', async () => {
  const row = {id:'court-booking',code:'CB-1',userId:'member',kind:'court',title:'Court 2',date:'2026-11-01',time:'8:00 AM — 9:00 AM',location:'ZAWANA',status:'CONFIRMED',price:20000,courtId:'court-2',paymentStatus:'paid',meta:null,reservationExpiresAt:null,user:{id:'member',name:'Player',email:'player@example.test'}};
  const api = createAuthApi({baseUrl:'https://api.example.test',getIdToken:async()=>'staff',fetchImpl:async(url)=>{assert.equal(url,'https://api.example.test/api/court-booking/bookings');return Response.json([{kind:'private_course'},row]);}});
  const result = await api.getStaffCourtBookings();assert.equal(result.length,1);assert.equal(result[0].user.name,'Player');
  const invalid = createAuthApi({baseUrl:'https://api.example.test',getIdToken:async()=>'staff',fetchImpl:async()=>Response.json([{...row,user:{id:'member'}}])});
  await assert.rejects(invalid.getStaffCourtBookings(),{code:'invalidResponse'});
});
test('court cancellation review preserves decision, audit reason and independent refund state', async () => {
  const api=createAuthApi({baseUrl:'https://api.example.test',getIdToken:async()=>'staff',fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.example.test/api/court-booking/bookings/booking/cancellation-requests/request/review');
    assert.equal(options?.method,'POST');assert.deepEqual(JSON.parse(String(options?.body)),{approve:true,reason:'Approved venue request'});
    return Response.json({id:'request',status:'completed',reason:'Original reason',refundStatus:'pending'});
  }});
  const result=await api.reviewCourtCancellation('booking','request',true,'Approved venue request');assert.equal(result.status,'completed');assert.equal(result.refundStatus,'pending');
});
test('court cancellation permission failure is returned without a second submission', async () => {
  let writes=0;const api=createAuthApi({baseUrl:'https://api.example.test',getIdToken:async()=>'member',fetchImpl:async()=>{writes++;return Response.json({message:'Not allowed'},{status:403});}});
  await assert.rejects(api.reviewCourtCancellation('booking','request',false,'Not authorized'),{code:'forbidden'});assert.equal(writes,1);
});
