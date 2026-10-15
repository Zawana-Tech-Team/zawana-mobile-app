import { useCallback, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Alert, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useBooking } from "@/booking/provider";
import { dateLabel, money, statusLabel } from "@/booking/domain";
import { sanitizeAuthError } from "@/auth/errors";
import { useResource } from "@/booking/use-resource";
import {
  Body,
  Feedback,
  Frame,
  Heading,
  LinkButton,
  PaymentNotice,
  courtImage,
  ui,
} from "./ui";
export function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { api } = useAuth(),
    booking = useBooking();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const load = useCallback(
    (signal: AbortSignal) => api.getCourtBooking(id || "", { signal }),
    [api, id],
  );
  const resource = useResource(load, `detail:${id}:${booking.revision}`),
    row = resource.data;
  const cancel = () => {
    if (busy) return;
    Alert.alert(
      "Cancel reservation?",
      "This releases your court and preserves the reservation history.",
      [
        { text: "Keep reservation", style: "cancel" },
        {
          text: "Cancel reservation",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            setError(null);
            void api
              .cancelCourtBooking(id)
              .then(() => {
                booking.invalidate();
                resource.retry();
              })
              .catch((e) => setError(sanitizeAuthError(e).message))
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };
  const cancellable =
    row &&
    ["pending", "confirmed", "CONFIRMED"].includes(row.status) &&
    row.paymentStatus === "pending";
  return (
    <Frame
      title="Booking Details"
      testID="booking-details"
      actionLabel="My Bookings"
      action={() => router.replace("/(member)/bookings")}
    >
      <Feedback
        loading={resource.loading}
        loadingLabel="Loading your reservation…"
        error={resource.error || error}
        onRetry={resource.retry}
      />
      {row ? (
        <>
          <Image
            source={courtImage}
            contentFit="cover"
            style={{ width: "100%", height: 190, borderRadius: 16 }}
          />
          <Heading>{row.title}</Heading>
          <Body>{row.location}</Body>
          <View style={ui.card}>
            <Body>Booking Reference</Body>
            <Text selectable style={ui.title}>
              {row.code}
            </Text>
            <Body>{dateLabel(row.date)}</Body>
            <Body>{row.time} · 1 hour</Body>
            <View style={ui.between}>
              <Body>Amount</Body>
              <Text style={ui.title}>{money(row.price)}</Text>
            </View>
            <Body>Reservation: {statusLabel(row.status)}</Body>
            <Body>Payment: {statusLabel(row.paymentStatus)}</Body>
            {row.meta ? <Body>Notes: {row.meta}</Body> : null}
          </View>
          {row.paymentStatus === "pending" &&
          !["cancelled", "CANCELLED", "EXPIRED"].includes(row.status) ? (
            <PaymentNotice />
          ) : null}
          {cancellable ? (
            <LinkButton
              label={busy ? "Cancelling…" : "Cancel Reservation"}
              onPress={cancel}
              testID="booking-cancel"
            />
          ) : null}
        </>
      ) : null}
    </Frame>
  );
}
