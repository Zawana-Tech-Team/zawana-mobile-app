import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { sanitizeAuthError } from '@/auth/errors';
import type { Notification } from '@/coach/domain';

function useNotificationStore() {
 const { api } = useAuth();
 const [items, setItems] = useState<Notification[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
 const active = useRef(false), lock = useRef(false), revision = useRef(0), controller = useRef<AbortController | null>(null);
 const cancelRefresh = useCallback(() => { revision.current++; controller.current?.abort(); }, []);
 const refresh = useCallback(() => {
  if (lock.current) return Promise.resolve();
  const generation = ++revision.current;
  controller.current?.abort(); const request = new AbortController(); controller.current = request;
  return api.getNotifications(true, { signal: request.signal }).then(rows => {
   if (active.current && generation === revision.current) { setItems(rows); setError(null); }
  }).catch(e => {
   if (active.current && !request.signal.aborted && generation === revision.current) setError(sanitizeAuthError(e).message);
  }).finally(() => { if (active.current && generation === revision.current) setLoading(false); });
 }, [api]);
 useEffect(() => {
  active.current = true; void refresh();
  const timer = setInterval(() => void refresh(), 60000), listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
  return () => { active.current = false; cancelRefresh(); clearInterval(timer); listener.remove(); };
 }, [refresh, cancelRefresh]);
 const markRead = async (ids: string[]) => {
  if (lock.current) return false;
  const pending = [...new Set(ids)].filter(id => items.some(item => item.id === id && !item.read));
  if (!pending.length) return true;
  lock.current = true; setBusy(true); setError(null); revision.current++; controller.current?.abort();
  try {
   // No bulk endpoint exists. Each record uses the existing authenticated ownership-checked mutation.
   const results = await Promise.allSettled(pending.map(id => api.readNotification(id)));
   if (!active.current) return false;
   const updated = new Map(results.flatMap(result => result.status === 'fulfilled' ? [[result.value.id, result.value] as const] : []));
   setItems(old => old.map(item => updated.get(item.id) ?? item));
   const failed = results.filter(result => result.status === 'rejected');
   if (failed.length) setError(`${failed.length} update${failed.length === 1 ? '' : 's'} could not be saved. Try again.`);
   return failed.length === 0;
  } finally { lock.current = false; if (active.current) { setBusy(false); setLoading(false); } }
 };
 return { items, unread: items.filter(item => !item.read).length, loading, busy, error, refresh, markRead };
}
const Context = createContext<ReturnType<typeof useNotificationStore> | null>(null);
export function MemberNotificationProvider({ children }: { children: ReactNode }) { const value = useNotificationStore(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useMemberNotifications() { const value = useContext(Context); if (!value) throw new Error('MemberNotificationProvider is required'); return value; }
