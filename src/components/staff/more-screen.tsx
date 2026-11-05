import { router } from 'expo-router';
import { useAuth } from '@/auth/auth-provider';
import { QuietRow } from '../shared/quiet-ui';
import { StaffPage } from './ui';
export function CoachMoreScreen() {
 const { user } = useAuth();
 return <StaffPage title="More." subtitle={user?.name} active="more">
  <QuietRow title="Notifications" icon="calendar" onPress={() => router.push('/(staff)/notifications')} />
  <QuietRow title="My students" icon="person" onPress={() => router.push('/(staff)/customers')} />
  <QuietRow title="Profile & settings" icon="person" onPress={() => router.push('/(staff)/profile')} />
 </StaffPage>;
}
