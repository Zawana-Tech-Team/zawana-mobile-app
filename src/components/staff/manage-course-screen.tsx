import { useCallback, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
import { useFormTask } from "@/hooks/use-form-task";
import type { PrivateCourse } from "@/booking/private-course";
import type { ManagedCourseInput } from "@/staff/domain";
import { brand } from "@/design/tokens";
import { a } from "../attendance/ui";
import { Button, Confirm, Notice, money } from "../member/ui";
import { Empty, StaffPage, w } from "./ui";

export function ManageCourseScreen() {
  const { api, user } = useAuth();
  const [editing, setEditing] = useState<PrivateCourse | "new" | null>(null);
  const resource = useResource(useCallback(async (signal: AbortSignal) => {
    const [courses, coaches] = await Promise.all([api.getPrivateCourses({ signal }), api.getCoachProfiles({ signal })]);
    return { courses, coaches: coaches.filter(c => c.status === "active" && c.department === "Badminton" && c.user?.active) };
  }, [api]), user?.id ?? "", user?.role === "admin");
  return <StaffPage title="Private course catalog" active="management" back>
    {user?.role !== "admin" ? <Empty title="Administrator access required." /> : <>
      <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
      {editing && resource.data ? <CourseEditor key={editing === "new" ? "new" : editing.id} course={editing === "new" ? null : editing} coaches={resource.data.coaches} onSaved={() => { setEditing(null); resource.retry(); }} onClose={() => setEditing(null)} /> : <>
        <Button label="Add private course" disabled={!resource.data} onPress={() => setEditing("new")} />
        {resource.data?.courses.map(c => <View key={c.id} style={a.card}><Text style={a.kicker}>{c.status.toUpperCase()}</Text><Text style={a.title}>{c.title}</Text><Text style={a.muted}>{c.duration} min · {money(c.price)}</Text><Text style={a.muted}>{c.coaches.map(x => x.name).join(", ")}</Text><Button secondary label="Edit course & coach assignments" onPress={() => setEditing(c)} /></View>)}
      </>}
    </>}
  </StaffPage>;
}
function CourseEditor({ course, coaches, onSaved, onClose }: { course: PrivateCourse | null; coaches: { id: string; name: string }[]; onSaved: () => void; onClose: () => void }) {
  const { api } = useAuth();
  const task = useFormTask();
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [duration, setDuration] = useState(String(course?.duration ?? 60));
  const [price, setPrice] = useState(String(course?.price ?? 0));
  const [status, setStatus] = useState<"active" | "inactive">(course?.status === "inactive" ? "inactive" : "active");
  const [coachIds, setCoachIds] = useState(course?.coaches.map(c => c.id) ?? []);
  const [confirm, setConfirm] = useState(false);
  const valid = title.trim().length >= 3 && /^\d+$/.test(duration) && Number(duration) >= 30 && Number(duration) <= 180 && /^\d+$/.test(price) && Number.isSafeInteger(Number(price)) && coachIds.length > 0;
  return <>
    <Text style={a.title}>{course ? "Edit course" : "New course"}</Text>
    {[{ label: "Course name", value: title, set: setTitle }, { label: "Description", value: description, set: setDescription }, { label: "Duration in minutes (30–180)", value: duration, set: setDuration }, { label: "Price in MMK", value: price, set: setPrice }].map((field, i) => <View key={field.label} style={{ gap: 8 }}><Text style={a.muted}>{field.label}</Text><TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.set} editable={!task.loading} multiline={i === 1} keyboardType={i > 1 ? "number-pad" : "default"} style={w.search} placeholderTextColor={brand.muted} /></View>)}
    <Text style={a.title}>Coach assignments</Text>
    {coaches.map(c => <Button key={c.id} label={c.name} secondary={!coachIds.includes(c.id)} disabled={task.loading} onPress={() => setCoachIds(ids => ids.includes(c.id) ? ids.filter(id => id !== c.id) : [...ids, c.id])} />)}
    <View style={a.row}><Button label="Active" secondary={status !== "active"} disabled={task.loading} onPress={() => setStatus("active")} /><Button label="Inactive" secondary={status !== "inactive"} disabled={task.loading} onPress={() => setStatus("inactive")} /></View>
    <Text style={a.muted}>Assign at least one active badminton coach. Pricing and duration changes are checked again on future booking requests.</Text>
    <Button label="Review & save course" disabled={!valid || task.loading} onPress={() => { task.setError(null); setConfirm(true); }} />
    <Button secondary label="Cancel editing" disabled={task.loading} onPress={onClose} />
    <Confirm visible={confirm} title="Save this course?" body={`${title.trim()} · ${duration} minutes · ${money(Number(price))} · ${status}. Existing financial history is preserved.`} label="Save course" busy={task.loading} error={task.error} onClose={() => setConfirm(false)} onConfirm={() => void task.run(async () => {
      if (!valid) throw new Error("Review course details and coach assignments.");
      const input: ManagedCourseInput = { title: title.trim(), description: description.trim(), duration: Number(duration), price: Number(price), status, coachIds };
      await api.saveManagedCourse(course?.id ?? null, input); setConfirm(false); onSaved();
    })} />
  </>;
}
