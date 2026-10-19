import { useCallback, useEffect } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { AuthIcon } from "@/components/auth/ui/auth-icon";
import { BuildingIllustration } from "./building-illustration";
import { bookingFloors, type BookingFloor } from "./court-presentation";
import { journeyColors, journeyStyles } from "./journey-frame";
import { journeyMotion } from "./journey-motion";
import { SelectionPressable } from "./selection-pressable";

function FloorChoice({ floor, selected, disabled, overlay = false, style, onSelect }: {
  floor: BookingFloor; selected: boolean; disabled: boolean; overlay?: boolean;
  style: StyleProp<ViewStyle>; onSelect: (floor: BookingFloor) => void;
}) {
  const pulse = useSharedValue(0);
  const acknowledge = useCallback(() => {
    cancelAnimation(pulse);
    pulse.set(0);
    pulse.set(withSequence(
      withTiming(1, journeyMotion.floorPop),
      withTiming(0, journeyMotion.floorSettle),
    ));
  }, [pulse]);
  useEffect(() => {
    if (selected) acknowledge();
    else { cancelAnimation(pulse); pulse.set(0); }
    return () => cancelAnimation(pulse);
  }, [selected, pulse, acknowledge]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: -pulse.get() * 5 }, { scale: 1 + pulse.get() * 0.06 }],
  }));
  const second = floor === "2nd Floor";
  return <Animated.View style={[style, selected && styles.foreground, animated]}>
    <SelectionPressable selected={selected} selectedColor={journeyColors.navy} restColor={journeyColors.paper}
      style={[styles.choice, overlay ? styles.floorTag : styles.floorButton, selected && styles.selected, disabled && styles.unavailable]}
      onPress={() => { if (selected) acknowledge(); onSelect(floor); }} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={`Select ${floor}, ${second ? "green" : "red"} badminton courts`}
      accessibilityState={{ selected, disabled }} aria-selected={selected}
      testID={`${overlay ? "building-" : ""}floor-${second ? 2 : 6}`}>
      <View style={styles.labelRow}>
        {selected ? <AuthIcon name="check" size={overlay ? 16 : 18} color="#F4D779" /> : null}
        <Text style={[overlay ? styles.tagText : styles.buttonText, selected && styles.selectedText]}>
          {overlay ? `${second ? "02" : "06"}  ` : ""}{floor}
        </Text>
      </View>
      {selected ? <Text style={styles.selectedCaption}>SELECTED</Text> : null}
    </SelectionPressable>
  </Animated.View>;
}

export function FloorSelector({ floor, zooming, availableFloors, disabled, onSelect, onEntered }: {
  floor: BookingFloor | null;
  zooming: boolean;
  availableFloors: readonly BookingFloor[];
  disabled: boolean;
  onSelect: (floor: BookingFloor) => void;
  onEntered: () => void;
}) {
  return <View style={styles.selector}>
    <View style={styles.building}>
      <BuildingIllustration floor={floor} zooming={zooming} onEntered={onEntered} />
      {!zooming ? bookingFloors.map(value => <FloorChoice key={value} floor={value} overlay
        selected={floor === value} disabled={disabled || !availableFloors.includes(value)} onSelect={onSelect}
        style={[styles.tagPosition, value === "2nd Floor" ? styles.secondTag : styles.sixthTag]} />) : null}
    </View>
    {!zooming ? <View style={styles.floorButtons}>
      {bookingFloors.map(value => <FloorChoice key={value} floor={value} selected={floor === value}
        disabled={disabled || !availableFloors.includes(value)} onSelect={onSelect} style={styles.buttonPosition} />)}
    </View> : <View style={journeyStyles.notice}>
      <Text style={journeyStyles.strong}>Camera settles into the floor plan</Text>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  selector: { gap: 12 },
  building: { position: "relative" },
  foreground: { zIndex: 2 },
  tagPosition: { position: "absolute", right: 8, width: "40%", zIndex: 1 },
  sixthTag: { top: "31%" },
  secondTag: { top: "59%" },
  choice: { borderRadius: 12, borderWidth: 2, borderColor: journeyColors.outline, justifyContent: "center", alignItems: "center", gap: 3 },
  floorTag: { minHeight: 48, paddingVertical: 8, paddingHorizontal: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  tagText: { color: journeyColors.navy, fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center", flexShrink: 1 },
  floorButtons: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  buttonPosition: { flex: 1 },
  floorButton: { flex: 1, minHeight: 60, padding: 10 },
  buttonText: { color: journeyColors.navy, fontSize: 13, lineHeight: 19, fontWeight: "700", textAlign: "center", flexShrink: 1 },
  selected: { borderColor: "#D7B75B" },
  selectedText: { color: "#FFFFFF" },
  selectedCaption: { color: "#F4D779", fontSize: 9, lineHeight: 12, fontWeight: "800", letterSpacing: 1 },
  unavailable: { opacity: 0.5 },
});
