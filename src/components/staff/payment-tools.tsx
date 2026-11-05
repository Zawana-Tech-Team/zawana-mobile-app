import { useCallback, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
import { useFormTask } from "@/hooks/use-form-task";
import type { StaffBooking } from "@/staff/domain";
import { brand } from "@/design/tokens";
import { a } from "../attendance/ui";
import { Button, Confirm, Notice, money } from "../member/ui";
import { w } from "./ui";

export function PaymentTools({ booking, onChanged }: { booking: StaffBooking; onChanged: () => void }) {
  const { api, user } = useAuth();
  const [showOnline, setShowOnline] = useState(false);
  const [form, setForm] = useState<"cancel" | "refund" | null>(null);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reference, setReference] = useState("");
  const [action, setAction] = useState<{ kind: "reconcile"; attemptId: string } | { kind: "cancel" | "refund" } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const task = useFormTask();
  const attempts = useResource(useCallback((signal: AbortSignal) => api.getCoursePaymentAttempts(booking.id, { signal }), [api, booking.id]), `${user?.id}:${booking.id}`, showOnline && user?.role !== "coach");
  const unpaid = booking.paymentStatus === "pending" && ["PENDING_COACH_CONFIRMATION", "AWAITING_PAYMENT"].includes(booking.status);
  return <>
    {notice ? <Text style={a.link} accessibilityLiveRegion="polite">{notice}</Text> : null}
    {user?.role !== "coach" ? <View style={a.card}><Text style={a.title}>Online payment reconciliation</Text><Text style={a.muted}>Link an existing verified provider receipt. This does not charge the member or record another sale.</Text><Button secondary label="Review online payment attempts" onPress={() => setShowOnline(true)} />
      <Notice loading={attempts.loading} error={attempts.error} onRetry={attempts.retry} />
      {attempts.data?.map(p => <View key={p.id} style={{ gap: 8 }}><Text style={a.link}>{p.provider} · {money(p.amount)} · {p.status}</Text><Text style={a.muted}>{p.reference}</Text>{p.status === "SUCCEEDED" && booking.paymentStatus === "paid" && !booking.privateCoursePayment ? <Button secondary label="Link verified receipt" onPress={() => { task.setError(null); setAction({ kind: "reconcile", attemptId: p.id }); }} /> : null}</View>)}
      {attempts.data && !attempts.data.length ? <Text style={a.muted}>No online payment attempts recorded.</Text> : null}
    </View> : null}
    {unpaid ? <Button secondary label="Cancel unpaid booking" onPress={() => { setForm("cancel"); setReason(""); }} /> : null}
    {user?.role === "admin" && booking.paymentStatus === "paid" && booking.privateCoursePayment?.status === "PAID" ? <Button secondary label="Record audited refund" onPress={() => { setForm("refund"); setReason(""); setReference(""); setEvidence(""); }} /> : null}
    {form ? <View style={a.card}><Text style={a.title}>{form === "refund" ? "Refund evidence" : "Cancellation reason"}</Text><Text style={a.muted}>{form === "refund" ? "Record an actual completed refund with its reference and evidence. ZAWANA checks the original transaction and cash custody before saving." : "A reason is retained in the booking history. Paid bookings use the separate refund workflow."}</Text>
      <TextInput value={reason} onChangeText={setReason} accessibilityLabel="Reason (minimum 10 characters)" placeholder="Reason (minimum 10 characters)" placeholderTextColor={brand.muted} maxLength={2000} multiline style={w.search} editable={!task.loading} />
      {form === "refund" ? <><TextInput value={evidence} onChangeText={setEvidence} accessibilityLabel="Refund evidence" placeholder="Evidence (minimum 10 characters)" placeholderTextColor={brand.muted} maxLength={2000} multiline style={w.search} editable={!task.loading} /><TextInput value={reference} onChangeText={setReference} accessibilityLabel="Refund reference" placeholder="Refund reference" placeholderTextColor={brand.muted} maxLength={200} style={w.search} editable={!task.loading} /></> : null}
      <Button label="Review record" disabled={reason.trim().length < 10 || (form === "refund" && (reference.trim().length < 3 || evidence.trim().length < 10))} onPress={() => { task.setError(null); setAction({ kind: form }); }} /><Button secondary label="Close form" disabled={task.loading} onPress={() => setForm(null)} />
    </View> : null}
    {booking.changes?.length ? <View style={a.card}><Text style={a.title}>Booking history</Text>{booking.changes.map(c => <View key={c.id} style={a.fact}><Text style={a.link}>{c.action.replaceAll("_", " ")}</Text><Text style={a.muted}>{new Date(c.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Yangon" })}</Text>{c.reason ? <Text style={a.muted}>{c.reason}</Text> : null}</View>)}</View> : null}
    <Confirm visible={!!action} title={action?.kind === "refund" ? "Record this refund?" : action?.kind === "cancel" ? "Cancel this unpaid booking?" : "Link verified online payment?"} body={action?.kind === "refund" ? `${money(booking.privateCoursePayment?.amount ?? 0)} · ${reference}. Confirm only after the refund has been completed.` : "ZAWANA validates the original record and preserves its audit history."} label="Confirm record" busy={task.loading} error={task.error} onClose={() => setAction(null)} onConfirm={() => void task.run(async () => {
      if (!action) return;
      if (action.kind === "reconcile") { await api.reconcileCoursePayment(booking.id, action.attemptId); setNotice("Verified receipt linked."); }
      else if (action.kind === "cancel") { await api.cancelStaffCourse(booking.id, reason.trim()); setNotice("Booking cancelled."); }
      else { await api.refundCoursePayment(booking.id, { reason: reason.trim(), evidence: evidence.trim(), reference: reference.trim() }); setNotice("Refund recorded with audit evidence."); }
      setAction(null); setForm(null); onChanged(); attempts.retry();
    })} />
  </>;
}
