import { useCallback } from "react";
import { router } from "expo-router";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useBooking } from "@/booking/provider";
import { dateKey, isSlotAvailable } from "@/booking/domain";
import { useResource } from "@/booking/use-resource";
import { PrimaryButton } from "@/components/auth/ui/auth-button";
import {
  Body,
  Entrance,
  Feedback,
  Frame,
  Heading,
  LinkButton,
  colors,
  courtImage,
  ui,
} from "./ui";
export function EntryScreen() {
  const { api } = useAuth(),
    booking = useBooking(),
    date = dateKey();
  const load = useCallback(
    (signal: AbortSignal) => api.getCourtAvailability(date, { signal }),
    [api, date],
  );
  const resource = useResource(load, `entry:${date}:${booking.revision}`),
    data = resource.data;
  const disabled =
    booking.restoring ||
    (!booking.pending &&
      (!data?.courts.some((c) => c.status === "available") ||
        resource.loading));
  const periods = [
    { label: "Morning", from: 0, to: 720 },
    { label: "Afternoon", from: 720, to: 1020 },
    { label: "Evening", from: 1020, to: 1440 },
  ].map((period) => {
    const slots =
      data?.slots.filter(
        (s) => s.startMinute >= period.from && s.startMinute < period.to,
      ) || [];
    const times = [
      ...new Map(slots.map((s) => [s.startMinute, s])).values(),
    ].sort((a, b) => a.startMinute - b.startMinute);
    return {
      ...period,
      hours: times.length
        ? `${times[0].label} – ${times.at(-1)!.time.split(" — ")[1]}`
        : "",
      count: slots.filter(isSlotAvailable).length,
    };
  });
  return (
    <Frame title="Book a Court" testID="booking-entry" navigation>
      <View style={styles.sport}>
        <Text style={styles.sportText}>Badminton</Text>
      </View>
      <Entrance>
        <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
          <Image source={courtImage} contentFit="cover" style={styles.hero} />
          <View style={styles.details}>
            <Heading>ZAWANA Sports Hub</Heading>
            <Body>Indoor Badminton Courts</Body>
            <View style={styles.rule} />
            <View style={ui.between}>
              <View>
                <Text style={styles.feature}>
                  {data ? `${data.courts.length} Courts` : "Courts"}
                </Text>
                <Text style={ui.small}>Professional Grade</Text>
              </View>
              <View>
                <Text style={styles.feature}>Facility Hours</Text>
                <Text style={ui.small}>
                  {data
                    ? `${data.openingTime} – ${data.closingTime}`
                    : "Loading…"}
                </Text>
              </View>
            </View>
            <View
              style={[
                ui.primary,
                { marginTop: 10, opacity: disabled ? 0.55 : 1 },
              ]}
            >
              <PrimaryButton
                label={
                  booking.pending ? "Recover Reservation" : "Select Date & Time"
                }
                onPress={() =>
                  router.push(
                    booking.pending
                      ? "/(member)/book/review"
                      : "/(member)/book/dates",
                  )
                }
                disabled={disabled}
                testID="booking-primary"
              />
            </View>
          </View>
        </View>
      </Entrance>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        onRetry={resource.retry}
        empty={
          data && !data.courts.length
            ? "No courts are currently listed. Please contact ZAWANA staff."
            : undefined
        }
      />
      {data?.courts.length ? (
        <>
          <Text style={styles.sectionTitle}>Today’s Availability</Text>
          <View style={styles.periods}>
            {periods.map((p) => (
              <View key={p.label} style={styles.period}>
                <Text style={styles.feature}>{p.label}</Text>
                <Text style={styles.hours}>{p.hours}</Text>
                <Text style={styles.hours}>{p.count} available slots</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      {booking.notice ? <Body>{booking.notice}</Body> : null}
      <LinkButton
        label="View My Bookings →"
        onPress={() => router.push("/(member)/bookings")}
      />
    </Frame>
  );
}
const styles = StyleSheet.create({
  sport: {
    backgroundColor: colors.navy,
    padding: 15,
    borderRadius: 13,
    alignItems: "center",
  },
  sportText: { color: "white", fontSize: 16, fontWeight: "600" },
  hero: { width: "100%", height: 210 },
  details: { padding: 16, gap: 7 },
  rule: { height: 1, backgroundColor: "#EEEFF4", marginVertical: 8 },
  feature: { color: colors.navy, fontSize: 14, fontWeight: "700" },
  sectionTitle: { color: colors.navy, fontSize: 19, fontWeight: "700" },
  periods: { flexDirection: "row", gap: 8 },
  period: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E7E9F0",
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 5,
    alignItems: "center",
    gap: 5,
  },
  hours: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 15,
  },
});
