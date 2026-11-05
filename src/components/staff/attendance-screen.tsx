import { CalendarAttendance } from "../attendance/calendar-screen";
import { Segments, Metrics } from "../shared/controls";
import { AttendanceLegend } from "../shared/attendance-legend";
import { useCallback, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
import { yangonDate } from "@/booking/private-course";
import { shiftMonth, type AttendanceRecord, type AttendanceStatus } from "@/attendance/domain";
import { useFormTask } from "@/hooks/use-form-task";
import { attendanceMarkers } from '@/attendance/calendar';
import { MonthCalendar } from '../shared/month-calendar';
import { brand } from "@/design/tokens";
import { a, AttendanceCard, AttendanceDetailSheet } from "../attendance/ui";
import { Button, Confirm, Notice } from "../member/ui";
import { Empty, PageMore, StaffPage, w } from "./ui";

export function StaffAttendanceScreen() {
 const { user } = useAuth();
 return user?.role === "coach" ? <CalendarAttendance coach /> : <OperationsAttendanceScreen />;
}
function OperationsAttendanceScreen() {
  const { api, user } = useAuth();
  const [month, setMonth] = useState(yangonDate().slice(0, 7));
  const [status, setStatus] = useState("all");
  const [className, setClassName] = useState("all");
  const [filters, setFilters] = useState(false);
  const [markNotes, setMarkNotes] = useState("");
  const [query, setQuery] = useState("");
  const [calendarView, setCalendarView] = useState(true);
  const [selectedDay, setSelectedDay] = useState(yangonDate);
  const [limit, setLimit] = useState(30);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [mark, setMark] = useState<{ item: AttendanceRecord; status: Exclude<AttendanceStatus, "pending"> } | null>(null);
  const [correction, setCorrection] = useState<AttendanceRecord | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<Exclude<AttendanceStatus, "pending">>("present");
  const [reason, setReason] = useState("");
  const task = useFormTask();
  const resource = useResource(useCallback((signal: AbortSignal) => api.getAttendance(month, { signal }), [api, month]), `${user?.id}:${month}`, !!user);
  const filtered = (resource.data ?? []).filter(r => (status === "all" || r.status === status) && (className === "all" || r.title === className) && `${r.name} ${r.title} ${r.categoryCode ?? ""} ${r.status} ${r.coach ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeDay = selectedDay.startsWith(month) ? selectedDay : `${month}-01`;
  const rows = calendarView ? filtered.filter(r => r.date === activeDay) : filtered;
  return <StaffPage title="Attendance, together." subtitle={user?.role === "coach" ? "Your assigned classes and students." : "Private-course sessions and package visits."} active="attendance">
    <Metrics items={[{label:"Sessions",value:resource.data?String(resource.data.length):"—"},{label:"Attended",value:resource.data?String(resource.data.filter(r=>["present","late"].includes(r.status)).length):"—"},{label:"Not recorded",value:resource.data?String(resource.data.filter(r=>r.status==="pending").length):"—"}]} />
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Button label="Calendar" secondary={!calendarView} onPress={() => setCalendarView(true)} /><Button label="History" secondary={calendarView} onPress={() => setCalendarView(false)} /><Button secondary label="Today" onPress={() => { setCalendarView(true); setMonth(yangonDate().slice(0, 7)); setSelectedDay(yangonDate()); }} /></View>
    {calendarView ? <MonthCalendar month={month} selected={[activeDay]} markers={attendanceMarkers(filtered)} label="Staff attendance" onPrevious={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} onSelect={setSelectedDay} /> : <View style={a.row}><Button secondary label="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} /><Text style={a.link}>{month}</Text><Button secondary label="Next month" onPress={() => setMonth(shiftMonth(month, 1))} /></View>}
    {calendarView ? <Text style={a.title}>{activeDay} · {rows.length} session{rows.length === 1 ? "" : "s"}</Text> : null}
    <Button secondary label={filters?"Hide filters":"Search & filters"} onPress={()=>setFilters(v=>!v)} />
    {filters?<><TextInput accessibilityLabel="Search attendance" placeholder="Member, class, coach or category" placeholderTextColor={brand.muted} value={query} onChangeText={v => { setQuery(v); setLimit(30); }} style={w.search} /><Segments label="Attendance status" value={status} onChange={setStatus} options={["all","pending","present","late","absent","excused"].map(v=>({value:v,label:v==="all"?"All statuses":v==="pending"?"Not recorded":v.charAt(0).toUpperCase()+v.slice(1)}))}/><Segments label="Attendance classes" value={className} onChange={setClassName} options={[{value:"all",label:"All classes"},...[...new Set((resource.data??[]).map(r=>r.title))].map(t=>({value:t,label:t}))]}/></>:null}
    {calendarView?<AttendanceLegend/>:null}
    <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
    {rows.slice(0, limit).map(item => <View key={`${item.kind}:${item.id}`} testID={`staff-attendance-${item.kind}-${item.id}`} style={{ gap: 10 }}>
      <Text style={a.link}>{item.name}</Text><AttendanceCard item={item} onPress={() => setSelected(item)} />
      {item.kind === "course" && item.status === "pending" && ((item.date === yangonDate() && (item.canCheckIn ?? true)) || (user?.role === "admin" && item.date < yangonDate())) ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["present", "late", "absent", "excused"] as const).map(status => <Button key={status} secondary label={status.charAt(0).toUpperCase() + status.slice(1)} onPress={() => { task.setError(null); setMarkNotes(""); setMark({ item, status }); }} />)}</View> : null}
      {user?.role === "admin" && item.status !== "pending" ? <Button secondary label="Correct attendance record" onPress={() => { setCorrection(item); setCorrectionStatus(item.status as Exclude<AttendanceStatus, "pending">); setReason(""); task.setError(null); }} /> : null}
    </View>)}
    <PageMore shown={limit} total={rows.length} onMore={() => setLimit(v => v + 30)} />
    {resource.data && !rows.length ? <Empty title="No attendance in this view." /> : null}
    {correction ? <View style={a.card}><Text style={a.title}>Correct {correction.name}’s attendance</Text><Text style={a.muted}>{correction.title} · {correction.date}. Package adjustments are verified by ZAWANA.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["present", "late", "absent", "excused"] as const).map(status => <Button key={status} label={status} secondary={correctionStatus !== status} onPress={() => setCorrectionStatus(status)} disabled={task.loading} />)}</View>
      <TextInput value={reason} onChangeText={setReason} accessibilityLabel="Required reason for attendance correction" placeholder="Reason for correction (required)" placeholderTextColor={brand.muted} maxLength={1000} multiline style={w.search} editable={!task.loading} />
      <Notice error={task.error} />
      <Button label="Save audited correction" disabled={reason.trim().length < 3} busy={task.loading} onPress={() => void task.run(async () => { if (correction.kind === "package") await api.correctPackageAttendance(correction.id, correctionStatus, reason.trim()); else await api.markCourseAttendance(correction.id, correctionStatus, correction.notes ?? "", reason.trim()); setCorrection(null); resource.retry(); })} />
      <Button secondary label="Cancel correction" disabled={task.loading} onPress={() => setCorrection(null)} />
    </View> : null}
    <AttendanceDetailSheet item={selected} onClose={() => setSelected(null)} />
    <Confirm visible={!!mark} title="Record attendance?" body={`${mark?.item.name ?? ""} · ${mark?.item.title ?? ""} · ${mark?.status ?? ""}. ZAWANA verifies eligibility before saving.`} label="Confirm attendance" busy={task.loading} error={task.error} onClose={() => setMark(null)} onConfirm={() => void task.run(async () => { if (!mark) return; await api.markCourseAttendance(mark.item.id, mark.status, markNotes.trim()); setMark(null); resource.retry(); })}><TextInput accessibilityLabel="Attendance notes" placeholder="Attendance notes (optional)" value={markNotes} onChangeText={setMarkNotes} maxLength={2000} style={w.search} editable={!task.loading}/></Confirm>
  </StaffPage>;
}
