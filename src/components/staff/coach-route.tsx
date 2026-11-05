import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-provider';
/** The root protects staff authentication; coach-only destinations also enforce the existing role. */
export function CoachRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.role === 'coach' ? children : <Redirect href="/(staff)/overview" />;
}
