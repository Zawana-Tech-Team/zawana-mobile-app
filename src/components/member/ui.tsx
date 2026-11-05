import { BrandLogo } from "../auth/ui/brand-logo";
import { ContextSurface } from "../shared/context-surface";
import { NotificationBell } from "./notification-bell";
import { brand } from "@/design/tokens";
import { useState, type ReactNode } from "react";
import { router, type Href } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";
import { AuthIcon, type AuthIconName } from "../auth/ui/auth-icon";
import { SelectionPressable } from "../booking/selection-pressable";

export const colors = {
  navy: brand.navy,
  gold: brand.gold,
  paper: brand.page,
  white: "#FFFFFF",
  muted: brand.muted,
  line: brand.border,
  cream: brand.goldSoft,
  green: "#24745D",
  red: "#B14750",
};
const tabs: { label: string; icon: AuthIconName; href: Href }[] = [
  { label: "Home", icon: "home", href: "/(member)/home" },
  { label: "Services", icon: "badminton", href: "/(member)/services" },
  { label: "My Bookings", icon: "calendar", href: "/(member)/bookings" },
  { label: "Performance", icon: "heart", href: "/(member)/attendance" },
  { label: "Profile", icon: "person", href: "/(member)/profile" },
];
export function MemberPage({
  title,
  eyebrow = "THE ZAWANA",
  subtitle,
  children,
  tab = "Services",
  back = false,
  footer,
  scrollKey,
  onBack,
  wide = false,
  sectionLabel = "BADMINTON CLUB",
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: ReactNode;
  tab?: string;
  back?: boolean;
  footer?: ReactNode;
  scrollKey?: string | number;
  onBack?: () => void;
  wide?: boolean;
  sectionLabel?: string;
}) {
  const inset = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: inset.top }]}>
      <View style={[s.container, wide && { maxWidth: 960 }]}>
        <View style={s.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={back ? "Go back" : "Go home"}
            onPress={
              onBack ??
              (() =>
                back && router.canGoBack()
                  ? router.back()
                  : router.replace("/(member)/home"))
            }
            style={s.icon}
          >
            {back ? <AuthIcon name="back" color={colors.navy} /> : <BrandLogo size={44} />}
          </Pressable>
          <Text style={s.brand}>{eyebrow}</Text>
          <NotificationBell />
        </View>
        <ScrollView
          key={scrollKey}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.eyebrow}>{sectionLabel}</Text>
          <Text accessibilityRole="header" style={s.title}>
            {title}
          </Text>
          {subtitle ? <Text style={s.body}>{subtitle}</Text> : null}
          {scrollKey !== undefined ? <Animated.View key={scrollKey} entering={FadeInDown.duration(280).reduceMotion(ReduceMotion.System)} style={{ gap: 18 }}>{children}</Animated.View> : children}
        </ScrollView>
        {footer ? <View style={s.footer}>{footer}</View> : null}
        <MemberNavigation activeTab={tab} />
      </View>
    </View>
  );
}
/** The same five destinations stay available across member and booking pages. */
export function MemberNavigation({ activeTab }: { activeTab: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const selectedTab = activeTab === "Activity" ? "My Bookings" : ["Book", "Badminton", "Services"].includes(activeTab) ? "Services" : activeTab;
  return (
    <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((t) => (
        <Pressable
          key={t.label}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedTab === t.label }}
          aria-selected={selectedTab === t.label}
          accessibilityLabel={t.label}
          testID={`member-tab-${t.label.toLowerCase().replaceAll(" ", "-")}`}
          onPress={() => router.replace(t.href)}
          style={s.tab}
        >
          <AuthIcon
            name={t.icon}
            size={21}
            color={selectedTab === t.label ? colors.gold : colors.muted}
          />
          <Text
            style={[
              s.tabText,
              width < 360 && { fontSize: 9 },
              selectedTab === t.label && {
                color: colors.navy,
                fontWeight: "700",
              },
            ]}
          >
            {t.label}
          </Text>
          {selectedTab === t.label ? <View style={s.activeDot} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(360).delay(delay)}
    >
      {children}
    </Animated.View>
  );
}
export function Button({
  label,
  onPress,
  disabled = false,
  busy = false,
  secondary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  return (
    <SelectionPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      restColor={secondary ? colors.white : colors.navy}
      style={[
        s.button,
        secondary && s.secondary,
        (disabled || busy) && { opacity: 0.45 },
      ]}
      testID={testID}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.navy : colors.white} />
      ) : null}
      <Text style={[s.buttonText, secondary && { color: colors.navy }]}>
        {label}
      </Text>
      {!secondary && !busy ? (
        <AuthIcon name="arrow" size={18} color={colors.gold} />
      ) : null}
    </SelectionPressable>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {title}
      </Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={s.link}>{action} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
export function Row({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: AuthIconName;
  title: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>
      <View style={s.rowIcon}>
        <AuthIcon name={icon} size={20} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {detail ? <Text style={s.caption}>{detail}</Text> : null}
      </View>
      <AuthIcon name="arrow" size={17} color={colors.muted} />
    </Pressable>
  );
}
export function Notice({
  error,
  loading,
  onRetry,
}: {
  error?: string | null;
  loading?: boolean;
  onRetry?: () => void;
}) {
  return loading ? (
    <View style={s.notice}>
      <ActivityIndicator color={colors.gold} />
      <Text style={s.caption}>Loading your club…</Text>
    </View>
  ) : error ? (
    <View style={s.notice} accessibilityLiveRegion="polite">
      <Text style={[s.body, { color: colors.red }]}>{error}</Text>
      {onRetry ? (
        <Button secondary label="Try again" onPress={onRetry} />
      ) : null}
    </View>
  ) : null;
}
export function Confirm({
  visible,
  title,
  body,
  label,
  busy,
  error,
  onClose,
  onConfirm,
  children,
}: {
  visible: boolean;
  title: string;
  body: string;
  label: string;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const [lastContent, setLastContent] = useState({ title, body, label });
  if (visible && (lastContent.title !== title || lastContent.body !== body || lastContent.label !== label)) setLastContent({ title, body, label });
  const content = visible ? { title, body, label } : lastContent;
  return <ContextSurface title={content.title} visible={visible} busy={busy} onClose={onClose} footer={<><Button label={content.label} busy={busy} onPress={onConfirm} /><Button secondary label="Go back" disabled={busy} onPress={onClose} /></>}><Text style={s.body}>{content.body}</Text>{children}<Notice error={error} /></ContextSurface>;
}
export const money = (price: number) => `${price.toLocaleString("en-US")} MMK`;
export const shortDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Yangon",
  });
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  container: { flex: 1, width: "100%", maxWidth: 600, alignSelf: "center" },
  top: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: "800",
    color: colors.navy,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  content: { paddingHorizontal: 24, paddingBottom: 28, gap: 14 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.2,
    color: colors.gold,
    marginTop: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1,
    fontWeight: "700",
    color: colors.navy,
  },
  body: { fontSize: 14, lineHeight: 22, color: colors.muted },
  caption: { fontSize: 12, lineHeight: 18, color: colors.muted },
  strong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.navy,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    minHeight: 36,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.4,
  },
  link: { fontSize: 12, fontWeight: "600", color: "#907035" },
  card: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonText: { fontSize: 14, fontWeight: "700", color: colors.white },
  secondary: { borderWidth: 1, borderColor: colors.line },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
    minHeight: 70,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.navy },
  tabs: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  tab: { flex: 1, alignItems: "center", gap: 5, minHeight: 50, paddingHorizontal: 2 },
  tabText: { fontSize: 10, color: colors.muted, textAlign: "center" },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  notice: { gap: 10, paddingVertical: 12 },
  footer: {
    padding: 18,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  scrim: {
    flex: 1,
    backgroundColor: "#11172D88",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    padding: 24,
    gap: 18,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.cream,
  },
  pillText: {
    color: "#907035",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  line: { height: 1, backgroundColor: colors.line },
  stat: { fontSize: 26, fontWeight: "700", color: colors.navy },
  stats: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  statCell: { flex: 1, gap: 5 },
  photo: { width: 64, height: 64, borderRadius: 32 },
  split: { flexDirection: "row", alignItems: "center", gap: 14 },
  choice: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  selected: { borderColor: colors.gold, backgroundColor: colors.cream },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  empty: { padding: 24, alignItems: "center", gap: 14 },
  progress: {
    height: 5,
    backgroundColor: colors.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: 5, backgroundColor: colors.gold, borderRadius: 3 },
});
