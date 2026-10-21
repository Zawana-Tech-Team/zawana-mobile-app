import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn, ReduceMotion } from "react-native-reanimated";
import { useAuth } from "@/auth/auth-provider";
import { yangonDate } from "@/booking/private-course";
import { useFormTask } from "@/hooks/use-form-task";
import { AuthIcon } from "../auth/ui/auth-icon";
import { useDashboard } from "./use-dashboard";
import {
  Button,
  Card,
  Confirm,
  MemberPage,
  Notice,
  Reveal,
  Section,
  colors,
  shortDate,
  s,
} from "./ui";
export function CheckInScreen() {
  const { api } = useAuth(),
    dashboard = useDashboard(),
    task = useFormTask();
  const [confirm, setConfirm] = useState(false),
    [success, setSuccess] = useState(false);
  const data = dashboard.data,
    enrollment = data?.enrollment;
  const today = yangonDate(),
    checked =
      success ||
      data?.checkIns.some(
        (c) => c.enrollmentId === enrollment?.id && c.date === today,
      );
  const eligible =
    !!enrollment &&
    enrollment.status === "active" &&
    enrollment.expiryDate >= today &&
    enrollment.sessionsRemaining > 0 &&
    !checked;
  return (
    <MemberPage
      title="See you on court."
      subtitle="Your badminton session starts here."
      tab="Profile"
      back
    >
      <Notice
        loading={dashboard.loading}
        error={dashboard.error}
        onRetry={dashboard.retry}
      />
      <Reveal>
        <View style={styles.center}>
          <View
            style={[
              styles.ring,
              checked && { backgroundColor: "#E8F3EE", borderColor: "#C4E0D1" },
            ]}
          >
            <Animated.View
              key={checked ? "checked-in" : "ready"}
              entering={ZoomIn.duration(300).reduceMotion(ReduceMotion.System)}
              style={[
                styles.inner,
                checked && { backgroundColor: colors.green },
              ]}
            >
              <AuthIcon
                name={checked ? "check" : "badminton"}
                size={46}
                color={checked ? "#FFFFFF" : colors.gold}
              />
            </Animated.View>
          </View>
          <Text style={[s.sectionTitle, { fontSize: 25 }]}>
            {checked ? "You’re checked in." : "Ready when you are."}
          </Text>
          <Text style={[s.body, { textAlign: "center", maxWidth: 280 }]}>
            {checked
              ? "Enjoy your session. Make every rally count."
              : "Check in at ZAWANA to use one session from your badminton membership."}
          </Text>
        </View>
      </Reveal>
      {enrollment ? (
        <Card>
          <View style={s.pill}>
            <Text style={s.pillText}>YOUR ACTIVE PACKAGE</Text>
          </View>
          <Text style={s.sectionTitle}>{enrollment.packageName}</Text>
          <View style={s.stats}>
            <View style={s.statCell}>
              <Text style={s.stat}>{enrollment.sessionsRemaining}</Text>
              <Text style={s.caption}>Sessions remaining</Text>
            </View>
            <View style={s.statCell}>
              <Text style={s.strong}>{shortDate(enrollment.expiryDate)}</Text>
              <Text style={s.caption}>Valid until</Text>
            </View>
          </View>
          <Button
            label={checked ? "Checked in today" : "Check in · use 1 session"}
            disabled={!eligible}
            testID="badminton-check-in"
            onPress={() => {
              task.setError(null);
              setConfirm(true);
            }}
          />
          <Text style={[s.caption, { textAlign: "center" }]}>
            One check-in per day · Yangon local time
          </Text>
        </Card>
      ) : data ? (
        <Card>
          <Text style={s.strong}>Your membership awaits.</Text>
          <Text style={s.body}>
            You’ll need an active badminton package with sessions remaining to
            check in.
          </Text>
          <Button
            label="Explore packages"
            onPress={() => router.push("/(member)/membership")}
          />
        </Card>
      ) : null}
      <Section title="Recent visits" />
      {data?.checkIns.map((c) => (
        <View key={c.id} style={s.row}>
          <View style={s.rowIcon}>
            <AuthIcon name="check" color={colors.green} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.strong}>{shortDate(c.date)}</Text>
            <Text style={s.caption}>{c.time} · Badminton session</Text>
          </View>
          <Text style={s.caption}>−{c.sessionsUsed} session</Text>
        </View>
      ))}
      {data && !data.checkIns.length ? (
        <Text style={s.body}>
          Your visits will appear here after your first check-in.
        </Text>
      ) : null}
      <Confirm
        visible={confirm}
        title="Ready to check in?"
        body={`This uses one session from ${enrollment?.packageName ?? "your package"}. Check in when you arrive at the venue.`}
        label="Confirm check-in"
        busy={task.loading}
        error={task.error}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          void task.run(async () => {
            if (!enrollment) return;
            await api.checkInBadminton(enrollment.id);
            setSuccess(true);
            setConfirm(false);
            dashboard.retry();
          })
        }
      />
    </MemberPage>
  );
}
const styles = StyleSheet.create({
  center: { alignItems: "center", gap: 14, paddingVertical: 26 },
  ring: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: "#E8DCC2",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F3E9",
    marginBottom: 8,
  },
  inner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
});
