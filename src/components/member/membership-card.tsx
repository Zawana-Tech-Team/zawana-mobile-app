import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import type { AppUser, DashboardEnrollment } from "@/auth/types";
import { AuthIcon } from "../auth/ui/auth-icon";
import { colors, shortDate } from "./ui";
export function MembershipCard({
  user,
  enrollment,
}: {
  user: AppUser;
  enrollment: DashboardEnrollment | null;
}) {
  return (
    <LinearGradient
      colors={["#202A51", "#11182F", "#29334F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.orbit} />
      <View style={styles.orbitSmall} />
      <View style={styles.top}>
        <Text style={styles.brand}>THE ZAWANA</Text>
        <AuthIcon name="badminton" size={28} color="#D8BB7C" />
      </View>
      <Text style={styles.kicker}>
        {enrollment ? "BADMINTON MEMBERSHIP" : "YOUR CLUB. YOUR GAME."}
      </Text>
      <Text style={styles.name}>
        {enrollment?.packageName ?? "A better way to play."}
      </Text>
      <View style={styles.bottom}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.member}>{user.name}</Text>
          <Text style={styles.detail}>
            {enrollment
              ? `VALID UNTIL ${shortDate(enrollment.expiryDate).toUpperCase()}`
              : "EXPLORE BADMINTON MEMBERSHIPS"}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {enrollment ? "ACTIVE" : "Z CLUB"}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
export function Avatar({ user }: { user: AppUser }) {
  return user.avatar ? (
    <Image
      source={{ uri: user.avatar }}
      style={styles.avatar}
      contentFit="cover"
    />
  ) : (
    <View style={[styles.avatar, styles.initials]}>
      <Text style={{ fontSize: 25, fontWeight: "600", color: colors.navy }}>
        {user.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    minHeight: 216,
    borderRadius: 22,
    padding: 23,
    overflow: "hidden",
    gap: 14,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#F2DFB5",
  },
  kicker: { fontSize: 9, letterSpacing: 1.8, color: "#C9BD9E", marginTop: 9 },
  name: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "600",
    color: "#FFFFFF",
    maxWidth: "90%",
    letterSpacing: -0.6,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  member: { fontSize: 13, color: "#FFFFFF", fontWeight: "600" },
  detail: { fontSize: 8, color: "#B8BED0", letterSpacing: 1, lineHeight: 13 },
  badge: {
    borderColor: "#C7AB6A77",
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 8, letterSpacing: 1.5, color: "#E0C58E" },
  orbit: {
    position: "absolute",
    right: -120,
    top: -60,
    width: 310,
    height: 310,
    borderWidth: 1,
    borderColor: "#D4B7761A",
    borderRadius: 160,
  },
  orbitSmall: {
    position: "absolute",
    right: -85,
    top: -25,
    width: 240,
    height: 240,
    borderWidth: 30,
    borderColor: "#D4B77608",
    borderRadius: 130,
  },
  avatar: { width: 68, height: 68, borderRadius: 24 },
  initials: {
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
});
