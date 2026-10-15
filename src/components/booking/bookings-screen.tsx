import { useCallback, useState } from "react";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useBooking } from "@/booking/provider";
import { bookingGroup, dateLabel, money, statusLabel } from "@/booking/domain";
import { useResource } from "@/booking/use-resource";
import {
  Body,
  Feedback,
  Frame,
  Heading,
  LinkButton,
  colors,
  courtImage,
  ui,
} from "./ui";
export function BookingsScreen() {
  const { api } = useAuth(),
    booking = useBooking(),
    [filter, setFilter] = useState<"upcoming" | "past" | "cancelled">(
      "upcoming",
    );
  const load = useCallback(
    (signal: AbortSignal) => api.getCourtBookings({ signal }),
    [api],
  );
  const resource = useResource(load, `bookings:${booking.revision}`);
  const rows = (resource.data || []).filter(
    (b) => b.kind === "court" && bookingGroup(b) === filter,
  );
  return (
    <Frame title="My Bookings" testID="my-bookings" navigation brandHeader>
      <View style={{ gap: 4 }}>
        <Heading>My Bookings</Heading>
        <Body>View and manage all your court bookings.</Body>
      </View>
      <View style={styles.tabs}>
        {(["upcoming", "past", "cancelled"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === value }}
            onPress={() => setFilter(value)}
            style={[styles.tab, filter === value && styles.activeTab]}
          >
            <Text
              style={{
                color: filter === value ? "white" : colors.navy,
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              {statusLabel(value)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Feedback
        loading={resource.loading}
        loadingLabel="Loading your bookings…"
        error={resource.error}
        onRetry={resource.retry}
        empty={
          resource.data && !rows.length
            ? "No reservations here yet. Choose a court to plan your next game."
            : undefined
        }
      />
      {rows.map((b) => (
        <Pressable
          key={b.id}
          accessibilityRole="button"
          accessibilityLabel={`View ${b.title}, ${b.date}, ${b.time}`}
          onPress={() =>
            router.push({
              pathname: "/(member)/bookings/[id]",
              params: { id: b.id },
            })
          }
          testID={`booking-row-${b.id}`}
          style={styles.card}
        >
          <Image source={courtImage} contentFit="cover" style={styles.image} />
          <View style={ui.between}>
            <Text style={styles.title}>{b.title}</Text>
            <View
              style={[
                ui.badge,
                b.status.toUpperCase() === "CONFIRMED" && styles.confirmed,
              ]}
            >
              <Text
                style={[
                  ui.badgeText,
                  b.status.toUpperCase() === "CONFIRMED" &&
                    styles.confirmedText,
                ]}
              >
                {statusLabel(b.status)}
              </Text>
            </View>
          </View>
          <View style={ui.between}>
            <Text style={ui.small}>{b.court?.type || "Badminton court"}</Text>
            <Text style={ui.small}>
              {b.paymentStatus === "pending"
                ? bookingGroup(b) === "cancelled"
                  ? "Unpaid"
                  : "Payment pending"
                : statusLabel(b.paymentStatus)}
            </Text>
          </View>
          <View style={ui.between}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={ui.small}>{dateLabel(b.date)}</Text>
              <Text style={ui.small}>{b.time}</Text>
            </View>
            <Text style={styles.price}>{money(b.price)}</Text>
          </View>
          <View style={styles.details}>
            <Text style={styles.detailsText}>View Details ›</Text>
          </View>
        </Pressable>
      ))}
      <LinkButton label="Refresh bookings" onPress={resource.retry} />
      <Body>Reservations shown here are linked to your ZAWANA account.</Body>
      <LinkButton
        label="Book a Court"
        onPress={() => router.push("/(member)/book")}
      />
    </Frame>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.soft,
    borderRadius: 24,
    padding: 4,
  },
  tab: { flex: 1, minHeight: 44, borderRadius: 22, justifyContent: "center" },
  activeTab: { backgroundColor: colors.navy },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: colors.navy,
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 9,
    elevation: 2,
  },
  image: { width: "100%", height: 114, borderRadius: 10 },
  title: { flex: 1, color: colors.navy, fontWeight: "700", fontSize: 19 },
  confirmed: { backgroundColor: "#E5F6ED" },
  confirmedText: { color: "#16744C" },
  price: { color: colors.goldDark, fontWeight: "700", fontSize: 16 },
  details: {
    backgroundColor: colors.navy,
    minHeight: 44,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsText: { color: "white", fontWeight: "600", fontSize: 14 },
});
