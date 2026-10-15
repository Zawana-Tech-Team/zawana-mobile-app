import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useBooking } from "@/booking/provider";
import { dateLabel, money, total } from "@/booking/domain";
import { sanitizeAuthError } from "@/auth/errors";
import {
  Body,
  Feedback,
  Frame,
  Heading,
  LinkButton,
  PaymentNotice,
  colors,
  ui,
} from "./ui";
export function ReviewScreen() {
  const booking = useBooking(),
    [error, setError] = useState<string | null>(null);
  const submit = () => {
    setError(null);
    void booking
      .submit()
      .then((result) =>
        router.replace({
          pathname: "/(member)/book/confirmation",
          params: { id: result.booking.id },
        }),
      )
      .catch((failure) => setError(sanitizeAuthError(failure).message));
  };
  return (
    <Frame
      title="Review Booking"
      testID="booking-review"
      actionLabel={
        booking.pending ? "Check Reservation Status" : "Confirm Reservation"
      }
      action={submit}
      busy={booking.busy}
      disabled={
        booking.restoring || (!booking.slots.length && !booking.pending)
      }
    >
      <View style={ui.card}>
        <View style={ui.between}>
          <Heading>Booking Details</Heading>
          {!booking.busy && !booking.pending ? (
            <LinkButton label="Edit" onPress={() => router.back()} />
          ) : null}
        </View>
        {booking.pending ? (
          <Body>
            Your reservation is being checked. Your selection is kept until its
            outcome is known.
          </Body>
        ) : null}
        <View style={styles.sessions}>
          {booking.slots.map((slot, index) => (
            <View
              key={slot.id}
              style={[styles.session, index > 0 && styles.divider]}
            >
              <View style={styles.number}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <View style={ui.copy}>
                <Text style={styles.date}>{dateLabel(slot.date)}</Text>
                <Text style={styles.detail}>{slot.courtName}</Text>
                <Text style={styles.detail}>{slot.time}</Text>
              </View>
              <Text style={styles.price}>{money(slot.price)}</Text>
            </View>
          ))}
        </View>
        {!booking.slots.length && !booking.pending ? (
          <LinkButton
            label="Choose courts and times"
            onPress={() => router.replace("/(member)/book/dates")}
          />
        ) : null}
        {booking.slots.length ? (
          <View style={styles.totals}>
            <View style={ui.between}>
              <Body>Subtotal · {booking.slots.length} hours</Body>
              <Text style={styles.price}>{money(total(booking.slots))}</Text>
            </View>
            <View style={[ui.between, styles.total]}>
              <Text style={styles.totalText}>Total Amount</Text>
              <Text style={styles.totalText}>
                {money(total(booking.slots))}
              </Text>
            </View>
          </View>
        ) : null}
        {booking.notes ? (
          <View style={styles.notes}>
            <Text style={ui.small}>Special request</Text>
            <Text style={styles.detail}>{booking.notes}</Text>
          </View>
        ) : null}
      </View>
      <PaymentNotice />
      <Feedback error={error} />
      {error && !booking.pending ? (
        <LinkButton
          label="Review selected slots"
          onPress={() => router.replace("/(member)/book/times")}
        />
      ) : null}
    </Frame>
  );
}
const styles = StyleSheet.create({
  sessions: {
    borderWidth: 1,
    borderColor: "#EEF0F5",
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  session: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 17,
  },
  divider: { borderTopWidth: 1, borderColor: "#EEF0F5" },
  number: {
    height: 36,
    width: 36,
    borderRadius: 11,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: { fontSize: 20, fontWeight: "700", color: colors.navy },
  date: { fontSize: 14, fontWeight: "700", color: colors.navy },
  detail: { fontSize: 13, lineHeight: 20, color: colors.muted },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
    maxWidth: 90,
    textAlign: "right",
  },
  totals: { gap: 12, marginTop: 12 },
  total: { borderTopWidth: 1, borderColor: colors.outline, paddingTop: 14 },
  totalText: { fontSize: 19, fontWeight: "700", color: colors.navy },
  notes: { gap: 5, paddingTop: 6 },
});
