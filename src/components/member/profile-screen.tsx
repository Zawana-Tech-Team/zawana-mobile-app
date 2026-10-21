import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useFormTask } from "@/hooks/use-form-task";
import { Avatar, MembershipCard } from "./membership-card";
import { useDashboard } from "./use-dashboard";
import {
  Card,
  Confirm,
  MemberPage,
  Notice,
  Reveal,
  Row,
  Section,
  s,
} from "./ui";
export function ProfileScreen() {
  const { user, signOut } = useAuth(),
    dashboard = useDashboard(),
    task = useFormTask();
  const [logout, setLogout] = useState(false);
  if (!user) return null;
  const data = dashboard.data;
  return (
    <MemberPage
      title="My profile"
      subtitle="Your game. Your progress. Your Zawana."
      tab="Profile"
    >
      <Reveal>
        <View style={[s.split, { paddingVertical: 10 }]}>
          <Avatar user={user} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[s.sectionTitle, { fontSize: 22 }]}>{user.name}</Text>
            <Text style={s.caption}>{user.email}</Text>
            <View style={s.pill}>
              <Text style={s.pillText}>ZAWANA MEMBER</Text>
            </View>
          </View>
        </View>
      </Reveal>
      <Notice
        loading={dashboard.loading}
        error={dashboard.error}
        onRetry={dashboard.retry}
      />
      <Reveal delay={70}>
        <MembershipCard user={user} enrollment={data?.enrollment ?? null} />
      </Reveal>
      {data ? (
        <Reveal delay={120}>
          <Card>
            <View style={s.stats}>
              <View style={s.statCell}>
                <Text style={s.stat}>
                  {data.enrollment?.sessionsRemaining ?? "—"}
                </Text>
                <Text style={s.caption}>Sessions left</Text>
              </View>
              <View style={s.statCell}>
                <Text style={s.stat}>{data.upcomingBookingCount}</Text>
                <Text style={s.caption}>Upcoming</Text>
              </View>
              <View style={s.statCell}>
                <Text style={s.stat}>{data.checkIns.length}</Text>
                <Text style={s.caption}>Recent visits</Text>
              </View>
            </View>
          </Card>
        </Reveal>
      ) : null}
      <Section title="Your badminton club" />
      <Reveal delay={170}>
        <Card>
          <Row
            icon="retail"
            title="Membership & packages"
            detail="Your sessions, all in one place"
            onPress={() => router.push("/(member)/membership")}
          />
          <View style={s.line} />
          <Row
            icon="check"
            title="Check in"
            detail="Ready for your next session?"
            onPress={() => router.push("/(member)/check-in")}
          />
          <View style={s.line} />
          <Row
            icon="badminton"
            title="Private coaching"
            detail="A little guidance. A better game."
            onPress={() => router.push("/(member)/private-course")}
          />
          <View style={s.line} />
          <Row
            icon="calendar"
            title="My private courses"
            detail="Requests, payments & confirmations"
            onPress={() => router.push("/(member)/courses")}
          />
        </Card>
      </Reveal>
      <Section title="Account details" />
      <Card>
        <Text style={s.caption}>EMAIL ADDRESS</Text>
        <Text selectable style={s.strong}>
          {user.email}
        </Text>
        <View style={s.line} />
        <Text style={s.caption}>PHONE NUMBER</Text>
        <Text selectable style={s.strong}>
          {user.phone ?? "No phone number added"}
        </Text>
      </Card>
      <Row icon="lock" title="Sign out" onPress={() => setLogout(true)} />
      <Text
        style={[
          s.caption,
          {
            textAlign: "center",
            fontSize: 10,
            letterSpacing: 2,
            paddingBottom: 12,
          },
        ]}
      >
        PLAY WELL. BELONG HERE.
      </Text>
      <Confirm
        visible={logout}
        title="Sign out?"
        body="You can sign in again to view your memberships and bookings."
        label="Sign out"
        busy={task.loading}
        error={task.error}
        onClose={() => setLogout(false)}
        onConfirm={() => void task.run(signOut)}
      />
    </MemberPage>
  );
}
