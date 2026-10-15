import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Image } from "expo-image";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useBooking } from "@/booking/provider";
import { useResource } from "@/booking/use-resource";
import {
  dateLabel,
  isSlotAvailable,
  money,
  slotStatusLabel,
  total,
} from "@/booking/domain";
import { SelectionPressable } from "./selection-pressable";
import {
  Body,
  Feedback,
  Frame,
  Heading,
  Legend,
  LinkButton,
  colors,
  courtImage,
  ui,
} from "./ui";
export function TimeScreen() {
  const { width } = useWindowDimensions();
  const slotWidth = Math.floor((Math.min(width, 460) - 56) / 3);
  const courtWidth = Math.max(80, (Math.min(width, 460) - 70) / 4);
  const { api } = useAuth(),
    booking = useBooking();
  const { refresh } = booking;
  const [active, setActive] = useState(""),
    [courtId, setCourtId] = useState("");
  const date = booking.dates.includes(active) ? active : booking.dates[0] || "";
  const load = useCallback(
    (signal: AbortSignal) =>
      date
        ? api.getCourtAvailability(date, { signal })
        : Promise.reject(new Error("Select a date first.")),
    [api, date],
  );
  const resource = useResource(load, `${date}:${booking.revision}`, !!date),
    data = resource.data;
  useEffect(() => {
    if (data) refresh(data);
  }, [data, refresh]);
  const court =
    data?.courts.find((c) => c.id === courtId) ||
    data?.courts.find((c) => c.status === "available") ||
    data?.courts[0];
  const slots = data?.slots.filter((s) => s.courtId === court?.id) || [];
  return (
    <Frame
      title="Select Court & Time"
      testID="booking-times"
      actionLabel={`Add to Booking${booking.slots.length ? ` (${booking.slots.length})` : ""}`}
      action={() => router.push("/(member)/book/summary")}
      disabled={!booking.slots.length || booking.pending || booking.restoring}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontal}
      >
        {booking.dates.map((d) => (
          <SelectionPressable
            selected={d === date}
            restColor={colors.soft}
            key={d}
            accessibilityRole="button"
            accessibilityState={{ selected: d === date }}
            onPress={() => setActive(d)}
            style={[styles.date, d === date && styles.selected]}
          >
            <Text style={[styles.dateText, d === date && styles.white]}>
              {dateLabel(d, false)}
            </Text>
          </SelectionPressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(member)/book/dates")}
          style={styles.date}
        >
          <Text style={styles.dateText}>＋ Add Date</Text>
        </Pressable>
      </ScrollView>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        onRetry={resource.retry}
      />
      {data ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontal}
          >
            {data.courts.map((c) => (
              <SelectionPressable
                selected={c.id === court?.id}
                restColor={colors.soft}
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${c.status}`}
                accessibilityState={{
                  selected: c.id === court?.id,
                  disabled: c.status !== "available",
                }}
                disabled={c.status !== "available"}
                onPress={() => setCourtId(c.id)}
                testID={`court-${c.id}`}
                style={[
                  styles.court,
                  { width: courtWidth },
                  c.id === court?.id && styles.selected,
                  c.status !== "available" && { opacity: 0.45 },
                ]}
              >
                <Image
                  source={courtImage}
                  contentFit="cover"
                  style={[styles.image, { width: courtWidth - 10, height: 90 }]}
                />
                <Text
                  style={[styles.courtName, c.id === court?.id && styles.white]}
                >
                  {c.name}
                </Text>
                {c.id === court?.id ? (
                  <View style={styles.check}>
                    <Text style={styles.dateText}>✓</Text>
                  </View>
                ) : null}
              </SelectionPressable>
            ))}
          </ScrollView>
          <View style={{ gap: 4 }}>
            <Heading>Time Slots</Heading>
            <Body>
              {court?.name} · {dateLabel(date)}
            </Body>
            <Text style={ui.small}>
              Each session is one hour · Prices in MMK
            </Text>
          </View>
          <View style={styles.grid}>
            {slots.map((slot) => {
              const available = isSlotAvailable(slot);
              const status = slotStatusLabel(slot.status, slot.reason);
              const classSession = status === "Class";
              const reserved = status === "Reserved";
              const selected =
                available && booking.slots.some((s) => s.id === slot.id);
              return (
                <SelectionPressable
                  selected={selected}
                  restColor={available ? colors.paper : colors.soft}
                  key={slot.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.time}, ${status}, ${money(slot.price)}`}
                  accessibilityHint={
                    slot.reason && slot.reason !== status
                      ? slot.reason
                      : undefined
                  }
                  accessibilityState={{
                    selected,
                    disabled: !available || booking.pending,
                  }}
                  disabled={!available || booking.pending}
                  onPress={() => booking.toggle(slot, data.maxSelections)}
                  testID={`slot-${slot.startMinute}`}
                  style={[
                    styles.slot,
                    { width: slotWidth },
                    selected && styles.selected,
                    !available && styles.unavailable,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotTime,
                      selected && styles.white,
                      !available && styles.disabled,
                    ]}
                  >
                    {slot.label}
                  </Text>
                  {available ? (
                    <Text style={[styles.price, selected && styles.white]}>
                      {money(slot.price)}
                    </Text>
                  ) : (
                    <View
                      style={[
                        styles.statusBadge,
                        classSession && styles.classBadge,
                        reserved && styles.reservedBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          classSession && styles.classText,
                          reserved && styles.reservedText,
                        ]}
                      >
                        {status}
                      </Text>
                    </View>
                  )}
                </SelectionPressable>
              );
            })}
          </View>
          {!slots.some(isSlotAvailable) ? (
            <Body>
              No sessions are available for this court and date. Choose another
              court or date.
            </Body>
          ) : null}
          <Legend />
          <Text style={ui.small}>
            Class, booked and reserved sessions are unavailable for booking.
          </Text>
          <View style={ui.between}>
            <Body>
              {booking.slots.length} selected · {booking.slots.length} hours
            </Body>
            <Text style={styles.dateText}>{money(total(booking.slots))}</Text>
          </View>
          {booking.slots.length >= data.maxSelections ? (
            <Body>
              You have reached the {data.maxSelections}-session limit.
            </Body>
          ) : null}
          <LinkButton label="Refresh availability" onPress={resource.retry} />
        </>
      ) : null}
      {booking.notice ? <Body>{booking.notice}</Body> : null}
      {!date ? (
        <LinkButton
          label="Choose dates"
          onPress={() => router.replace("/(member)/book/dates")}
        />
      ) : null}
    </Frame>
  );
}
const styles = StyleSheet.create({
  horizontal: { gap: 10 },
  date: {
    minHeight: 58,
    minWidth: 110,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: colors.soft,
  },
  dateText: { fontSize: 14, color: colors.navy, fontWeight: "600" },
  selected: { backgroundColor: colors.navy, borderColor: colors.navy },
  white: { color: "#FFFFFF" },
  court: {
    width: 100,
    borderRadius: 15,
    backgroundColor: colors.soft,
    padding: 5,
    gap: 7,
    paddingBottom: 11,
  },
  image: { width: 90, height: 100, borderRadius: 11 },
  courtName: {
    fontSize: 13,
    textAlign: "center",
    color: colors.muted,
    fontWeight: "500",
  },
  check: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: {
    width: "31.7%",
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 3,
    gap: 4,
  },
  slotTime: { fontSize: 14, color: colors.navy },
  price: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.muted,
    textAlign: "center",
  },
  unavailable: { backgroundColor: colors.soft, borderColor: colors.soft },
  disabled: { color: "#7E879C" },
  statusBadge: {
    backgroundColor: "#E8EBF2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    color: "#58637C",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },
  classBadge: { backgroundColor: "#EEE7FA" },
  classText: { color: "#70509D" },
  reservedBadge: { backgroundColor: "#FFF0D2" },
  reservedText: { color: "#94621A" },
});
