import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { brand } from '@/design/tokens';
export default function StaffLayout() {
  const reduced = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'slide_from_right', contentStyle: { backgroundColor: brand.page } }} />;
}
