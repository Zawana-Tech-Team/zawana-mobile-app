import { useCallback, useEffect, useRef } from "react";
import { router, useFocusEffect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { dateLabel } from "@/booking/domain";
import { isBookingDateAllowed } from "@/booking/date-policy";
import { useBookingDateWindow } from "@/booking/use-booking-date-window";
import { useBooking } from "@/booking/provider";
import { useResource } from "@/booking/use-resource";
import { SelectionPressable } from "./selection-pressable";
import { Feedback, LinkButton } from "./ui";
import { JourneyEntrance, JourneyFrame, journeyColors, journeyStyles } from "./journey-frame";

export function DateScreen() {
  const { api } = useAuth();
  const booking = useBooking();
  const { month, today, lastDate } = useBookingDateWindow();
  const navigating = useRef(false);
  useFocusEffect(useCallback(() => { navigating.current = false; }, []));
  const { dates, setDates, pending, restoring } = booking;
  useEffect(() => {
    if (!pending && !restoring) {
      const permitted = dates.filter(date => isBookingDateAllowed(date));
      if (permitted.length !== dates.length) setDates(permitted);
    }
  }, [dates, setDates, pending, restoring, today]);
  const load = useCallback((signal: AbortSignal) => api.getCourtMonth(month, { signal }), [api, month]);
  const resource = useResource(load, `${month}:${booking.revision}`);
  const data = resource.data;
  const offset = new Date(`${month}-01T12:00:00Z`).getUTCDay();
  const toggle = (date: string) => {
    if (!isBookingDateAllowed(date)) return;
    booking.setDates(booking.dates.includes(date)
      ? booking.dates.filter(d => d !== date) : [...booking.dates, date]);
  };
  const canContinue = !!data && dates.length > 0 && dates.every(date => date >= today && date <= lastDate) && !pending && !restoring;
  return (
    <JourneyFrame step={1} title="Book a Court" subtitle="Choose your preferred playing date"
      testID="booking-dates" actionLabel="Continue" disabled={!canContinue}
      note={dates.length ? `${dates.length === 1 ? dateLabel(dates[0], false) : `${dates.length} dates selected`} · Choose a floor next` : "Select a date to continue"}
      action={() => {
        if (!canContinue || navigating.current || !dates.every(date => isBookingDateAllowed(date))) return;
        navigating.current = true;
        router.push("/(member)/book/times");
      }}>
      <JourneyEntrance>
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <Text style={styles.month}>{new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</Text>
            <Text style={styles.thisMonth}>THIS MONTH</Text>
          </View>
          <View style={styles.weekdays}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <Text key={index} style={styles.weekday}>{day}</Text>)}
          </View>
          <Feedback loading={resource.loading} error={resource.error} onRetry={resource.retry} />
          {data ? (
            <View style={styles.calendar}>
              {Array.from({ length: offset }, (_, i) => <View key={`blank-${i}`} style={styles.cell} />)}
              {data.days.filter(day => day.date.startsWith(`${month}-`)).map(day => {
                const selected = dates.includes(day.date);
                const disabled = pending || restoring || day.date < today || day.date > lastDate || (!selected && (day.date < data.today || !day.available));
                return (
                  <SelectionPressable key={day.date} selected={selected} restColor="transparent" selectedColor="transparent"
                    disabled={disabled} onPress={() => toggle(day.date)} style={styles.cell}
                    accessibilityRole="button" accessibilityLabel={`${dateLabel(day.date)}, ${day.availableSlots} available slots`}
                    accessibilityState={{ selected, disabled }} testID={`date-${day.date}`}>
                    <View style={styles.day}>
                      <View style={[StyleSheet.absoluteFill, { borderRadius: 999, backgroundColor: selected ? journeyColors.navy : "transparent" }]} />
                      <Text style={[styles.dayText, disabled && styles.disabled, selected && styles.selectedText]}>{+day.date.slice(-2)}</Text>
                    </View>
                  </SelectionPressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </JourneyEntrance>
      <JourneyEntrance delay={60}>
        <View style={journeyStyles.notice}>
          <Text style={journeyStyles.strong}>Bookings are available for this month only.</Text>
          <Text style={journeyStyles.body}>Today through {new Date(`${lastDate}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}{"\n"}Facility timezone · Asia/Yangon</Text>
        </View>
      </JourneyEntrance>
      {dates.length > 1 ? <View style={styles.chips}>{dates.map(date => (
        <SelectionPressable key={date} onPress={() => toggle(date)} disabled={pending || restoring}
          restColor={journeyColors.soft} style={styles.chip} accessibilityRole="button" accessibilityLabel={`Remove ${dateLabel(date)}`}>
          <Text style={journeyStyles.caption}>{dateLabel(date, false)} ×</Text>
        </SelectionPressable>
      ))}</View> : null}
      {pending ? <LinkButton label="Recover pending reservation" onPress={() => router.replace("/(member)/book/review")} /> : null}
      {booking.notice ? <Text style={journeyStyles.body}>{booking.notice}</Text> : null}
    </JourneyFrame>
  );
}
const styles = StyleSheet.create({
  calendarCard: { borderWidth: 1, borderColor: journeyColors.outline, borderRadius: 22, padding: 14, paddingBottom: 18, gap: 16 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  month: { fontSize: 19, lineHeight: 25, fontWeight: "800", color: journeyColors.navy },
  thisMonth: { color: journeyColors.muted, fontSize: 9, fontWeight: "700" },
  weekdays: { flexDirection: "row", marginTop: 3 },
  weekday: { flex: 1, textAlign: "center", color: journeyColors.muted, fontSize: 12, lineHeight: 18 },
  calendar: { flexDirection: "row", flexWrap: "wrap", rowGap: 3 },
  cell: { width: "14.2857%", minHeight: 44, alignItems: "center", justifyContent: "center" },
  day: { width: 35, height: 35, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 15, color: journeyColors.navy },
  selectedText: { color: "#FFFFFF", fontWeight: "700" },
  disabled: { color: journeyColors.faint },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 10, paddingHorizontal: 12, minHeight: 44, justifyContent: "center" },
});
