import { Easing, ReduceMotion } from "react-native-reanimated";

export const journeyMotion = {
  press: { duration: 140, reduceMotion: ReduceMotion.System },
  highlight: { duration: 160, reduceMotion: ReduceMotion.System },
  floorPop: { duration: 170, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  floorSettle: { duration: 300, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  camera: {
    duration: 650,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    reduceMotion: ReduceMotion.System,
  },
  sheet: { duration: 320, dampingRatio: 0.88, reduceMotion: ReduceMotion.System },
  dismiss: { duration: 200, reduceMotion: ReduceMotion.System },
} as const;
