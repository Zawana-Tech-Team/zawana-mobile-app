import { useAuth } from "@/auth/auth-provider";
import { useFormTask } from "@/hooks/use-form-task";
import { memberBookingHref } from "@/booking/member-navigation";
import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { useMemberNotifications } from '@/notifications/provider';
import { notificationCategory, notificationDestination, notificationGroup, relativeTimestamp } from '@/notifications/presentation';
import type { Notification } from '@/coach/domain';
import { brand } from '@/design/tokens';
import { AuthIcon, type AuthIconName } from '../auth/ui/auth-icon';
import { SelectionPressable } from '../booking/selection-pressable';
import { Segments } from '../shared/controls';
import { DetailSheet, Reveal, q } from '../shared/quiet-ui';
import { Button, MemberPage, Notice } from './ui';
const icons: Record<string, AuthIconName> = { booking: 'calendar', package: 'retail', payment: 'check', coaching: 'badminton', announcement: 'bell' };
export function MemberNotificationsScreen() {
 const { api } = useAuth(), task = useFormTask();
 const store = useMemberNotifications(), [filter, setFilter] = useState('all'), [selectedId, setSelectedId] = useState<string | null>(null), [feedback, setFeedback] = useState('');
 const focused = useRef(true);
 useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; }; }, []));
 const rows = store.items.filter(item => filter !== 'unread' || !item.read), selected = store.items.find(item => item.id === selectedId);
 const navigate = async (item: Notification) => {
  const to = notificationDestination(item); if (!to) return;
  if (to.screen === 'booking') {
   // Notification booking events do not identify court vs private course. Resolve from the authoritative owned-course feed.
   const courses = await api.getPrivateCourseBookings();
   if (focused.current) router.push(memberBookingHref({ id: to.id, kind: courses.some(course => course.id === to.id) ? 'private_course' : 'court' }));
  } else if (focused.current) router.push(to.screen === 'packages' ? '/(member)/membership' : to.screen === 'attendance' ? '/(member)/attendance' : to.screen === 'courses' ? '/(member)/courses' : '/(member)/bookings');
 };
 const open = async (item: Notification, details = false) => {
  if (store.busy || task.loading) return;
  if (details || !notificationDestination(item)) setSelectedId(item.id);
  const success = await store.markRead([item.id]);
  if (!focused.current) return;
  if (success && !details && notificationDestination(item)) await task.run(() => navigate(item));
  else if (!success) setSelectedId(item.id);
 };
 return <MemberPage title="Notifications." subtitle={`${store.unread} unread`} sectionLabel="YOUR UPDATES" tab="Home" back wide>
  <Segments label="Notification filter" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'unread', label: `Unread${store.unread ? ` · ${store.unread}` : ''}` }]} />
  {store.unread > 0 ? <Button secondary label="Mark all as read" busy={store.busy} onPress={() => { setFeedback(''); void store.markRead(store.items.filter(n => !n.read).map(n => n.id)).then(success => { if (success) setFeedback('All caught up.'); }); }} /> : null}
  {store.items.length === 100 ? <Text style={q.caption}>Showing the latest 100 updates. Mark all applies to these updates.</Text> : null}
  <Notice loading={store.loading || task.loading} error={store.error ?? task.error} onRetry={() => void store.refresh()} />
  {feedback ? <Text accessibilityLiveRegion="polite" style={q.caption}>{feedback}</Text> : null}
  {['Today', 'Yesterday', 'Earlier'].map(group => {
   const grouped = rows.filter(item => notificationGroup(item.createdAt) === group);
   return grouped.length ? <View key={group} style={{ gap: 12 }}><Text style={{ color: brand.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>{group.toUpperCase()}</Text><Reveal>{grouped.map(item => <SelectionPressable key={item.id} testID={`member-notification-${item.id}`} accessibilityRole="button" accessibilityLabel={`${item.read ? 'Read' : 'Unread'}: ${item.title}`} accessibilityHint={notificationDestination(item) ? 'Opens the related record. Hold to read the full message.' : 'Opens the full message.'} accessibilityState={{ busy: store.busy || task.loading, disabled: store.busy || task.loading }} disabled={store.busy || task.loading} onPress={() => void open(item)} onLongPress={() => void open(item, true)} style={[q.row, { alignItems: 'flex-start', borderColor: item.read ? brand.border : '#D6BC80' }]}>
    <View style={q.icon}><AuthIcon name={icons[notificationCategory(item)]} color={brand.navy} size={20} /></View><View style={{ flex: 1, gap: 5 }}><Text style={[q.label, { fontWeight: item.read ? '500' : '700' }]}>{item.title}</Text><Text style={q.caption} numberOfLines={2}>{item.body}</Text><Text style={[q.caption, { fontSize: 10 }]}>{relativeTimestamp(item.createdAt)}</Text></View>{!item.read ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: brand.gold, marginTop: 8 }} /> : null}
   </SelectionPressable>)}</Reveal></View> : null;
  })}
  {!store.loading && !store.error && !rows.length ? <View style={{ padding: 28, alignItems: 'center', gap: 12 }}><AuthIcon name="bell" size={32} color={brand.muted} /><Text style={q.label}>{filter === 'unread' ? 'You’re all caught up.' : 'A little quiet, for now.'}</Text><Text style={q.caption}>Your bookings and club updates will appear here.</Text></View> : null}
  <DetailSheet title="Your update" visible={!!selected} onClose={() => setSelectedId(null)}>{selected ? <><Text style={q.label}>{selected.title}</Text><Text style={q.caption}>{selected.body}</Text><Text style={q.caption}>{relativeTimestamp(selected.createdAt)}</Text><Notice error={store.error} />{notificationDestination(selected) ? <Button label="View details" onPress={() => { setSelectedId(null); void task.run(() => navigate(selected)); }} /> : null}{!selected.read ? <Button secondary label="Mark as read" busy={store.busy} onPress={() => void store.markRead([selected.id])} /> : null}</> : null}</DetailSheet>
 </MemberPage>;
}
