import type { ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { dateLabel } from "@/booking/domain";
import { AuthIcon } from "@/components/auth/ui/auth-icon";
import { SelectionPressable } from "./selection-pressable";

// Sampled visually from the user-supplied flow reference; isolated to this journey.
export const journeyColors = {
  navy: "#211D4E", muted: "#747186", gold: "#C4B142",
  cream: "#F7F4E5", soft: "#F4F3F8", outline: "#DDDDE3",
  paper: "#FFFFFF", disabled: "#D6D6D8", faint: "#AAA8B7",
} as const;

export function JourneyButton({ label, onPress, disabled = false, testID = "booking-primary" }: {
  label: string; onPress: () => void; disabled?: boolean; testID?: string;
}) {
  return (
    <SelectionPressable
      accessibilityRole="button" accessibilityState={{ disabled }}
      disabled={disabled} onPress={onPress} testID={testID}
      restColor={disabled ? journeyColors.disabled : journeyColors.gold}
      style={journeyStyles.button}
    >
      <Text style={journeyStyles.buttonText}>{label}</Text>
    </SelectionPressable>
  );
}

export function JourneyFrame({ step, title, subtitle, children, actionLabel, action, disabled, note, onBack, testID }: {
  step: 1 | 2 | 3; title: string; subtitle: string; children: ReactNode;
  actionLabel: string; action: () => void; disabled?: boolean; note?: string;
  onBack?: () => void; testID: string;
}) {
  const insets = useSafeAreaInsets();
  const back = () => router.canGoBack() ? router.back() : router.replace("/(member)/book");
  return (
    <View style={[journeyStyles.root, { paddingTop: insets.top }]} testID={testID}>
      <View style={journeyStyles.container}>
        <View style={journeyStyles.header}>
          <Pressable onPress={onBack || back} accessibilityRole="button" accessibilityLabel="Go back" style={journeyStyles.icon} testID="booking-back">
            <AuthIcon name="back" size={22} color={journeyColors.navy} />
          </Pressable>
          <Text style={journeyStyles.brand}>THE ZAWANA</Text>
          <Pressable onPress={() => router.replace("/(member)/home")} accessibilityRole="button" accessibilityLabel="Close booking, keep selection" style={journeyStyles.icon} testID="booking-close">
            <Text style={journeyStyles.close}>×</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={journeyStyles.content}>
          <View style={journeyStyles.progress} accessibilityLabel={`Step ${step} of 3: ${step === 1 ? "Date" : step === 2 ? "Floor" : "Court"}`}>
            <Text style={journeyStyles.steps}>1 · Date  2 · Floor  3 · Court</Text>
            <Text style={journeyStyles.stepCount}>STEP {step} OF 3</Text>
          </View>
          <View style={journeyStyles.intro}>
            <Text accessibilityRole="header" style={journeyStyles.title}>{title}</Text>
            <Text style={journeyStyles.body}>{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
        <View style={[journeyStyles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {note ? <Text style={journeyStyles.caption}>{note}</Text> : null}
          <JourneyButton label={actionLabel} onPress={action} disabled={disabled} />
        </View>
      </View>
    </View>
  );
}

export function JourneyEntrance({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  return <Animated.View entering={reduced ? undefined : FadeInDown.duration(350).delay(delay)}>{children}</Animated.View>;
}

export function DateRibbon({ date, floor, onChange }: { date: string; floor?: string; onChange: () => void }) {
  return (
    <View style={journeyStyles.ribbon}>
      <Text style={journeyStyles.ribbonText}>{dateLabel(date)}</Text>
      <Pressable onPress={onChange} accessibilityRole="button" accessibilityLabel={floor ? "Change floor" : "Change booking date"} style={journeyStyles.ribbonAction}>
        <Text style={journeyStyles.caption}>{floor || "Change date"}</Text>
      </Pressable>
    </View>
  );
}

export const journeyStyles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", backgroundColor: journeyColors.paper },
  container: { flex: 1, width: "100%", maxWidth: 480 },
  header: { minHeight: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  icon: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  brand: { flex: 1, textAlign: "center", color: journeyColors.navy, fontSize: 12, fontWeight: "800" },
  close: { fontSize: 28, lineHeight: 32, color: journeyColors.navy },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20, gap: 20 },
  progress: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  steps: { fontSize: 11, color: journeyColors.navy, fontWeight: "700", flexShrink: 1 },
  stepCount: { fontSize: 10, color: journeyColors.muted, fontWeight: "700" },
  intro: { gap: 10, marginBottom: 2 },
  title: { fontSize: 28, lineHeight: 35, letterSpacing: -0.7, color: journeyColors.navy, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 20, color: journeyColors.muted },
  caption: { fontSize: 11, lineHeight: 17, color: journeyColors.muted },
  footer: { paddingTop: 10, paddingHorizontal: 24, gap: 10, backgroundColor: journeyColors.paper },
  button: { minHeight: 54, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { color: journeyColors.navy, fontSize: 16, lineHeight: 23, fontWeight: "700", textAlign: "center" },
  ribbon: { minHeight: 44, borderRadius: 12, backgroundColor: journeyColors.soft, flexDirection: "row", alignItems: "center", paddingLeft: 14, gap: 8 },
  ribbonText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "700", color: journeyColors.navy },
  ribbonAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, flexShrink: 1 },
  notice: { borderRadius: 14, padding: 16, gap: 6, backgroundColor: journeyColors.cream },
  strong: { fontSize: 12, lineHeight: 18, fontWeight: "700", color: journeyColors.navy },
});
