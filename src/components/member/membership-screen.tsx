import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import type { DashboardPackage } from "@/auth/types";
import { useFormTask } from "@/hooks/use-form-task";
import { MembershipCard } from "./membership-card";
import { useDashboard } from "./use-dashboard";
import {
  Button,
  Card,
  Confirm,
  MemberPage,
  Notice,
  Reveal,
  Section,
  money,
  shortDate,
  s,
} from "./ui";
export function MembershipScreen() {
  const { user, api } = useAuth(),
    dashboard = useDashboard(),
    task = useFormTask();
  const [selected, setSelected] = useState<DashboardPackage | null>(null),
    [success, setSuccess] = useState(false);
  if (!user) return null;
  const data = dashboard.data,
    enrollment = data?.enrollment;
  return (
    <MemberPage
      title="Your membership"
      subtitle="A little commitment. A lot more court time."
      tab="Profile"
      back
    >
      <Reveal>
        <MembershipCard user={user} enrollment={enrollment ?? null} />
      </Reveal>
      <Notice
        loading={dashboard.loading}
        error={dashboard.error}
        onRetry={dashboard.retry}
      />
      {success ? (
        <Card>
          <Text accessibilityLiveRegion="polite" style={s.strong}>
            Your package is active. See you on court!
          </Text>
        </Card>
      ) : null}
      {enrollment ? (
        <Card>
          <View style={s.stats}>
            <View style={s.statCell}>
              <Text style={s.stat}>
                {enrollment.sessionsRemaining}
                <Text style={s.caption}> / {enrollment.sessionsTotal}</Text>
              </Text>
              <Text style={s.caption}>Sessions remaining</Text>
            </View>
            <View style={s.statCell}>
              <Text style={s.strong}>{shortDate(enrollment.expiryDate)}</Text>
              <Text style={s.caption}>Valid until</Text>
            </View>
          </View>
          <View style={s.progress}>
            <View
              style={[
                s.fill,
                {
                  width: `${Math.min(100, Math.max(0, (enrollment.sessionsRemaining / Math.max(1, enrollment.sessionsTotal)) * 100))}%`,
                },
              ]}
            />
          </View>
          <Button
            label="Check in for a session"
            onPress={() => router.push("/(member)/check-in")}
          />
        </Card>
      ) : data ? (
        <Card>
          <Text style={s.strong}>Your next chapter starts here.</Text>
          <Text style={s.body}>
            Choose a badminton package below to begin your membership.
          </Text>
        </Card>
      ) : null}
      <Section title="Find your rhythm" />
      {data?.packages.map((pkg, i) => (
        <Reveal key={pkg.id} delay={i * 50}>
          <Card>
            <View style={s.pill}>
              <Text style={s.pillText}>
                {pkg.category?.name ?? "BADMINTON"} · {pkg.sessions} SESSIONS
              </Text>
            </View>
            <Text style={[s.sectionTitle, { fontSize: 22 }]}>{pkg.title}</Text>
            <Text style={s.body}>{pkg.description}</Text>
            <Text style={s.stat}>{money(pkg.price)}</Text>
            <Text style={s.caption}>
              {pkg.validity} days validity
              {pkg.scheduleNotes ? ` · ${pkg.scheduleNotes}` : ""}
            </Text>
            {pkg.courtRules ? (
              <Text style={s.caption}>{pkg.courtRules}</Text>
            ) : null}
            <Button
              label={
                pkg.status === "coming_soon" ? "Coming soon" : "View package"
              }
              secondary
              disabled={
                pkg.status !== "active" || pkg.category?.active === false
              }
              onPress={() => {
                task.setError(null);
                setSelected(pkg);
              }}
            />
          </Card>
        </Reveal>
      ))}
      {data && !data.packages.length ? (
        <Text style={s.body}>
          New badminton packages will appear here when they’re available.
        </Text>
      ) : null}
      {data?.enrollmentHistory.some((e) => e.id !== enrollment?.id) ? (
        <>
          <Section title="Membership history" />
          {data.enrollmentHistory
            .filter((e) => e.id !== enrollment?.id)
            .map((e) => (
              <Card key={e.id}>
                <Text style={s.strong}>{e.packageName}</Text>
                <Text style={s.caption}>
                  {e.status} · {e.sessionsRemaining} sessions remaining ·{" "}
                  {shortDate(e.expiryDate)}
                </Text>
              </Card>
            ))}
        </>
      ) : null}
      <Confirm
        visible={!!selected}
        title={selected?.title ?? ""}
        body={
          selected
            ? `${selected.sessions} badminton sessions · ${selected.validity} days · ${money(selected.price)}. Online package checkout is currently disabled by ZAWANA. This activates the package immediately; arrange payment with the venue.`
            : ""
        }
        label="Activate package"
        busy={task.loading}
        error={task.error}
        onClose={() => setSelected(null)}
        onConfirm={() =>
          void task.run(async () => {
            if (!selected) return;
            await api.purchaseBadmintonPackage(selected.id);
            setSelected(null);
            setSuccess(true);
            dashboard.retry();
          })
        }
      />
    </MemberPage>
  );
}
