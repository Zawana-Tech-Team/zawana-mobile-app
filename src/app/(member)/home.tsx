import { useEffect, useState } from 'react';

import { useAuth } from '@/auth/auth-provider';
import { sanitizeAuthError } from '@/auth/errors';
import type { MemberDashboard } from '@/auth/types';
import { MemberHomeScreen } from '@/components/home/member-home-screen';
import { useFormTask } from '@/hooks/use-form-task';

export default function Home() {
  const { user, api, signOut } = useAuth();
  const [result, setResult] = useState<{
    userId: string; attempt: number; dashboard: MemberDashboard | null; error: string | null;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const task = useFormTask();
  const userId = user?.id;
  const loading = result?.userId !== userId || result?.attempt !== attempt;

  useEffect(() => {
    if (!userId) return;
    const request = new AbortController();
    let active = true;
    void api.getMemberDashboard(undefined, { signal: request.signal }).then(result => {
      if (active) setResult({ userId, attempt, dashboard: result, error: null });
    }).catch(failure => {
      if (active) setResult({ userId, attempt, dashboard: null, error: sanitizeAuthError(failure).message });
    });
    return () => { active = false; request.abort(); };
  }, [api, userId, attempt]);

  if (!user) return null;
  return <MemberHomeScreen user={user} dashboard={loading ? null : result?.dashboard ?? null} loading={loading}
    error={task.error ?? (loading ? null : result?.error)} onRetry={() => setAttempt(value => value + 1)}
    onSignOut={() => task.run(signOut)} />;
}
