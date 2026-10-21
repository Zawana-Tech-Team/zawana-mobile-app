import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthIcon } from "../auth/ui/auth-icon";
import { Card, MemberPage, Reveal, Row, Section, colors, s } from "./ui";
export function ServicesScreen() {
  return (
    <MemberPage
      title={"Make time\nfor your game."}
      subtitle="Badminton, with everything taken care of."
    >
      <Reveal>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore badminton memberships"
          testID="services-membership"
          onPress={() => router.push("/(member)/membership")}
          style={styles.hero}
        >
          <Image
            source={require("../../../assets/facilities/court.webp")}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["#10172A22", "#10172AEF"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroCopy}>
            <View style={[s.pill, { backgroundColor: "#FFFFFF22" }]}>
              <Text style={[s.pillText, { color: "#F1D494" }]}>
                THE MEMBERSHIP EDIT
              </Text>
            </View>
            <Text style={styles.heroTitle}>
              {"More court time.\nMore you."}
            </Text>
            <Text style={styles.heroBody}>
              Find your rhythm with a badminton package.
            </Text>
            <Text style={styles.heroLink}>Explore packages ↗</Text>
          </View>
        </Pressable>
      </Reveal>
      <Section title="A game for every goal" />
      <Reveal delay={80}>
        <Card>
          <Row
            icon="badminton"
            title="Private courses"
            detail="Meet your coach. Build your game."
            onPress={() => router.push("/(member)/private-course")}
          />
          <View style={s.line} />
          <Row
            icon="retail"
            title="Badminton packages"
            detail="Flexible sessions. A reason to keep playing."
            onPress={() => router.push("/(member)/membership")}
          />
          <View style={s.line} />
          <Row
            icon="check"
            title="Member check-in"
            detail="One tap, and you’re ready to play."
            onPress={() => router.push("/(member)/check-in")}
          />
        </Card>
      </Reveal>
      <Reveal delay={160}>
        <View style={styles.note}>
          <AuthIcon name="calendar" color={colors.gold} size={24} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.strong}>Just a court? You’re covered.</Text>
            <Text style={s.caption}>
              Pick a floor, find your spot, and play.
            </Text>
          </View>
        </View>
        <Row
          icon="arrow"
          title="Book a badminton court"
          onPress={() => router.push("/(member)/book")}
        />
      </Reveal>
    </MemberPage>
  );
}
const styles = StyleSheet.create({
  hero: {
    minHeight: 300,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  heroCopy: { padding: 24, gap: 12 },
  heroTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  heroBody: { fontSize: 12, lineHeight: 19, color: "#E3E4EA", maxWidth: 240 },
  heroLink: { fontSize: 12, fontWeight: "700", color: "#E8CB8A", marginTop: 4 },
  note: {
    flexDirection: "row",
    gap: 14,
    padding: 20,
    backgroundColor: colors.cream,
    borderRadius: 18,
    marginTop: 12,
  },
});
