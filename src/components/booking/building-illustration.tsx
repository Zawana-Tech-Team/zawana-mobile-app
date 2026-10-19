import { Image } from "expo-image";
import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import Animated, { cancelAnimation, ReduceMotion, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import type { BookingFloor } from "./court-presentation";
import { journeyMotion } from "./journey-motion";

/** Reusable architectural artwork adapted from the mature graphical reference. */
export const BuildingIllustration = memo(function BuildingIllustration({ floor, zooming, onEntered }: {
  floor: BookingFloor | null; zooming: boolean; onEntered: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const camera = useSharedValue(0);
  const selection = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(selection);
    selection.set(0);
    if (floor) selection.set(withSequence(
      withTiming(1, journeyMotion.floorPop),
      withTiming(0, journeyMotion.floorSettle),
    ));
    return () => cancelAnimation(selection);
  }, [floor, selection]);
  useEffect(() => {
    const motion = reducedMotion
      ? { duration: 90, reduceMotion: ReduceMotion.Never }
      : journeyMotion.camera;
    camera.set(withTiming(zooming ? 1 : 0, motion, finished => {
      if (finished && zooming) runOnJS(onEntered)();
    }));
    return () => cancelAnimation(camera);
  }, [zooming, camera, onEntered, reducedMotion]);
  const animated = useAnimatedStyle(() => ({
    opacity: 1 - camera.get() * (reducedMotion ? 1 : 0.18),
    transform: reducedMotion ? [] : [
      { translateY: camera.get() * (floor === "6th Floor" ? 60 : -45) },
      { translateX: -camera.get() * 14 },
      { scale: 1 + camera.get() * 0.55 },
    ],
  }));
  const selectionMotion = useAnimatedStyle(() => ({
    transform: reducedMotion ? [] : [
      { translateY: selection.get() * (floor === "6th Floor" ? 4 : -4) },
      { scale: 1 + selection.get() * 0.025 },
    ],
  }));
  // Semantic floor overlays use the artwork's original coordinate system.
  const redBand = "461,342 963,445 963,536 461,433";
  const greenBand = "461,728 963,802 963,893 461,820";
  const highlightedBand = floor === "6th Floor" ? redBand : greenBand;
  return (
    <View style={styles.canvas} testID={zooming ? "building-zoom" : "booking-building"}
      accessible accessibilityLabel={`ZAWANA building, green courts on the 2nd floor and red courts on the 6th floor${floor ? `, ${floor} selected` : ""}`}>
      <Animated.View style={[StyleSheet.absoluteFill, animated]}>
        <Animated.View style={[StyleSheet.absoluteFill, selectionMotion]}>
          <Image source={require("../../../assets/booking/mature-building.png")}
            contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />
          {floor ? <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg width="100%" height="100%" viewBox="0 0 1211 1299" preserveAspectRatio="xMidYMid meet">
              <Polygon points={floor === "6th Floor" ? greenBand : redBand} fill="#211D4E" opacity={0.5} />
              <Polygon points={highlightedBand} fill="none" stroke="#F4D779" strokeWidth={30} strokeLinejoin="round" opacity={0.3} />
              <Polygon points={highlightedBand} fill="#F4D779" fillOpacity={0.12} stroke="#F4D779" strokeWidth={9} strokeLinejoin="round" />
            </Svg>
          </View> : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { width: "100%", aspectRatio: 342 / 360, overflow: "hidden", backgroundColor: "#FFFFFF" },
});
