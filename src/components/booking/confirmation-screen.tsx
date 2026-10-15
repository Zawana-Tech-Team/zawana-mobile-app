import { useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useBooking } from "@/booking/provider";
import { dateLabel, money, statusLabel } from "@/booking/domain";
import { useResource } from "@/booking/use-resource";
import { BrandLogo } from "@/components/auth/ui/brand-logo";
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
export function ConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { api, user } = useAuth(),
    booking = useBooking();
  const load = useCallback(
    (signal: AbortSignal) => api.getCourtBooking(id || "", { signal }),
    [api, id],
  );
  const resource = useResource(load, `confirmation:${id}`);
  // Always acknowledge the live server record; the mutation result supplies the other atomic rows.
  const row =
      resource.data || booking.result?.bookings.find((row) => row.id === id),
    rows = row
      ? booking.result?.booking.id === id
        ? booking.result.bookings.map((b) => (b.id === id ? row : b))
        : [row]
      : [];
  return (
    <Frame
      title="Reservation Saved"
      testID="booking-confirmation"
      actionLabel="View My Bookings"
      action={() => router.replace("/(member)/bookings")}
      disabled={!row}
    >
      <View style={ui.row}>
        <BrandLogo size={65} />
        <View style={ui.copy}>
          <Body>ZAWANA Sports Hub</Body>
          <Text style={ui.title}>{user?.name.split(" ")[0]}</Text>
        </View>
      </View>
      <Feedback
        loading={resource.loading && !row}
        loadingLabel="Loading your reservation…"
        error={resource.error}
        onRetry={resource.retry}
      />
      {row ? (
        <>
          <Entrance>
            <View style={styles.success}>
              <View style={styles.circle}>
                <Text style={styles.tick}>✓</Text>
              </View>
              <Heading>Booking Successful!</Heading>
              <Body>Your court reservation has been saved.</Body>
            </View>
          </Entrance>
          <View style={[ui.card, { backgroundColor: colors.soft }]}>
            <Body>Booking Reference</Body>
            <Text selectable style={styles.reference}>
              {row.code}
            </Text>
          </View>
          <View style={[ui.card, { padding: 14, gap: 5 }]}>
            <Text style={ui.small}>Reservation Status</Text>
            <Text style={styles.status}>{statusLabel(row.status)}</Text>
            <View style={styles.rule} />
            <Text style={ui.small}>Payment Status</Text>
            <Text style={styles.payment}>
              {row.paymentStatus === "pending"
                ? "Pending · due at venue"
                : statusLabel(row.paymentStatus)}
            </Text>
            {row.paymentStatus === "pending" ? (
              <Text style={ui.small}>Arrange payment with ZAWANA staff.</Text>
            ) : null}
          </View>
          {rows.map((b) => (
            <View key={b.id} style={[ui.card, ui.row]}>
              <Image
                source={courtImage}
                contentFit="cover"
                style={styles.image}
              />
              <View style={ui.copy}>
                <Text style={styles.court}>{b.title}</Text>
                <Text style={ui.small}>{dateLabel(b.date)}</Text>
                <Text style={ui.small}>{b.time} · 1 hour</Text>
                <Text style={ui.small}>{money(b.price)}</Text>
                <LinkButton
                  label="View Booking Details →"
                  onPress={() =>
                    router.push({
                      pathname: "/(member)/bookings/[id]",
                      params: { id: b.id },
                    })
                  }
                />
              </View>
            </View>
          ))}
          <LinkButton
            label="Back to Home"
            onPress={() => router.replace("/(member)/home")}
          />
        </>
      ) : null}
    </Frame>
  );
}
const styles = StyleSheet.create({
  success: { alignItems: "center", gap: 8, paddingVertical: 4 },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tick: { fontSize: 58, color: "white" },
  reference: { fontSize: 18, color: colors.navy, fontWeight: "700" },
  rule: { height: 1, backgroundColor: colors.outline, marginVertical: 4 },
  status: { fontSize: 19, color: colors.success, fontWeight: "700" },
  payment: { fontSize: 18, color: colors.goldDark, fontWeight: "700" },
  image: { width: 85, height: 110, borderRadius: 12 },
  court: { fontSize: 17, fontWeight: "700", color: colors.navy },
});
