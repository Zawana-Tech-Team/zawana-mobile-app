import { useAuth } from "@/auth/auth-provider";
import { BookingProvider } from "@/booking/provider";
import { useReducedMotion } from "react-native-reanimated";
import { Stack } from "expo-router";
export default function MemberLayout() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();
  return (
    <BookingProvider key={user?.id}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? "none" : "slide_from_right",
          contentStyle: { backgroundColor: "#FFFEFC" },
        }}
      />
    </BookingProvider>
  );
}
