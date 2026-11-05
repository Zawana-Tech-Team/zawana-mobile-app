import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
import { useFormTask } from "@/hooks/use-form-task";
import { categoryLabel } from "@/attendance/domain";
import { brand } from "@/design/tokens";
import type { issuedQr } from "@/staff/domain";
import { a } from "../attendance/ui";
import { Button, Notice, money } from "../member/ui";
import { Empty, StaffPage } from "./ui";
import { useStaffBookings } from "./workspace-screens";

export function StaffManagementScreen() {
  const { user } = useAuth();
  return user?.role === "coach" ? <Students /> : <Operations />;
}
function Students() {
  const resource = useStaffBookings();
  const students = [...new Map((resource.data ?? []).map(b => [b.user.id, b.user])).values()];
  return <StaffPage title="The people you coach." subtitle="Students in your latest assigned private-course bookings." active="management">
    <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
    {students.map(s => <View key={s.id} style={a.card}><Text style={a.title}>{s.name}</Text><Text style={a.muted}>{s.email}</Text><Text style={a.muted}>{s.phone}</Text><Button secondary label="View session records" onPress={() => router.push("/(staff)/bookings")} /></View>)}
    {resource.data && !students.length ? <Empty title="Your students will appear here." /> : null}
  </StaffPage>;
}
function Operations() {
  const { api, user } = useAuth();
  const task = useFormTask();
  const [category, setCategory] = useState<"FOUNDATION" | "SOCIAL" | "PATHWAY">("SOCIAL");
  const [qr, setQr] = useState<ReturnType<typeof issuedQr> | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const catalog = useResource(useCallback((signal: AbortSignal) => api.getStaffCatalog({ signal }), [api]), user?.id ?? "", !!user);
  const live = qr && Date.parse(qr.expiresAt) > now;
  return <StaffPage title={user?.role === "admin" ? "Run the arena." : "Welcome every player."} subtitle="Bookings, packages and category-specific check-in." active="management">
    <Button secondary label="Court reservations" onPress={() => router.push("/(staff)/courts")} />
    <Button label="Create private course booking" onPress={() => router.push("/(staff)/create-course")} />
    <Button secondary label="Attendance & package history" onPress={() => router.push("/(staff)/attendance")} />
    {user?.role === "admin" ? <><Button secondary label="Payment records" onPress={() => router.push("/(staff)/payments")} /><Button secondary label="Manage private course catalog" onPress={() => router.push("/(staff)/manage-course")} /></> : null}
    <View style={a.card}>
      <Text style={a.title}>Front desk check-in QR</Text>
      <Text style={a.muted}>Choose the class category. Members review their eligible package and confirm on their own device.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["FOUNDATION", "SOCIAL", "PATHWAY"] as const).map(c => <Button key={c} label={categoryLabel(c)} secondary={category !== c} disabled={task.loading} onPress={() => setCategory(c)} />)}</View>
      <Notice error={task.error} />
      <Button label={`Generate ${categoryLabel(category)} QR`} busy={task.loading} onPress={() => void task.run(async () => { setQr(null); setQr(await api.issueEntryQr(category)); })} />
      <Text style={a.muted}>Generating a code revokes your previous front desk code.</Text>
      {qr ? <>{live ? <View style={{ alignSelf: "center", padding: 16, backgroundColor: "#FFFFFF" }} accessibilityLabel={`${categoryLabel(qr.categoryCode)} front desk check-in QR code`}><QRCode value={`https://thezawana.com/check-in#${qr.token}`} size={180} quietZone={8} color={brand.ink} backgroundColor="#FFFFFF" /></View> : <Text style={a.title}>This code has expired.</Text>}
        <Text style={a.kicker}>{categoryLabel(qr.categoryCode).toUpperCase()}</Text><Text style={a.muted}>Expires {new Date(qr.expiresAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Yangon" })} · Yangon</Text>
        <Button secondary label="Revoke this code" disabled={task.loading} onPress={() => void task.run(async () => { await api.revokeEntryQr(qr.id); setQr(null); })} /></> : null}
    </View>
    <Text style={a.title}>Active private courses</Text>
    <Notice loading={catalog.loading} error={catalog.error} onRetry={catalog.retry} />
    {catalog.data?.courses.map(c => <View key={c.id} style={a.card}><Text style={a.title}>{c.title}</Text><Text style={a.muted}>{c.description}</Text><Text style={a.link}>{c.duration} min · {money(c.price)}</Text><Text style={a.muted}>{c.coaches.map(x => x.name).join(", ")}</Text></View>)}
  </StaffPage>;
}
