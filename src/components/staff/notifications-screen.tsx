import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useResource } from '@/booking/use-resource';
import { useFormTask } from '@/hooks/use-form-task';
import { brand } from '@/design/tokens';
import { a } from '../attendance/ui';
import { Button, Notice } from '../member/ui';
import { Segments } from '../shared/controls';
import { DetailSheet, QuietRow } from '../shared/quiet-ui';
import { Empty, PageMore, StaffPage } from './ui';
export function StaffNotificationsScreen() {
 const { api, user } = useAuth(), [history, setHistory] = useState(false), [limit, setLimit] = useState(20), [selectedId, setSelectedId] = useState<string | null>(null), task = useFormTask();
 const resource = useResource(useCallback((signal: AbortSignal) => api.getNotifications(history, { signal }), [api, history]), `${user?.id}:${history}`, !!user);
 const selected = resource.data?.find(n => n.id === selectedId);
 return <StaffPage title="Notifications." active="more" back>
  <Segments label="Notification view" value={history ? 'history' : 'inbox'} onChange={v => { setHistory(v === 'history'); setLimit(20); setSelectedId(null); }} options={[{ value: 'inbox', label: 'Inbox' }, { value: 'history', label: 'History' }]} />
  <Notice loading={resource.loading} error={resource.error ?? task.error} onRetry={resource.retry} />
  {resource.data?.slice(0, limit).map(n => <QuietRow key={n.id} testID={`notification-${n.id}`} title={n.title} subtitle={`${new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Yangon' })} · ${n.body}`} onPress={() => { task.setError(null); setSelectedId(n.id); }} trailing={!n.read ? <View accessibilityLabel="Unread" style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: brand.gold }} /> : undefined} />)}
  {resource.data && !resource.data.length ? <Empty title={history ? 'No notification history.' : 'You’re all caught up.'} body="Your session updates will appear here." /> : null}
  <PageMore total={resource.data?.length ?? 0} shown={limit} onMore={() => setLimit(v => v + 20)} />
  <DetailSheet title="Session update" visible={!!selected} onClose={() => setSelectedId(null)}>{selected ? <><Text style={a.title}>{selected.title}</Text><Text style={a.muted}>{selected.body}</Text>{selected.entityId && (selected.type === 'private_course_request' || selected.link?.includes('/coach/bookings')) ? <Button label="View booking" onPress={() => { setSelectedId(null); router.push({ pathname: '/(staff)/sessions/[id]', params: { id: selected.entityId! } }); }} /> : null}<Notice error={task.error} />{selected.activeInInbox ? <Button secondary label="Mark as read" busy={task.loading} onPress={() => void task.run(async () => { await api.readNotification(selected.id); setSelectedId(null); resource.retry(); })} /> : null}</> : null}</DetailSheet>
 </StaffPage>;
}
