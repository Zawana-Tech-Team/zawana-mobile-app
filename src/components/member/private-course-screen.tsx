import { router } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
import {
  upcomingDays,
  yangonDate,
  type PrivateCourse,
  type CourseSlot,
} from "@/booking/private-course";
import type { DashboardCoach } from "@/auth/types";
import type { Court } from "@/booking/types";
import { AuthError } from "@/auth/errors";
import { useFormTask } from "@/hooks/use-form-task";
import { FloorSelector } from "../booking/floor-selector";
import { CourtPlan } from "../booking/court-plan";
import {
  bookingFloors,
  courtFloor,
  courtsOnFloor,
  type BookingFloor,
} from "../booking/court-presentation";
import { AuthIcon } from "../auth/ui/auth-icon";
import {
  Button,
  Card,
  MemberPage,
  Notice,
  Reveal,
  Section,
  colors,
  money,
  shortDate,
  s,
} from "./ui";

export function PrivateCourseScreen() {
  const { api, user } = useAuth(),
    task = useFormTask();
  const [step, setStep] = useState(0),
    [coach, setCoach] = useState<DashboardCoach | null>(null),
    [course, setCourse] = useState<PrivateCourse | null>(null),
    [floor, setFloor] = useState<BookingFloor | null>(null),
    [court, setCourt] = useState<Court | null>(null),
    [date, setDate] = useState(yangonDate),
    [slot, setSlot] = useState<CourseSlot | null>(null),
    [offset, setOffset] = useState(0);
  const catalog = useResource(
    useCallback(
      async (signal: AbortSignal) => {
        const [courses, availability] = await Promise.all([
          api.getPrivateCourses({ signal }),
          api.getCourtAvailability(yangonDate(), { signal }),
        ]);
        return {
          courses,
          courts: availability.courts,
          today: availability.today,
        };
      },
      [api],
    ),
    user?.id ?? "",
  );
  const input = {
    courseId: course?.id ?? "",
    coachId: coach?.id ?? "",
    courtId: court?.id ?? "",
    date,
    durationMinutes: course?.duration ?? 60,
  };
  const available = useResource(
    useCallback(
      (signal: AbortSignal) =>
        api.getPrivateCourseAvailability(
          {
            courseId: course?.id ?? "",
            coachId: coach?.id ?? "",
            courtId: court?.id ?? "",
            date,
            durationMinutes: course?.duration ?? 60,
          },
          { signal },
        ),
      [api, course?.id, course?.duration, coach?.id, court?.id, date],
    ),
    `${user?.id}|${course?.id}|${coach?.id}|${court?.id}|${date}`,
    step >= 2 && !!course && !!coach && !!court,
  );
  const coaches = [
    ...new Map(
      (catalog.data?.courses ?? [])
        .filter((c) => c.status === "active")
        .flatMap((c) => c.coaches)
        .filter((c) => c.status === "active" && c.department === "Badminton")
        .map((c) => [c.id, c]),
    ).values(),
  ];
  const eligible = (catalog.data?.courses ?? []).filter(
    (c) => c.status === "active" && c.coaches.some((c) => c.id === coach?.id),
  );
  const today = catalog.data?.today ?? yangonDate(),
    days = upcomingDays(today, 196).slice(offset, offset + 28);
  const chosenSlot = available.data?.slots.find(
    (s) => s.time === slot?.time && s.available,
  );
  const titles = [
    "Find your coach.",
    "Find your court.",
    "Make it a date.",
    "Your next great session.",
  ];
  const subtitles = [
    "Expert guidance, built around your badminton game.",
    "Choose a floor, then your favourite place to play.",
    "Only times that work for both your coach and court.",
    "One final look before we send your request.",
  ];
  const go = (next: number) => {
    task.setError(null);
    setStep(next);
  };
  const send = () =>
    void task.run(async () => {
      if (!course || !coach || !court || !chosenSlot || !available.data) return;
      // On a network retry, recover the exact existing request before attempting another write.
      const existing = await api.getPrivateCourseBookings();
      const duplicate = existing.find(
        (b) =>
          b.coachId === coach.id &&
          b.courtId === court.id &&
          b.date === date &&
          b.time === chosenSlot.time &&
          [
            "PENDING_COACH_CONFIRMATION",
            "AWAITING_PAYMENT",
            "CONFIRMED",
          ].includes(b.status),
      );
      if (duplicate) {
        router.replace("/(member)/courses");
        return;
      }
      const latest = await api.getPrivateCourseAvailability(input);
      if (
        !latest.slots.some((s) => s.time === chosenSlot.time && s.available)
      ) {
        available.retry();
        setSlot(null);
        go(2);
        throw new AuthError(
          "bookingConflict",
          "That time is no longer available. Please choose another.",
        );
      }
      if (latest.price !== available.data.price) {
        available.retry();
        throw new AuthError(
          "bookingConflict",
          "The price has changed. Review the updated total before sending.",
        );
      }
      await api.requestPrivateCourse({
        courseId: course.id,
        coachId: coach.id,
        courtId: court.id,
        date,
        time: chosenSlot.time,
        expectedPrice: latest.price,
      });
      router.replace("/(member)/courses");
    });
  const next = () => (step === 3 ? send() : go(step + 1));
  const enabled =
    step === 0
      ? !!coach && !!course
      : step === 1
        ? !!court
        : step === 2
          ? !!chosenSlot
          : !!chosenSlot && !available.loading;
  return (
    <MemberPage
      scrollKey={step}
      title={titles[step]}
      subtitle={subtitles[step]}
      back
      onBack={step > 0 ? () => go(step - 1) : undefined}
      footer={
        <View style={{ gap: 10 }}>
          <Notice error={task.error} />
          {step === 3 && available.data ? (
            <View style={styles.reviewRow}>
              <Text style={s.strong}>Total</Text>
              <Text style={s.sectionTitle}>{money(available.data.price)}</Text>
            </View>
          ) : null}
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              testID="course-back"
              disabled={task.loading}
              onPress={() => go(step - 1)}
              style={{ minHeight: 36, justifyContent: "center" }}
            >
              <Text style={s.link}>
                ← Back to {["", "coach", "court", "date & time"][step]}
              </Text>
            </Pressable>
          ) : null}
          <Button
            label={
              step === 3
                ? "Send request to coach"
                : step === 0
                  ? "Choose your court"
                  : step === 1
                    ? "Choose date & time"
                    : "Review your request"
            }
            disabled={!enabled}
            busy={task.loading}
            onPress={next}
            testID="course-next"
          />
        </View>
      }
    >
      <View style={styles.steps}>
        {["Coach", "Court", "Time", "Review"].map((label, i) => (
          <View key={label} style={styles.step}>
            <View
              style={[
                styles.dot,
                i <= step && { backgroundColor: colors.navy },
              ]}
            >
              <Text
                style={[styles.dotText, i <= step && { color: colors.white }]}
              >
                {i < step ? "✓" : i + 1}
              </Text>
            </View>
            <Text
              style={[
                s.caption,
                i === step && { color: colors.navy, fontWeight: "700" },
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
      <Notice
        loading={catalog.loading}
        error={catalog.error}
        onRetry={catalog.retry}
      />
      {step === 0 ? (
        <>
          <Section title="Meet your coaches" />
          {coaches.map((c, i) => (
            <Reveal key={c.id} delay={i * 40}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select coach ${c.name}`}
                accessibilityState={{ selected: coach?.id === c.id }}
                testID={`coach-${c.id}`}
                style={[s.choice, coach?.id === c.id && s.selected]}
                onPress={() => {
                  setCoach(c);
                  const options =
                    catalog.data?.courses.filter((x) =>
                      x.coaches.some((v) => v.id === c.id),
                    ) ?? [];
                  setCourse(options.length === 1 ? options[0] : null);
                  setSlot(null);
                }}
              >
                <View style={s.split}>
                  {c.imageUrl ? (
                    <Image
                      source={{ uri: mediaUrl(c.imageUrl) }}
                      contentFit="cover"
                      style={styles.coachPhoto}
                    />
                  ) : (
                    <View style={[styles.coachPhoto, styles.initial]}>
                      <AuthIcon name="person" size={30} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={s.sectionTitle}>{c.name}</Text>
                    <Text style={s.caption}>{c.specialty}</Text>
                    <Text style={styles.active}>● Active badminton coach</Text>
                  </View>
                  <AuthIcon
                    name={coach?.id === c.id ? "check" : "arrow"}
                    color={colors.gold}
                  />
                </View>
                <Text style={s.caption}>
                  Sessions from{" "}
                  {money(
                    Math.min(
                      ...(catalog.data?.courses ?? [])
                        .filter((x) => x.coaches.some((v) => v.id === c.id))
                        .map((x) => x.price),
                    ),
                  )}
                </Text>
              </Pressable>
            </Reveal>
          ))}
          {!catalog.loading && !catalog.error && !coaches.length ? (
            <Card>
              <Text style={s.strong}>Coaching is taking a short break.</Text>
              <Text style={s.body}>
                Active badminton coaches and their courses will appear here when
                available.
              </Text>
            </Card>
          ) : null}
          {coach ? (
            <>
              <Section title="Choose your session" />
              {eligible.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: course?.id === c.id }}
                  onPress={() => {
                    setCourse(c);
                    setSlot(null);
                  }}
                  style={[s.choice, course?.id === c.id && s.selected]}
                  testID={`course-${c.id}`}
                >
                  <View style={s.pill}>
                    <Text style={s.pillText}>
                      {c.duration} MIN · PRIVATE BADMINTON
                    </Text>
                  </View>
                  <Text style={s.strong}>{c.title}</Text>
                  <Text style={s.body}>{c.description}</Text>
                  <Text style={s.sectionTitle}>{money(c.price)}</Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </>
      ) : null}
      {step === 1 ? (
        <>
          <Card>
            <Text style={s.strong}>
              {coach?.name} · {course?.title}
            </Text>
            <Text style={s.caption}>
              {course?.duration} minutes · {money(course?.price ?? 0)}
            </Text>
          </Card>
          <FloorSelector
            floor={floor}
            zooming={false}
            availableFloors={bookingFloors.filter((f) =>
              (catalog.data?.courts ?? []).some(
                (c) => courtFloor(c) === f && c.status === "available",
              ),
            )}
            disabled={false}
            onSelect={(f) => {
              setFloor(f);
              setCourt(null);
              setSlot(null);
            }}
            onEntered={() => {}}
          />
          {floor ? (
            <>
              <Section title={`${floor} courts`} />
              <CourtPlan
                floor={floor}
                courts={courtsOnFloor(catalog.data?.courts ?? [], floor)}
                selectedId={court?.id}
                onSelect={(c) => {
                  setCourt(c);
                  setSlot(null);
                }}
              />
              <Text style={s.caption}>
                Court selection checks facility status. Choose a time next to
                check both court and coach availability.
              </Text>
            </>
          ) : null}
        </>
      ) : null}
      {step === 2 ? (
        <>
          <Card>
            <Text style={s.strong}>
              {court?.name} · {floor}
            </Text>
            <Text style={s.caption}>
              {coach?.name} · {course?.duration} minutes · Yangon time
            </Text>
          </Card>
          <View style={[s.section, { gap: 10 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous dates"
              disabled={offset === 0}
              onPress={() => setOffset((v) => Math.max(0, v - 28))}
              style={styles.dateArrow}
            >
              <Text style={[s.strong, offset === 0 && { opacity: 0.25 }]}>
                ←
              </Text>
            </Pressable>
            <Text style={s.strong}>
              {shortDate(days[0]).replace(/^\d+ /, "")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next dates"
              disabled={offset >= 168}
              onPress={() => setOffset((v) => v + 28)}
              style={styles.dateArrow}
            >
              <Text style={[s.strong, offset >= 168 && { opacity: 0.25 }]}>
                →
              </Text>
            </Pressable>
          </View>
          <View style={styles.calendar}>
            {days.map((d) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={shortDate(d)}
                accessibilityState={{ selected: date === d }}
                testID={`course-date-${d}`}
                onPress={() => {
                  setDate(d);
                  setSlot(null);
                }}
                style={[
                  styles.day,
                  date === d && {
                    backgroundColor: colors.navy,
                    borderColor: colors.navy,
                  },
                ]}
              >
                <Text
                  style={[styles.weekday, date === d && { color: "#CFD2DE" }]}
                >
                  {new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
                    weekday: "short",
                    timeZone: "Asia/Yangon",
                  })}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    date === d && { color: colors.white },
                  ]}
                >
                  {Number(d.slice(-2))}
                </Text>
              </Pressable>
            ))}
          </View>
          <Section title="Available times" />
          <Notice
            loading={available.loading}
            error={available.error}
            onRetry={available.retry}
          />
          <View style={s.wrap}>
            {available.data?.slots.map((t) => (
              <Pressable
                key={t.time}
                accessibilityRole="button"
                accessibilityLabel={`${t.time}${t.reason ? `, ${t.reason}` : ""}`}
                accessibilityState={{
                  selected: slot?.time === t.time,
                  disabled: !t.available,
                }}
                disabled={!t.available}
                testID={`course-slot-${t.startMinute}`}
                onPress={() => setSlot(t)}
                style={[
                  styles.slot,
                  slot?.time === t.time && s.selected,
                  !t.available && { opacity: 0.45 },
                ]}
              >
                <Text style={s.strong}>{t.time.split(" — ")[0]}</Text>
                <Text style={s.caption}>
                  {t.available ? `${course?.duration} min` : t.reason}
                </Text>
              </Pressable>
            ))}
          </View>
          {available.data && !available.data.slots.some((t) => t.available) ? (
            <Text style={s.body}>
              No shared availability on this date. Try another day or coach.
            </Text>
          ) : null}
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Reveal>
            <Card>
              <View style={s.pill}>
                <Text style={s.pillText}>PRIVATE BADMINTON SESSION</Text>
              </View>
              <Text style={[s.sectionTitle, { fontSize: 24 }]}>
                {course?.title}
              </Text>
              {[
                ["Your coach", coach?.name],
                ["Your court", `${court?.name} · ${floor}`],
                ["Date", shortDate(date)],
                ["Time", slot?.time],
                ["Duration", `${course?.duration} minutes`],
              ].map(([key, value]) => (
                <View key={key} style={styles.reviewRow}>
                  <Text style={s.caption}>{key}</Text>
                  <Text
                    style={[
                      s.strong,
                      { flex: 1, textAlign: "right", fontSize: 13 },
                    ]}
                  >
                    {value}
                  </Text>
                </View>
              ))}
              <View style={s.line} />
              <View style={styles.reviewRow}>
                <Text style={s.strong}>Total</Text>
                <Text style={s.stat}>
                  {money(available.data?.price ?? course?.price ?? 0)}
                </Text>
              </View>
              <Text style={s.caption}>
                Server-calculated course price · MMK
              </Text>
            </Card>
          </Reveal>
          <Card>
            <AuthIcon name="calendar" color={colors.gold} />
            <Text style={s.strong}>Your coach gets the next move.</Text>
            <Text style={s.body}>
              We’ll notify you when your coach accepts. You’ll then have 24
              hours to complete payment. Your session is confirmed after payment
              is verified.
            </Text>
            <Text style={s.caption}>
              Cancelling or missing the payment deadline releases your court and
              coach reservation.
            </Text>
          </Card>
          <Notice
            loading={available.loading}
            error={available.error}
            onRetry={available.retry}
          />
        </>
      ) : null}
    </MemberPage>
  );
}
export function mediaUrl(path: string) {
  const origin = (process.env.EXPO_PUBLIC_API_URL ?? "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
  return path.startsWith("/") ? `${origin}${path}` : path;
}
const styles = StyleSheet.create({
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  step: { alignItems: "center", gap: 7 },
  dot: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: { fontSize: 11, color: colors.muted, fontWeight: "700" },
  coachPhoto: { width: 64, height: 72, borderRadius: 16 },
  initial: {
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  active: { fontSize: 10, color: colors.green },
  calendar: { flexDirection: "row", flexWrap: "wrap", gap: "1.5%" },
  day: {
    width: "13%",
    minHeight: 62,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 6,
    backgroundColor: colors.white,
  },
  weekday: { fontSize: 9, color: colors.muted },
  dayNumber: { fontSize: 17, color: colors.navy, fontWeight: "600" },
  dateArrow: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  slot: {
    width: "47.5%",
    flexGrow: 1,
    minHeight: 70,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    gap: 5,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    paddingVertical: 6,
  },
});
