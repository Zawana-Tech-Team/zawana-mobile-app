import { sessionHasEnded } from '@/coach/domain';
import { useCallback, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
import { courseStatus } from "@/booking/private-course";
import { useFormTask } from "@/hooks/use-form-task";
import type { CollectedPayment } from "@/staff/domain";
import { brand } from "@/design/tokens";
import { a, Fact } from "../attendance/ui";
import { Button, Confirm, Notice, money, shortDate } from "../member/ui";
import { StaffPage, w } from "./ui";
import { PaymentTools } from "./payment-tools";

export function StaffSessionScreen() {
  const { id: param } = useLocalSearchParams<{ id: string }>();
  const id = typeof param === "string" ? param : "";
  const { api, user } = useAuth();
  const resource = useResource(useCallback((signal: AbortSignal) => api.getStaffBooking(id, { signal }), [api, id]), `${user?.id}:${id}`, !!id);
  const [action, setAction] = useState<"accept" | "decline" | "cash" | "complete" | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<CollectedPayment | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const task = useFormTask();
  const b = resource.data;
  const payment = receipt?.bookingId === b?.id ? receipt : b?.privateCoursePayment;
  const payable = b?.paymentStatus === "pending" && ["PENDING_COACH_CONFIRMATION", "AWAITING_PAYMENT"].includes(b.status);
  return <StaffPage title="Session details" active="bookings" back>
    <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
    {message ? <View style={a.card} accessibilityLiveRegion="polite"><Text style={a.title}>{message}</Text></View> : null}
    {b ? <>
      <View style={w.hero}><Text style={[a.kicker, { color: brand.gold }]}>{courseStatus(b.status).toUpperCase()}</Text><Text style={w.heroTitle}>{b.user.name}</Text><Text style={w.heroBody}>{b.title}</Text></View>
      <View style={a.card}><Fact label="Booking reference" value={b.code} /><Fact label="Date" value={shortDate(b.date)} /><Fact label="Time" value={b.time} /><Fact label="Court" value={b.court?.name ?? b.location} /><Fact label="Coach" value={b.coach?.name ?? "Assigned coach"} /><Fact label="Price" value={money(b.price)} /><Fact label="Payment status" value={b.paymentStatus} />
        {b.paymentExpiresAt ? <Fact label="Payment deadline · Yangon" value={new Date(b.paymentExpiresAt).toLocaleString("en-GB", { timeZone: "Asia/Yangon" })} /> : null}
      </View>
      {user?.role === "coach" && b.status === "PENDING_COACH_CONFIRMATION" ? <><Button label="Accept request" onPress={() => { task.setError(null); setAction("accept"); }} /><Button secondary label="Decline request" onPress={() => { task.setError(null); setAction("decline"); }} /></> : null}
      {payable ? <View style={a.card}><Text style={a.title}>Record a cash collection</Text><Text style={a.muted}>Collect the full {money(b.price)} before recording. Partial payments and other offline methods are not available for this booking.</Text>
        <Fact label="Payment source" value={user?.role === "coach" ? "Coach" : "Badminton FO"} /><Fact label="Payment method" value="Cash" />
        <TextInput value={amount} onChangeText={setAmount} accessibilityLabel="Actual cash amount received in MMK" placeholder="Amount received · MMK" placeholderTextColor={brand.muted} keyboardType="number-pad" style={w.search} />
        <TextInput value={reference} onChangeText={setReference} accessibilityLabel="Payment reference" placeholder="Reference (optional)" placeholderTextColor={brand.muted} maxLength={200} style={w.search} />
        <TextInput value={notes} onChangeText={setNotes} accessibilityLabel="Payment notes" placeholder="Notes (optional)" placeholderTextColor={brand.muted} maxLength={2000} multiline style={w.search} />
        <Button label="Review cash collection" disabled={!/^\d+$/.test(amount) || Number(amount) !== b.price} onPress={() => { task.setError(null); setAction("cash"); }} />
      </View> : null}
      {user?.role === "coach" && b.status === "CONFIRMED" && b.paymentStatus === "paid" ? <Button secondary label="Mark session complete" disabled={!sessionHasEnded(b.date,b.time)} onPress={() => { task.setError(null); setAction("complete"); }} /> : null}
      {payment ? <View testID="staff-payment-record" style={a.card} accessibilityLiveRegion="polite"><Text style={a.kicker}>PAYMENT RECORD</Text><Text style={a.title}>{money(payment.amount)}</Text><Fact label="Receipt" value={payment.id} /><Fact label="Booking" value={payment.bookingId} /><Fact label="Source / method" value={`${payment.paymentSource} / ${payment.paymentMethod}`} /><Fact label="Collector" value={payment.collectedByUserId ?? "Online provider"} /><Fact label="Verification" value={payment.verifiedAt ? `Verified · ${new Date(payment.verifiedAt).toLocaleString("en-GB", { timeZone: "Asia/Yangon" })}` : "Awaiting verification"} /><Fact label="Status" value={payment.status} />{payment.externalReceiptReference ? <Fact label="Reference" value={payment.externalReceiptReference} /> : null}</View> : null}
      <PaymentTools booking={b} onChanged={() => { setReceipt(null); resource.retry(); }} />
    </> : null}
    <Confirm visible={!!action} title={action === "cash" ? "Confirm cash received?" : action === "accept" ? "Accept this request?" : action === "decline" ? "Decline this request?" : "Complete this session?"} body={action === "cash" ? `Record ${money(b?.price ?? 0)} collected by ${user?.name}. Confirm only after receiving the full amount.` : "ZAWANA will validate the session and update its status."} label="Confirm" busy={task.loading} error={task.error} onClose={() => setAction(null)} onConfirm={() => void task.run(async () => {
      if (!b || !action) return;
      if (action === "cash") {
        if (Number(amount) !== b.price) throw new Error("Enter the full booking amount received.");
        setReceipt(await api.recordCourseCash(b.id, reference.trim(), notes.trim()));
        setMessage("Cash collection recorded.");
      } else if (action === "complete") { await api.completeCourse(b.id); setMessage("Session completed."); }
      else { await api.decideCourse(b.id, action); setMessage(action === "accept" ? "Request accepted. Payment is still required." : "Request declined."); }
      setAction(null); resource.retry();
    })} />
  </StaffPage>;
}
