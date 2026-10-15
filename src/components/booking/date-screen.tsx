import { useCallback, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { dateKey, dateLabel } from "@/booking/domain";
import { useBooking } from "@/booking/provider";
import { SelectionPressable } from "./selection-pressable";
import { useResource } from "@/booking/use-resource";
import {
  Body,
  Feedback,
  Frame,
  Heading,
  Legend,
  LinkButton,
  colors,
  ui,
} from "./ui";
const shiftMonth = (month: string, delta: number) => {
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
};
export function DateScreen() {
  const { api } = useAuth(),
    booking = useBooking();
  const [month, setMonth] = useState(
    () => booking.dates[0]?.slice(0, 7) || dateKey().slice(0, 7),
  );
  const load = useCallback(
    (signal: AbortSignal) => api.getCourtMonth(month, { signal }),
    [api, month],
  );
  const resource = useResource(load, `${month}:${booking.revision}`),
    data = resource.data;
  const offset = new Date(`${month}-01T12:00:00Z`).getUTCDay();
  const toggle = (date: string) =>
    booking.setDates(
      booking.dates.includes(date)
        ? booking.dates.filter((d) => d !== date)
        : [...booking.dates, date],
    );
  const currentMonth = (data?.today || dateKey()).slice(0, 7);
  return (
    <Frame
      title="Select Date(s)"
      testID="booking-dates"
      actionLabel="Continue"
      action={() => router.push("/(member)/book/times")}
      disabled={!booking.dates.length || booking.pending || booking.restoring}
    >
      <View style={ui.between}>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= currentMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={[styles.arrow, month <= currentMonth && { opacity: 0.3 }]}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>
          {new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </Text>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, 1))}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={styles.arrow}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        onRetry={resource.retry}
      />
      {data ? (
        <View style={styles.calendar}>
          {Array.from({ length: offset }, (_, i) => (
            <View key={`blank-${i}`} style={styles.cell} />
          ))}
          {data.days.map((day) => {
            const selected = booking.dates.includes(day.date),
              disabled =
                booking.pending ||
                (!selected && (day.date < data.today || !day.available));
            return (
              <SelectionPressable selected={selected} selectedColor="transparent" restColor="transparent"
                key={day.date}
                onPress={() => toggle(day.date)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${dateLabel(day.date)}, ${day.availableSlots} available slots`}
                accessibilityState={{ selected, disabled }}
                testID={`date-${day.date}`}
                style={styles.cell}
              >
                <View style={[styles.day, { overflow: "hidden" }]}>
                  <View style={[StyleSheet.absoluteFill,{backgroundColor:selected?colors.navy:colors.paper,borderRadius:12}]} />
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.disabled,
                      selected && styles.white,
                    ]}
                  >
                    {+day.date.slice(-2)}
                  </Text>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: selected
                          ? colors.gold
                          : disabled
                            ? "#D4D7E0"
                            : colors.blue,
                      },
                    ]}
                  />
                </View>
              </SelectionPressable>
            );
          })}
        </View>
      ) : null}
      <Legend surface />
      <Heading>Selected Date(s)</Heading>
      <View style={styles.chips}>
        {booking.dates.map((date) => (
          <Pressable
            key={date}
            onPress={() => toggle(date)}
            disabled={booking.pending}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${dateLabel(date)}`}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{dateLabel(date)} ×</Text>
          </Pressable>
        ))}
      </View>
      {!booking.dates.length ? (
        <Body>Select one or more available dates.</Body>
      ) : null}
      {booking.pending ? (
        <LinkButton
          label="Recover pending reservation"
          onPress={() => router.replace("/(member)/book/review")}
        />
      ) : null}
    </Frame>
  );
}
const styles = StyleSheet.create({
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: { fontSize: 32, lineHeight: 37, color: colors.navy },
  month: { fontSize: 22, fontWeight: "700", color: colors.navy },
  weekdays: { flexDirection: "row", marginTop: 6 },
  weekday: { flex: 1, textAlign: "center", color: colors.muted, fontSize: 13 },
  calendar: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  cell: {
    width: "14.2857%",
    height: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    width: "90%",
    height: 53,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  selected: { backgroundColor: colors.navy },
  dayText: { fontSize: 17, color: colors.navy },
  white: { color: "#FFFFFF", fontWeight: "700" },
  disabled: { color: "#B4B9C7" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexBasis: "48%",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  chipText: { color: colors.navy, fontSize: 14 },
});
