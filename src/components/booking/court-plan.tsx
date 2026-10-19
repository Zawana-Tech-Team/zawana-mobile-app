import { memo, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { G, Line, Path, Rect } from "react-native-svg";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import type { Court } from "@/booking/types";
import { courtSurfaceColors, type BookingFloor } from "./court-presentation";
import { journeyColors, journeyStyles } from "./journey-frame";
import { journeyMotion } from "./journey-motion";

export const CourtSurface = memo(function CourtSurface({ floor, disabled = false }: { floor: BookingFloor; disabled?: boolean }) {
  return (
    <View style={styles.surface} pointerEvents="none" accessible={false}>
      <Svg width="100%" height="100%" viewBox="0 0 73 146">
        <Rect width="73" height="146" rx="3" fill={disabled ? "#ABAAB2" : courtSurfaceColors[floor]} />
        <Rect x="2" y="2" width="69" height="142" rx="2" fill="none" stroke="#FFFFFF" opacity={0.18} />
        {/* 6.1 × 13.4 m playing surface, with singles and doubles service markings. */}
        <G stroke="#F8F5E8" strokeWidth="0.65" fill="none">
          <Rect x="6" y="6" width="61" height="134" />
          <Path d="M10.6 6 V140 M62.4 6 V140 M6 13.6 H67 M6 132.4 H67 M6 53.2 H67 M6 92.8 H67 M36.5 6 V53.2 M36.5 92.8 V140" />
        </G>
        <Rect x="3" y="71.4" width="67" height="3.2" fill="#26393A" opacity={0.6} />
        <Line x1="2" y1="72.2" x2="71" y2="72.2" stroke="#FFFFFF" strokeWidth="1.2" />
        <Line x1="3" y1="74" x2="70" y2="74" stroke="#F2F2E5" strokeWidth="0.5" strokeDasharray="1 1" />
        <Rect x="1" y="70" width="2" height="6" rx="1" fill="#F1E4BF" />
        <Rect x="70" y="70" width="2" height="6" rx="1" fill="#F1E4BF" />
      </Svg>
    </View>
  );
});

const CourtCard = memo(function CourtCard({ court, floor, selected, dimmed, index, onSelect, wide }: {
  court: Court; floor: BookingFloor; selected: boolean; dimmed: boolean;
  index: number; onSelect: (court: Court) => void; wide: boolean;
}) {
  const focus = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => { focus.set(withTiming(selected ? 1 : 0, journeyMotion.press)); }, [selected, focus]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: focus.get() * -4 }, { scale: 1 + focus.get() * 0.025 }],
  }));
  const disabled = court.status !== "available";
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.duration(550).delay(index * 45)} style={[wide ? styles.wide : styles.flex, animated]}>
      <Pressable
        onPress={() => onSelect(court)} disabled={disabled}
        accessibilityRole="button" accessibilityLabel={`${court.name}, ${floor}, ${floor === "6th Floor" ? "red" : "green"} court, ${court.status}`}
        accessibilityHint="Opens available playing times" accessibilityState={{ selected, disabled }}
        testID={`court-${court.id}`}
        style={[styles.card, selected && styles.selected, dimmed && styles.dimmed, disabled && styles.disabled]}
      >
        <CourtSurface floor={floor} disabled={disabled} />
        <Text style={styles.name}>{court.name}</Text>
        <Text style={[styles.caption, selected && styles.selectedCaption]}>{disabled ? court.status : selected ? "Selected ✓" : "View times"}</Text>
      </Pressable>
    </Animated.View>
  );
});

export function CourtPlan({ courts, floor, selectedId, onSelect }: {
  courts: Court[]; floor: BookingFloor; selectedId?: string; onSelect: (court: Court) => void;
}) {
  const { fontScale } = useWindowDimensions();
  const wide = courts.length > 4 || fontScale > 1.3;
  const cards = courts.map((court, index) => (
    <CourtCard key={court.id} court={court} floor={floor} index={index} onSelect={onSelect}
      selected={court.id === selectedId} dimmed={!!selectedId && court.id !== selectedId} wide={wide} />
  ));
  return (
    <View style={styles.scene} testID="booking-court-plan">
      <Text style={styles.floorLabel}>{floor.toUpperCase()} / {floor === "6th Floor" ? "RED" : "GREEN"} BADMINTON COURTS</Text>
      <View style={styles.arena}>
        <View style={styles.deck}>
          {wide ? <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.row}>{cards}</ScrollView> : <View style={styles.row}>{cards}</View>}
        </View>
        <Text style={[journeyStyles.strong, styles.center]}>{courts.length === 4 ? "All four courts in one view" : `${courts.length} courts on this floor`}</Text>
        <Text style={[journeyStyles.caption, styles.center]}>Tap a court to choose a time</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { gap: 12, paddingVertical: 8 },
  floorLabel: { fontSize: 10, lineHeight: 16, fontWeight: "700", color: journeyColors.navy },
  arena: { borderRadius: 24, padding: 12, paddingBottom: 16, backgroundColor: "#F4F3EF", gap: 5 },
  deck: { padding: 8, paddingTop: 12, borderRadius: 16, backgroundColor: "#E6DDC5", marginBottom: 10 },
  row: { flexDirection: "row", gap: 6, alignItems: "stretch" },
  flex: { flex: 1, minWidth: 0 }, wide: { width: 90 },
  card: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 9, borderWidth: 2, borderColor: "transparent", padding: 4, paddingBottom: 8, gap: 5 },
  selected: { borderColor: journeyColors.gold, backgroundColor: "#FFFBE9" },
  disabled: { opacity: 0.65 },
  dimmed: { opacity: 0.58 },
  surface: { width: "100%", aspectRatio: 73 / 146 },
  name: { color: journeyColors.navy, fontSize: 10, lineHeight: 15, fontWeight: "700", textAlign: "center" },
  caption: { color: journeyColors.muted, fontSize: 9, lineHeight: 13, textAlign: "center" },
  selectedCaption: { color: "#826F1C", fontWeight: "700" },
  center: { textAlign: "center" },
});
