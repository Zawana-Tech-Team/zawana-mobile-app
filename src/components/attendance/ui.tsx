import { SelectionPressable } from "../booking/selection-pressable";
import { StyleSheet, Text, View } from "react-native";
import { DetailSheet } from "../shared/quiet-ui";

import { useCallback } from "react";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
import type { AttendanceRecord, AttendanceStatus } from "@/attendance/domain";
import { categoryLabel } from "@/attendance/domain";
import { brand } from "@/design/tokens";
import { Notice, shortDate } from "../member/ui";

const statuses: Record<AttendanceStatus, { label: string; color: string; background: string }> = {
  pending: { label: "Not recorded", color: brand.info, background: "#EFF6FF" },
  present: { label: "Present", color: "#166534", background: "#F0FDF4" },
  late: { label: "Late", color: "#92400E", background: "#FFFBEB" },
  absent: { label: "Absent", color: "#991B1B", background: "#FEF2F2" },
  excused: { label: "Excused", color: brand.muted, background: "#F3F4F6" },
};
export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const token = statuses[status];
  return <View style={[a.badge, { backgroundColor: token.background }]}><Text style={{ color: token.color, fontWeight: "600", fontSize: 12 }}>{token.label}</Text></View>;
}
export function Fact({ label, value }: { label: string; value: string }) {
  return <View style={a.fact}><Text style={a.muted}>{label}</Text><Text style={a.factValue}>{value}</Text></View>;
}
export function PackageUsageCard({ item }: { item: NonNullable<AttendanceRecord["package"]> }) {
  const progress = item.total > 0 ? Math.min(1, Math.max(0, item.used / item.total)) : 0;
  return <View style={a.card}>
    <Text style={a.kicker}>{categoryLabel(item.categoryCode).toUpperCase()} PACKAGE</Text>
    <Text style={a.title}>{item.name}</Text>
    <Fact label="Sessions remaining" value={`${item.remaining} of ${item.total}`} />
    <View style={a.track} accessibilityRole="progressbar" accessibilityLabel="Package sessions used" accessibilityValue={{ min: 0, max: item.total, now: item.used }}><View style={[a.fill, { width: `${progress * 100}%` }]} /></View>
    <Fact label="Valid until" value={shortDate(item.expiryDate)} />
    <Text style={a.muted}>Balance reported by ZAWANA · {item.status}</Text>
  </View>;
}
export function AttendanceCard({ item, onPress, showMember = false }: { item: AttendanceRecord; onPress: () => void; showMember?: boolean }) {
  return <SelectionPressable testID={`attendance-row-${item.kind}-${item.id}`} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${showMember ? item.name + ', ' : ''}${item.title}, ${shortDate(item.date)}, ${statuses[item.status].label}. View attendance details.`} style={[a.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
    <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: statuses[item.status].color }} />
    <View style={{ flex: 1, gap: 5 }}><Text style={a.title}>{showMember ? item.name : item.title}</Text><Text style={a.muted}>{showMember ? item.title + ' · ' : ''}{item.time}</Text><View style={a.row}><Text style={[a.muted, { fontSize: 11 }]}>{shortDate(item.date)}</Text><Text style={{ color: statuses[item.status].color, fontSize: 11, fontWeight: '600' }}>{statuses[item.status].label}</Text></View></View><Text style={a.link}>›</Text>
  </SelectionPressable>;
}
export function AttendanceDetailSheet({ item, onClose }: { item: AttendanceRecord | null; onClose: () => void }) {
  const { api, user } = useAuth();
  const id = item?.id ?? "", kind = item?.kind ?? "course";
  const detail = useResource(useCallback((signal: AbortSignal) => api.getAttendanceDetail(kind, id, { signal }), [api, kind, id]), `${user?.id}:${kind}:${id}`, !!item);
  return <DetailSheet title="Session details" visible={!!item} onClose={onClose}>
          {item ? <>
            <Text style={a.title}>{item.title}</Text><AttendanceStatusBadge status={item.status} />
            <Fact label="Member" value={item.name} /><Fact label="Date" value={shortDate(item.date)} /><Fact label="Time" value={item.time} />
            <Fact label="Location" value={item.location} />{item.coach ? <Fact label="Coach" value={item.coach} /> : null}
            {item.categoryCode ? <Fact label="Category" value={categoryLabel(item.categoryCode)} /> : null}
            {item.source ? <Fact label="Check-in method" value={item.source === "QR" ? "Front desk QR" : item.source === "STAFF" ? "Staff check-in" : item.source} /> : null}
            {item.recordedBy ? <Fact label="Recorded by" value={item.recordedBy} /> : null}
            {item.sessionsDeducted !== null ? <Fact label="Sessions deducted" value={String(item.sessionsDeducted)} /> : null}
            {item.checkedInAt ? <Fact label="Checked in" value={new Date(item.checkedInAt).toLocaleString("en-GB", { timeZone: "Asia/Yangon" }) + " (Yangon)"} /> : null}
            {item.notes ? <Text style={a.muted}>{item.notes}</Text> : null}
            {item.package ? <PackageUsageCard item={item.package} /> : null}
            <Notice loading={detail.loading} error={detail.error} onRetry={detail.retry} />
            {detail.data ? <><Text style={a.title}>Course attendance summary</Text><Fact label="Attended / completed scheduled" value={`${detail.data.summary.attended} / ${detail.data.summary.completedScheduled}`} /><Fact label="Attendance rate" value={detail.data.summary.percentage === null ? "Not available" : `${detail.data.summary.percentage}%`} /><SessionTimeline items={detail.data.history} /></> : null}
          </> : null}
  </DetailSheet>;
}
export function SessionTimeline({ items }: { items: AttendanceRecord[] }) {
  const recent = [...items].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 12);
  return <View style={{ gap: 12 }}><Text style={a.title}>Recent session history</Text>{recent.map(r => <View key={`${r.kind}:${r.id}`} style={[a.fact, { borderLeftWidth: 2, paddingLeft: 14, borderLeftColor: brand.gold }]}><Text style={a.factValue}>{r.title}</Text><Text style={a.muted}>{shortDate(r.date)} · {r.time}</Text><AttendanceStatusBadge status={r.status} /></View>)}</View>;
}
export const a = StyleSheet.create({
  card: { padding: 18, gap: 12, borderRadius: 20, backgroundColor: brand.surface, borderWidth: 1, borderColor: brand.border },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: brand.ink, fontWeight: "700", fontSize: 18, lineHeight: 25 },
  heading: { color: brand.ink, fontWeight: "700", fontSize: 24, letterSpacing: -0.5 },
  kicker: { color: brand.accent, fontWeight: "700", fontSize: 10, letterSpacing: 1.5 },
  muted: { color: brand.muted, fontSize: 13, lineHeight: 20 },
  link: { color: brand.accent, fontWeight: "600", fontSize: 13 },
  badge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  fact: { gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: brand.border, paddingVertical: 10 },
  factValue: { color: brand.ink, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  track: { height: 6, borderRadius: 3, backgroundColor: brand.border, overflow: "hidden" },
  fill: { height: 6, backgroundColor: brand.gold },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "#17191C88" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: brand.page, width: "100%", maxWidth: 600, alignSelf: "center" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: brand.border, alignSelf: "center" },
  close: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" },
});
