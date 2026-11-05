import { CoachingScreen } from "./coaching-screen";
import { Segments } from "../shared/controls";
import { CoachHomeScreen } from './coach-home-screen';
import { useCallback, useState } from "react";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
import { yangonDate } from "@/booking/private-course";
import { brand } from "@/design/tokens";
import { useFormTask } from "@/hooks/use-form-task";
import { a, Fact } from "../attendance/ui";
import { Button, Confirm, Notice, money } from "../member/ui";
import { Empty, PageMore, SessionCard, StaffPage, w } from "./ui";

export function useStaffBookings() {
  const { api, user } = useAuth();
  return useResource(useCallback((signal: AbortSignal) => api.getStaffBookings({ signal }), [api]), user?.id ?? "", !!user);
}
export function StaffOverview() { const {user}=useAuth(); return user?.role==="coach" ? <CoachHomeScreen/> : <StaffOverviewBody/>; }
function StaffOverviewBody() {
  const { user } = useAuth();
  const resource = useStaffBookings();
  const rows = resource.data ?? [];
  const today = yangonDate();
  const sessions = rows.filter(b => b.date === today && !["CANCELLED", "COACH_DECLINED", "EXPIRED"].includes(b.status.toUpperCase()));
  const pending = rows.filter(b => b.status === "PENDING_COACH_CONFIRMATION");
  return <StaffPage title={user?.role === "coach" ? "Your court. Your impact." : "The arena, at a glance."} subtitle={`Welcome, ${user?.name ?? ""}.`} active="overview">
    <View style={w.hero}>
      <Text style={[a.kicker, { color: brand.gold }]}>TODAY AT ZAWANA</Text>
      <Text style={w.heroTitle}>{resource.data ? sessions.length : "—"} {sessions.length === 1 ? "session" : "sessions"}</Text>
      <Text style={w.heroBody}>Keep every session moving. Requests, attendance and payment records in one workspace.</Text>
    </View>
    <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
    {resource.data ? <View style={a.card}><Fact label="Pending coach decisions" value={String(pending.length)} /><Fact label="Awaiting payment" value={String(rows.filter(b => b.paymentStatus === "pending" && b.status === "AWAITING_PAYMENT").length)} /><Fact label="Completed sessions" value={String(rows.filter(b => b.status.toUpperCase() === "COMPLETED").length)} /><Text style={a.muted}>Summary of the latest {rows.length} private-course records, up to 300.</Text></View> : null}
    <Button label={user?.role === "coach" ? "Review booking requests" : "Create private course booking"} onPress={() => router.push(user?.role === "coach" ? "/(staff)/bookings" : "/(staff)/create-course")} />
    <Button secondary label="Attendance workspace" onPress={() => router.push("/(staff)/attendance")} />
    <Text style={a.title}>Today’s sessions</Text>
    {sessions.slice(0, 10).map(b => <SessionCard key={b.id} item={b} />)}
    {resource.data && !sessions.length ? <Empty title="No sessions in today’s view." body="Open Bookings for the latest scheduled sessions." /> : null}
  </StaffPage>;
}
export function StaffBookingsScreen() {
 const { user } = useAuth();
 return user?.role === "coach" ? <CoachingScreen /> : <OperationsBookingsScreen />;
}
function OperationsBookingsScreen() {
  const { user } = useAuth();
  const resource = useStaffBookings();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(30);
  const rows = (resource.data ?? []).filter(b => (filter === "all" || b.status.toUpperCase() === filter) && `${b.user.name} ${b.title} ${b.code} ${b.date} ${b.coach?.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <StaffPage title={user?.role === "coach" ? "Requests & sessions" : "Private course bookings"} active="bookings" back={user?.role==="coach"} subtitle="Search members, dates and booking references.">
    <TextInput accessibilityLabel="Search bookings" placeholder="Member, course, date or reference" placeholderTextColor={brand.muted} value={query} onChangeText={v => { setQuery(v); setLimit(30); }} style={w.search} autoCorrect={false} />
    <Segments label="Coach booking status" value={filter} onChange={v=>{setFilter(v);setLimit(30)}} options={[["all","All"],["PENDING_COACH_CONFIRMATION","Requests"],["AWAITING_PAYMENT","Payment due"],["CONFIRMED","Confirmed"],["COMPLETED","Completed"],["CANCELLED","Cancelled"]].map(([value,label])=>({value,label}))}/>

    <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
    {user?.role !== "coach" ? <Button secondary label="Court rentals" onPress={() => router.push("/(staff)/courts")} /> : null}
    {user?.role !== "coach" ? <Button label="Create private course booking" onPress={() => router.push("/(staff)/create-course")} /> : null}
    {rows.slice(0, limit).map(b => <SessionCard key={b.id} item={b} />)}
    <PageMore total={rows.length} shown={limit} onMore={() => setLimit(v => v + 30)} />
    {resource.data && !rows.length ? <Empty title="No matching bookings." /> : null}
    <Text style={a.muted}>Latest 300 private-course bookings. Open Court rentals to manage court reservations.</Text>
  </StaffPage>;
}
export function StaffPaymentsScreen() {
  const resource = useStaffBookings();
  const rows = resource.data ?? [];
  const paid = rows.flatMap(b => b.privateCoursePayment?.verifiedAt && b.privateCoursePayment.status === "PAID" ? [b.privateCoursePayment] : []);
  const sum = (source?: string) => paid.filter(p => !source || p.paymentSource === source).reduce((s, p) => s + p.amount, 0);
  return <StaffPage title="Collections, accounted for." subtitle="Verified private-course payments in the latest 300 booking records." active="payments">
    <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
    {resource.data ? <View style={a.card}><Text style={a.kicker}>VERIFIED COLLECTIONS</Text><Text style={a.heading}>{money(sum())}</Text><Fact label="Front desk" value={money(sum("BADMINTON_FO"))} /><Fact label="Coach collections" value={money(sum("COACH"))} /><Fact label="Online" value={money(sum("ONLINE"))} /><Fact label="Recorded refunds" value={money(rows.reduce((s, b) => s + (b.privateCoursePayment?.status === "REFUNDED" ? b.privateCoursePayment.amount : 0), 0))} /><Fact label="Awaiting payment" value={money(rows.filter(b => b.paymentStatus === "pending" && b.status === "AWAITING_PAYMENT").reduce((s, b) => s + b.price, 0))} /><Text style={a.muted}>Collections are not coach earnings. Unverified and legacy payments are excluded.</Text></View> : null}
    <Button secondary label="Cash handovers & finance" onPress={()=>router.push("/(staff)/finance")} />
    <Text style={a.title}>Payment records & receipts</Text>
    {rows.filter(b => b.privateCoursePayment || b.status === "AWAITING_PAYMENT").slice(0, 30).map(b => <SessionCard key={b.id} item={b} />)}
    {resource.data && !rows.some(b => b.privateCoursePayment || b.status === "AWAITING_PAYMENT") ? <Empty title="No payment records in this view." /> : null}
  </StaffPage>;
}
export function StaffProfileScreen() {
  const { user, signOut } = useAuth();
  const task = useFormTask();
  const [confirm, setConfirm] = useState(false);
  return <StaffPage title="Your workspace" active="profile" back={user?.role==="coach"}>
    <View style={a.card}><Text style={a.title}>{user?.name}</Text><Text style={a.muted}>{user?.email}</Text><Text style={a.kicker}>{user?.role.replaceAll("_", " ").toUpperCase()}</Text></View>
    <Button label="Attendance history" onPress={() => router.push("/(staff)/attendance")} />
    <Button secondary label="Payment records" onPress={() => router.push(user?.role === "coach" ? { pathname: "/(staff)/finance", params: { view: "payments" } } : "/(staff)/payments")} />
    {user?.role !== "coach" ? <Button secondary label="Create private course booking" onPress={() => router.push("/(staff)/create-course")} /> : null}
    <Button secondary label="Sign out" onPress={() => setConfirm(true)} />
    <Confirm visible={confirm} title="Sign out?" body="Your saved session on this device will be removed." label="Sign out" busy={task.loading} error={task.error} onClose={() => setConfirm(false)} onConfirm={() => void task.run(signOut)} />
  </StaffPage>;
}
