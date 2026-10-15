import { router } from "expo-router";
import { StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { useBooking } from "@/booking/provider";
import { money, total } from "@/booking/domain";
import { SelectionCard } from "./selection-card";
import { Body, Entrance, Frame, colors, ui } from "./ui";
export function SummaryScreen() {
  const booking = useBooking();
  return (
    <Frame
      title="Booking Summary"
      testID="booking-summary"
      actionLabel="Continue to Review"
      action={() => router.push("/(member)/book/review")}
      disabled={!booking.slots.length && !booking.pending}
    >
      {booking.notice ? <Body>{booking.notice}</Body> : null}
      <Entrance>
        <View style={{ gap: 14 }}>
          {booking.slots.map((slot, index) => (
            <SelectionCard
              key={slot.id}
              slot={slot}
              index={index}
              onRemove={
                booking.pending ? undefined : () => booking.remove(slot.id)
              }
            />
          ))}
        </View>
      </Entrance>
      {!booking.slots.length ? (
        <Body>
          {booking.pending
            ? "A reservation request is awaiting recovery. Continue to Review to check its status."
            : "Your booking is empty. Add dates and slots to continue."}
        </Body>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(member)/book/dates")}
        testID="booking-add-dates"
        style={styles.add}
      >
        <Text style={styles.addText}>＋ Add More Dates</Text>
      </Pressable>
      <Body>Notes (Optional)</Body>
      <TextInput
        multiline
        value={booking.notes}
        onChangeText={booking.setNotes}
        maxLength={200}
        editable={!booking.pending && !booking.busy}
        accessibilityLabel="Booking notes"
        placeholder="Add any special request…"
        placeholderTextColor={colors.muted}
        textAlignVertical="top"
        style={styles.notes}
        testID="booking-notes"
      />
      <Text style={[ui.small, { textAlign: "right" }]}>
        {booking.notes.length}/200
      </Text>
      <View style={ui.between}>
        <Body>{booking.slots.length} one-hour sessions</Body>
        <Text style={styles.total}>{money(total(booking.slots))}</Text>
      </View>
    </Frame>
  );
}
const styles = StyleSheet.create({
  add: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: colors.navy, fontSize: 17, fontWeight: "600" },
  notes: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 14,
    padding: 16,
    color: colors.navy,
    fontSize: 15,
  },
  total: { color: colors.navy, fontSize: 18, fontWeight: "700" },
});
