import type { ReactNode } from "react";
import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-provider";
import { brand } from "@/design/tokens";
import { AuthIcon, type AuthIconName } from "../auth/ui/auth-icon";
import { BrandLogo } from "../auth/ui/brand-logo";
import { a } from "../attendance/ui";
import { Button, shortDate } from "../member/ui";
import type { StaffBooking } from "@/staff/domain";
import { SelectionPressable } from "../booking/selection-pressable";
import { courseStatus } from "@/booking/private-course";

type Destination = { label: string; href: Href; icon: AuthIconName; key: string };
export function StaffPage({ title, subtitle, active, children, back = false, footer }: { title: string; subtitle?: string; active: string; children: ReactNode; back?: boolean; footer?: ReactNode }) {
  const { user } = useAuth();
  const inset = useSafeAreaInsets();
  const coachActive = ['management','profile','notifications','more'].includes(active) ? 'more' : active;
  const selected = user?.role === 'coach' ? coachActive : active;
  const tabs: Destination[] = user?.role === "coach" ? [
    {label:'Calendar',key:'calendar',icon:'calendar',href:'/(staff)/calendar'},
    {label:'Attendance',key:'attendance',icon:'check',href:'/(staff)/attendance'},
    {label:'Coaching',key:'bookings',icon:'badminton',href:'/(staff)/bookings'},
    {label:'Finance',key:'payments',icon:'retail',href:'/(staff)/finance'},
    {label:'More',key:'more',icon:'person',href:'/(staff)/more'},
  ] : user?.role === "badminton_fo" ? [
    { label: "Overview", key: "overview", icon: "home", href: "/(staff)/overview" },
    { label: "Bookings", key: "bookings", icon: "calendar", href: "/(staff)/bookings" },
    { label: "Check-In", key: "management", icon: "check", href: "/(staff)/management" },
    { label: "Payments", key: "payments", icon: "retail", href: "/(staff)/payments" },
    { label: "More", key: "profile", icon: "person", href: "/(staff)/profile" },
  ] : [
    { label: "Overview", key: "overview", icon: "home", href: "/(staff)/overview" },
    { label: "Bookings", key: "bookings", icon: "calendar", href: "/(staff)/bookings" },
    { label: "Attendance", key: "attendance", icon: "check", href: "/(staff)/attendance" },
    { label: "Management", key: "management", icon: "badminton", href: "/(staff)/management" },
    { label: "Profile", key: "profile", icon: "person", href: "/(staff)/profile" },
  ];
  return <View style={[w.root, { paddingTop: inset.top }]}>
    <View style={w.container}>
      <View style={w.header}>
        {back ? <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(staff)/overview")} accessibilityRole="button" accessibilityLabel="Go back" style={w.touch}><AuthIcon name="back" color={brand.ink} /></Pressable> : <BrandLogo size={48} />}
        <Text style={a.kicker}>{user?.role === "coach" ? "COACH WORKSPACE" : user?.role === "admin" ? "ARENA OPERATIONS" : "BADMINTON FRONT DESK"}</Text>
        <View style={w.touch} />
      </View>
      <ScrollView contentContainerStyle={w.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={w.heading}>{title}</Text>
        {subtitle ? <Text style={a.muted}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
      {footer?<View style={{padding:16,borderTopWidth:1,borderColor:brand.border,gap:8}}>{footer}</View>:null}
      <View style={[w.tabs, { paddingBottom: Math.max(10, inset.bottom) }]}>
        {tabs.map(t => <Pressable key={t.key} onPress={() => router.replace(t.href)} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: selected === t.key }} aria-selected={selected === t.key} style={w.tab}>
          <AuthIcon name={t.icon} color={selected === t.key ? brand.accent : brand.muted} size={21} />
          <Text style={[w.tabLabel, selected === t.key && { color: brand.ink, fontWeight: "700" }]}>{t.label}</Text>
          {selected === t.key ? <View style={w.dot} /> : null}
        </Pressable>)}
      </View>
    </View>
  </View>;
}
export function SessionCard({ item }: { item: StaffBooking }) {
  const start = item.time.split(/\s*[—–]\s*|\s+-\s+/)[0], period = start.match(/(?:AM|PM)$/i)?.[0] ?? '';
  return <SelectionPressable testID={`staff-session-${item.id}`} onPress={() => router.push({ pathname: "/(staff)/sessions/[id]", params: { id: item.id } })} accessibilityRole="button" accessibilityLabel={`${item.user.name}, ${item.title}, ${item.date}, ${courseStatus(item.status)}`} style={[a.card, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
    <View style={{ borderLeftWidth: 2, borderColor: brand.gold, paddingLeft: 12, width: 70, gap: 4 }}><Text style={{ color: brand.navy, fontWeight: '700', fontSize: 16 }}>{start.replace(/\s*(?:AM|PM)$/i, '')}</Text><Text numberOfLines={1} style={{ color: brand.muted, fontSize: 9 }}>{period ? period + ' · ' : ''}{shortDate(item.date).replace(/\s+\d{4}$/, '')}</Text></View>
    <View style={{ flex: 1, gap: 4 }}><Text style={a.title}>{item.user.name}</Text><Text numberOfLines={1} style={a.muted}>{item.title} · {item.court?.name ?? item.location}</Text><Text style={[a.link, { fontSize: 11 }]}>{courseStatus(item.status)}</Text></View><Text style={a.muted}>›</Text>
  </SelectionPressable>;
}
export function Empty({ title = "Nothing here yet.", body = "Refresh or choose another view." }: { title?: string; body?: string }) {
  return <View style={a.card}><Text style={a.title}>{title}</Text><Text style={a.muted}>{body}</Text></View>;
}
export function PageMore({ total, shown, onMore }: { total: number; shown: number; onMore: () => void }) {
  return total > shown ? <Button secondary label={`Show more · ${Math.min(shown, total)} of ${total}`} onPress={onMore} /> : null;
}
export const w = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.page },
  container: { flex: 1, width: "100%", maxWidth: 600, alignSelf: "center" },
  header: { paddingHorizontal: 20, minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  touch: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 24, gap: 16, paddingBottom: 32 },
  heading: { color: brand.ink, fontSize: 32, fontWeight: "700", letterSpacing: -1, lineHeight: 38 },
  tabs: { flexDirection: "row", paddingTop: 12, backgroundColor: brand.surface, borderTopWidth: 1, borderColor: brand.border },
  tab: { flex: 1, minHeight: 54, alignItems: "center", gap: 5 },
  tabLabel: { color: brand.muted, fontSize: 10, textAlign: "center" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: brand.gold },
  search: { color: brand.ink, backgroundColor: brand.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: brand.border, minHeight: 50 },
  hero: { backgroundColor: brand.ink, borderRadius: 24, padding: 24, gap: 16 },
  heroTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "700" },
  heroBody: { color: "#D1D5DB", lineHeight: 22, fontSize: 14 },
});
