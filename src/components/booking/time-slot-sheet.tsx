import { useCallback, useEffect } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBooking } from "@/booking/provider";
import { dateLabel, isSlotAvailable, money, slotStatusLabel, total } from "@/booking/domain";
import { isBookingDateAllowed } from "@/booking/date-policy";
import type { Availability, Court } from "@/booking/types";
import { Feedback } from "./ui";
import { courtFloor } from "./court-presentation";
import { JourneyButton, journeyColors, journeyStyles } from "./journey-frame";
import { SelectionPressable } from "./selection-pressable";
import { journeyMotion } from "./journey-motion";

const timeLabel = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export function TimeSlotSheet({ court, date, data, loading, error, onRetry, onDismiss, onContinue }: {
  court: Court; date: string; data: Availability | null; loading: boolean; error: string | null;
  onRetry: () => void; onDismiss: () => void; onContinue: () => void;
}) {
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const slotWidth = Math.floor((Math.min(width, 480) - 48 - 8) / 2);
  const maxHeight = Math.min(height - insets.top - 48, height * (height < 700 ? 0.84 : 0.68));
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const closing = useSharedValue(false);
  const floor = courtFloor(court);
  const slots = data?.slots.filter(s => s.courtId === court.id) || [];
  const enabled = !!data && data.courts.some(c => c.id === court.id && c.status === "available") &&
    !booking.pending && !booking.restoring && isBookingDateAllowed(date);
  const canContinue = !!data && !loading && !error && booking.slots.length > 0 &&
    !booking.pending && !booking.restoring && booking.dates.every(d => isBookingDateAllowed(d));

  useEffect(() => {
    progress.set(withSpring(1, journeyMotion.sheet));
    return () => { cancelAnimation(progress); cancelAnimation(drag); };
  }, [progress, drag]);

  const close = useCallback((continueBooking = false) => {
    if (closing.get()) return;
    closing.set(true);
    const done = continueBooking ? onContinue : onDismiss;
    progress.set(withTiming(0, journeyMotion.dismiss, finished => {
      if (finished) runOnJS(done)();
    }));
  }, [progress, closing, onDismiss, onContinue]);
  const dismiss = useCallback(() => close(), [close]);
  const gesture = Gesture.Pan().activeOffsetY(8)
    .onUpdate(event => { drag.set(Math.max(0, event.translationY)); })
    .onEnd(event => {
      if (event.translationY > 80 || event.velocityY > 700) runOnJS(dismiss)();
      else drag.set(withSpring(0, journeyMotion.sheet));
    });
  const backdrop = useAnimatedStyle(() => ({ opacity: progress.get() * 0.34 }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * height + drag.get() }] }));
  return (
    <Modal transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss} visible>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss time selection" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { maxHeight, paddingBottom: Math.max(insets.bottom, 16) }, sheet]}
          accessibilityViewIsModal onAccessibilityEscape={dismiss} testID="booking-time-sheet">
          <GestureDetector gesture={gesture}>
            <View style={styles.handleArea} accessible accessibilityRole="button" accessibilityLabel="Swipe down to close time selection" onAccessibilityTap={dismiss}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          <View style={styles.headingRow}>
            <Text accessibilityRole="header" style={styles.title}>{court.name}{floor ? ` — ${floor}` : ""}</Text>
            <Pressable onPress={dismiss} style={styles.close} accessibilityRole="button" accessibilityLabel="Close available times" testID="booking-sheet-close">
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={journeyStyles.body}>{dateLabel(date)}</Text>
            <View style={styles.rate}>
              <Text style={journeyStyles.strong}>Hourly court booking</Text>
              <Text style={journeyStyles.caption}>Each session is one hour · Prices in MMK</Text>
            </View>
            <Feedback loading={loading} error={error} onRetry={onRetry} />
            {!isBookingDateAllowed(date) ? <Text style={journeyStyles.body}>This date is outside the booking window. Close this sheet to update your dates.</Text> : null}
            {data ? (
              <View style={styles.grid}>
                {slots.map(slot => {
                  const available = enabled && isSlotAvailable(slot);
                  const selected = available && booking.slots.some(s => s.id === slot.id);
                  const status = slotStatusLabel(slot.status, slot.reason);
                  return (
                    <SelectionPressable key={slot.id} selected={selected}
                      selectedColor={journeyColors.navy} restColor={available ? "#FFFFFF" : journeyColors.soft}
                      style={[styles.slot, { width: slotWidth }, selected && styles.selected]}
                      disabled={!available} onPress={() => booking.toggle(slot, data.maxSelections)}
                      accessibilityRole="button" accessibilityState={{ selected, disabled: !available }}
                      accessibilityLabel={`${slot.time}, ${status}, ${money(slot.price)}`}
                      accessibilityHint={slot.reason || undefined} testID={`slot-${slot.startMinute}`}>
                      <Text style={[styles.time, !available && styles.disabledText, selected && styles.white]}>{timeLabel(slot.startMinute)}–{timeLabel(slot.endMinute)}</Text>
                      <Text style={[styles.status, selected && styles.white]}>{selected ? "Selected" : available ? money(slot.price) : status}</Text>
                    </SelectionPressable>
                  );
                })}
              </View>
            ) : null}
            {data && !slots.some(isSlotAvailable) ? <Text style={journeyStyles.body}>No available times for this court and date. Your other court choices are retained.</Text> : null}
            {booking.notice ? <Text accessibilityLiveRegion="polite" style={journeyStyles.body}>{booking.notice}</Text> : null}
            {data && booking.slots.length >= data.maxSelections ? <Text style={journeyStyles.body}>You have reached the {data.maxSelections}-session limit.</Text> : null}
            <Pressable onPress={onRetry} accessibilityRole="button" style={styles.refresh}><Text style={journeyStyles.caption}>Refresh availability</Text></Pressable>
          </ScrollView>
          <View style={styles.footer}>
            <Text accessibilityLiveRegion="polite" style={journeyStyles.caption}>
              {booking.slots.length ? `${booking.slots.length} hours selected · ${money(total(booking.slots))}` : "Select one or more available slots"}
            </Text>
            <JourneyButton label="Continue" disabled={!canContinue} onPress={() => { if (canContinue) close(true); }} testID="booking-sheet-continue" />
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  backdrop: { backgroundColor: journeyColors.navy },
  sheet: { width: "100%", maxWidth: 480, backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  handleArea: { height: 28, alignItems: "center", justifyContent: "center" },
  handle: { width: 48, height: 4, backgroundColor: journeyColors.disabled, borderRadius: 2 },
  headingRow: { paddingLeft: 24, paddingRight: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: journeyColors.navy, fontSize: 20, lineHeight: 27, fontWeight: "800" },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  closeText: { color: journeyColors.navy, fontSize: 28 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8, gap: 16 },
  scroll: { flexShrink: 1 },
  rate: { borderRadius: 12, padding: 14, backgroundColor: journeyColors.soft, gap: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { borderRadius: 12, borderWidth: 1, borderColor: journeyColors.outline, minHeight: 62, padding: 9, alignItems: "center", justifyContent: "center", gap: 4 },
  selected: { borderColor: journeyColors.navy },
  time: { fontSize: 12, lineHeight: 18, fontWeight: "700", color: journeyColors.navy, textAlign: "center" },
  status: { fontSize: 11, lineHeight: 16, color: journeyColors.muted, textAlign: "center" },
  white: { color: "#FFFFFF" }, disabledText: { color: journeyColors.faint },
  refresh: { minHeight: 44, justifyContent: "center" },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 12 },
});
