import type { ReactNode } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { AuthIcon } from "@/components/auth/ui/auth-icon";
import { authColors } from "@/components/auth/ui/tokens";
import { PrimaryButton } from "@/components/auth/ui/auth-button";
import { BrandLogo } from "@/components/auth/ui/brand-logo";

export const colors = {
  ...authColors,
  paper: "#FFFFFF",
  soft: "#F3F4F8",
  blue: "#92B7FF",
  amber: "#FFF5D4",
};
export const courtImage = require("../../../assets/facilities/court.webp");
export function Frame({
  title,
  children,
  action,
  actionLabel,
  disabled,
  busy,
  navigation = false,
  testID,
  brandHeader = false,
}: {
  title: string;
  children: ReactNode;
  action?: () => void;
  actionLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  navigation?: boolean;
  testID: string;
  brandHeader?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[ui.root, { paddingTop: insets.top }]} testID={testID}>
      <View style={ui.container}>
        <View style={[ui.header, brandHeader && { minHeight: 96 }]}>
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(member)/home")
            }
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={ui.iconButton}
            testID="booking-back"
          >
            <AuthIcon name="back" size={25} />
          </Pressable>
          {brandHeader ? (
            <View style={{ flex: 1 }}>
              <BrandLogo size={96} />
            </View>
          ) : (
            <Text style={ui.headerTitle} accessibilityRole="header">
              {title}
            </Text>
          )}
          <View style={ui.iconButton} />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.content}
        >
          {children}
        </ScrollView>
        {action && actionLabel ? (
          <View
            style={[
              ui.footer,
              { paddingBottom: navigation ? 12 : Math.max(insets.bottom, 16) },
            ]}
          >
            <View
              style={[ui.primary, { opacity: disabled || busy ? 0.55 : 1 }]}
            >
              <PrimaryButton
                label={actionLabel}
                onPress={action}
                disabled={disabled}
                loading={busy}
                arrow={false}
                style={ui.primary}
                testID="booking-primary"
              />
            </View>
          </View>
        ) : null}
        {navigation ? (
          <View
            style={[
              ui.navigation,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            {[
              {
                name: "Home",
                route: "/(member)/home" as const,
                icon: "home" as const,
              },
              {
                name: "Book",
                route: "/(member)/book" as const,
                icon: "calendar" as const,
              },
              {
                name: "My Bookings",
                route: "/(member)/bookings" as const,
                icon: "badminton" as const,
              },
            ].map((item) => (
              <Pressable
                key={item.name}
                accessibilityRole="button"
                onPress={() => router.replace(item.route)}
                style={ui.navItem}
              >
                <AuthIcon name={item.icon} />
                <Text style={ui.navText}>{item.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
export function Entrance({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.duration(180)}>
      {children}
    </Animated.View>
  );
}
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text style={ui.title} accessibilityRole="header">
      {children}
    </Text>
  );
}
export function Body({ children }: { children: ReactNode }) {
  return <Text style={ui.body}>{children}</Text>;
}
export function LinkButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={ui.linkButton}
      testID={testID}
    >
      <Text style={ui.link}>{label}</Text>
    </Pressable>
  );
}
export function Feedback({
  loading,
  error,
  onRetry,
  empty,
  loadingLabel = "Loading availability…",
}: {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: string;
  loadingLabel?: string;
}) {
  if (loading)
    return (
      <View style={ui.feedback}>
        <ActivityIndicator color={colors.navy} />
        <Text style={ui.body} accessibilityLiveRegion="polite">
          {loadingLabel}
        </Text>
      </View>
    );
  if (error)
    return (
      <View style={ui.error} accessibilityLiveRegion="polite">
        <Text style={ui.errorText}>{error}</Text>
        {onRetry ? <LinkButton label="Try again" onPress={onRetry} /> : null}
      </View>
    );
  return empty ? (
    <View style={ui.card}>
      <Body>{empty}</Body>
    </View>
  ) : null;
}
export function PaymentNotice() {
  return (
    <View style={ui.notice}>
      <Text style={ui.noticeTitle}>Payment due at the venue</Text>
      <Text style={ui.noticeBody}>
        Your reservation is saved without online payment. No payment is
        collected in this app. Arrange payment with ZAWANA staff.
      </Text>
    </View>
  );
}
export function Legend({ surface = false }: { surface?: boolean }) {
  return (
    <View
      style={[
        ui.legend,
        surface && {
          backgroundColor: colors.soft,
          borderRadius: 12,
          paddingHorizontal: 12,
        },
      ]}
    >
      {[
        { label: "Available", color: colors.blue },
        { label: "Selected", color: colors.navy },
        { label: "Unavailable", color: "#D2D5DE" },
      ].map((item) => (
        <View style={ui.legendItem} key={item.label}>
          <View style={[ui.dot, { backgroundColor: item.color }]} />
          <Text style={ui.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
export const ui = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: "center" },
  container: { flex: 1, width: "100%", maxWidth: 460 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    minHeight: 65,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: colors.navy,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  content: { padding: 20, paddingTop: 14, paddingBottom: 24, gap: 16 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#F1F2F6",
    backgroundColor: colors.paper,
  },
  primary: { borderRadius: 15, overflow: "hidden" },
  title: {
    fontSize: 23,
    lineHeight: 29,
    color: colors.navy,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  body: { fontSize: 15, lineHeight: 23, color: colors.muted },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderColor: "#E7E9F0",
    borderWidth: 1,
    padding: 18,
    gap: 10,
    boxShadow: "0 4px 18px rgba(16,23,71,0.04)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  copy: { flex: 1, gap: 4 },
  linkButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  link: { fontSize: 15, fontWeight: "600", color: colors.goldDark },
  feedback: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  error: { backgroundColor: "#FFF0F1", padding: 16, borderRadius: 12, gap: 6 },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 22 },
  notice: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.amber,
    gap: 7,
  },
  noticeTitle: { fontSize: 16, fontWeight: "700", color: "#865410" },
  noticeBody: { fontSize: 14, lineHeight: 21, color: "#756244" },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 4,
  },
  legendItem: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 12, color: colors.muted },
  navigation: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#ECEEF4",
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    gap: 4,
  },
  navText: { fontSize: 11, color: colors.navy },
  badge: {
    backgroundColor: colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, color: "#865410", fontWeight: "600" },
});
