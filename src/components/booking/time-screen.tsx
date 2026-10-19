import { useCallback, useEffect, useRef, useState } from "react";
import { router, Stack, useFocusEffect } from "expo-router";
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { useBooking } from "@/booking/provider";
import { useResource } from "@/booking/use-resource";
import { isBookingDateAllowed } from "@/booking/date-policy";
import { useBookingDateWindow } from "@/booking/use-booking-date-window";
import { dateLabel, money, total } from "@/booking/domain";
import type { Court } from "@/booking/types";
import { SelectionPressable } from "./selection-pressable";
import { Feedback, LinkButton } from "./ui";
import { FloorSelector } from "./floor-selector";
import { CourtPlan } from "./court-plan";
import { bookingFloors, courtFloor, courtsOnFloor, type BookingFloor } from "./court-presentation";
import { DateRibbon, JourneyEntrance, JourneyFrame, journeyColors, journeyStyles } from "./journey-frame";
import { TimeSlotSheet } from "./time-slot-sheet";

export function TimeScreen() {
  const { api } = useAuth();
  const booking = useBooking();
  const { refresh } = booking;
  const { today, lastDate } = useBookingDateWindow();
  const [activeDate, setActiveDate] = useState("");
  const [floor, setFloor] = useState<BookingFloor | null>(null);
  const [stage, setStage] = useState<"floors" | "courts">("floors");
  const [zooming, setZooming] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const transition = useRef(false);
  const navigating = useRef(false);
  const date = booking.dates.includes(activeDate) ? activeDate : booking.dates[0] || "";
  const datesAllowed = !!date && booking.dates.every(d => d >= today && d <= lastDate);
  const load = useCallback((signal: AbortSignal) => date && isBookingDateAllowed(date)
    ? api.getCourtAvailability(date, { signal }) : Promise.reject(new Error("Select a date first.")), [api, date]);
  const resource = useResource(load, `${date}:${today}:${booking.revision}`, datesAllowed);
  const data = resource.data;
  useEffect(() => { if (data) refresh(data); }, [data, refresh]);
  const liveCourt = data?.courts.find(c => c.id === selectedCourt?.id) || selectedCourt;
  const floorCourts = floor && data ? courtsOnFloor(data.courts, floor) : [];
  const canEdit = datesAllowed && !booking.pending && !booking.restoring;
  const onEntered = useCallback(() => {
    transition.current = false;
    setZooming(false);
    setStage("courts");
  }, []);
  const back = useCallback(() => {
    if (zooming) { transition.current = false; setZooming(false); }
    else if (stage === "courts") setStage("floors");
    else if (router.canGoBack()) router.back();
    else router.replace("/(member)/book/dates");
  }, [stage, zooming]);
  useFocusEffect(useCallback(() => {
    navigating.current = false;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stage === "courts" || zooming) { back(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [back, stage, zooming]));
  const chooseFloor = (value: BookingFloor) => {
    if (!canEdit || zooming || !data || !courtsOnFloor(data.courts, value).length) return;
    if (value !== floor) setSelectedCourt(null);
    setFloor(value);
  };
  const chooseCourt = useCallback((court: Court) => {
    if (court.status !== "available") return;
    setSelectedCourt(court);
    setSheetOpen(true);
  }, []);
  const dismissSheet = useCallback(() => setSheetOpen(false), []);
  const continueBooking = useCallback(() => {
    setSheetOpen(false);
    if (navigating.current || !booking.slots.length || booking.pending || booking.restoring || !booking.dates.every(d => isBookingDateAllowed(d))) return;
    navigating.current = true;
    router.push("/(member)/book/summary");
  }, [booking.slots.length, booking.pending, booking.restoring, booking.dates]);
  const enterFloor = () => {
    if (transition.current || !canEdit || !data || !floor || !floorCourts.length) return;
    transition.current = true;
    setZooming(true);
  };
  const isCourts = stage === "courts";
  const title = zooming ? "Enter the arena" : isCourts
    ? selectedCourt ? `${selectedCourt.name} selected` : "Choose your court"
    : floor ? `${floor} selected` : "Choose your floor";
  const subtitle = zooming ? "From the building into your chosen floor"
    : isCourts ? selectedCourt ? "Select times for your highlighted court." : `${floorCourts.length === 4 ? "All four courts together." : "Choose a court on this floor."} Tap a court to choose a time.`
    : floor ? `${floor === "6th Floor" ? "Red" : "Green"} badminton courts${data ? ` · ${floorCourts.length} courts` : ""}`
    : "See the whole arena. Tap a highlighted floor.";
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <JourneyFrame step={isCourts ? 3 : 2} title={title} subtitle={subtitle} testID="booking-times" onBack={back}
        actionLabel={zooming ? "Entering floor…" : isCourts ? selectedCourt ? "View available times" : "Select a court" : floor ? `Enter ${floor}` : "Choose a floor"}
        action={isCourts ? () => { if (liveCourt && canEdit) setSheetOpen(true); } : enterFloor}
        disabled={!canEdit || resource.loading || !!resource.error || zooming || (isCourts ? !liveCourt || liveCourt.status !== "available" || !floorCourts.some(c => c.id === liveCourt.id) : !floor || !floorCourts.length)}
        note={isCourts ? `${floor || ""}${selectedCourt ? ` · ${selectedCourt.name}` : ""}` : floor ? "Selected date is preserved" : "2nd and 6th floors · Badminton only"}>
        {date ? <DateRibbon date={date} floor={isCourts || zooming ? floor || undefined : undefined} onChange={isCourts ? () => setStage("floors") : () => { if (!zooming) router.push("/(member)/book/dates"); }} /> : null}
        {booking.dates.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
            {booking.dates.map(d => <SelectionPressable key={d} selected={date === d} selectedColor={journeyColors.navy} restColor={journeyColors.soft}
              style={styles.dateChip} onPress={() => { if (!zooming) { setActiveDate(d); setSheetOpen(false); } }}
              disabled={zooming} accessibilityRole="button" accessibilityState={{ selected: date === d }}>
              <Text style={[journeyStyles.caption, date === d && styles.white]}>{dateLabel(d, false)}</Text>
            </SelectionPressable>)}
          </ScrollView>
        ) : null}
        {!datesAllowed ? (
          <View style={journeyStyles.notice}>
            <Text style={journeyStyles.body}>Choose dates from today through the end of this month.</Text>
            <LinkButton label="Update dates" onPress={() => router.replace("/(member)/book/dates")} />
          </View>
        ) : null}
        <Feedback loading={resource.loading} error={resource.error} onRetry={resource.retry} />
        {!isCourts ? (
          <JourneyEntrance>
            <FloorSelector floor={floor} zooming={zooming} onSelect={chooseFloor} onEntered={onEntered}
              disabled={!canEdit || resource.loading || !!resource.error}
              availableFloors={data ? bookingFloors.filter(value => courtsOnFloor(data.courts, value).length > 0) : []} />
          </JourneyEntrance>
        ) : floor ? (
          <>
            {data ? <CourtPlan courts={floorCourts} floor={floor} selectedId={selectedCourt?.id} onSelect={chooseCourt} /> : null}
            <Text style={journeyStyles.body}>Choose a court to see its times.{"\n"}Availability depends on date and time.</Text>
            {!resource.loading && !resource.error && !floorCourts.length ? <Text style={journeyStyles.body}>No courts are listed on this floor for this date.</Text> : null}
          </>
        ) : null}
        {data?.courts.some(c => !courtFloor(c)) ? <Text style={journeyStyles.caption}>Some courts do not have a supported floor assignment. Contact ZAWANA staff for those courts.</Text> : null}
        {data && !data.courts.length ? <Text style={journeyStyles.body}>No courts are currently listed. Please contact ZAWANA staff.</Text> : null}
        {booking.slots.length ? <Pressable onPress={continueBooking} accessibilityRole="button" disabled={!canEdit} style={styles.cart} testID="booking-review-selection">
          <Text style={journeyStyles.strong}>Review selection ({booking.slots.length})</Text>
          <Text style={journeyStyles.caption}>{money(total(booking.slots))} · Your other courts and dates are retained</Text>
        </Pressable> : null}
        {isCourts ? <LinkButton label="Add or change dates" onPress={() => router.push("/(member)/book/dates")} /> : null}
        {booking.notice ? <Text accessibilityLiveRegion="polite" style={journeyStyles.body}>{booking.notice}</Text> : null}
        {booking.pending ? <LinkButton label="Recover pending reservation" onPress={() => router.replace("/(member)/book/review")} /> : null}
      </JourneyFrame>
      {sheetOpen && liveCourt && date ? <TimeSlotSheet court={liveCourt} date={date} data={data} loading={resource.loading} error={resource.error}
        onRetry={resource.retry} onDismiss={dismissSheet} onContinue={continueBooking} /> : null}
    </>
  );
}
const styles = StyleSheet.create({
  dates: { gap: 8 }, dateChip: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 10 }, white: { color: "#FFFFFF" },
  cart: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: journeyColors.outline, minHeight: 48, gap: 4 },
});
