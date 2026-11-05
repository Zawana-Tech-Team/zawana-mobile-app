import { attendanceStart } from "@/attendance/domain";
import { memberBookingHref } from "@/booking/member-navigation";
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import type { AppUser, MemberDashboard } from '@/auth/types';
import { brand } from '@/design/tokens';
import { useMemberNotifications } from '@/notifications/provider';
import { AuthIcon } from '../auth/ui/auth-icon';
import { SelectionPressable } from '../booking/selection-pressable';
import { BalanceRing, QuietRow } from '../shared/quiet-ui';
import { MemberPage, Notice, shortDate } from '../member/ui';
export type MemberHomeScreenProps = {
 user: AppUser; dashboard: MemberDashboard | null; loading: boolean; error?: string | null; onRetry: () => void; onSignOut: () => void;
 onProfile?: () => void; onBook?: () => void; onServices?: () => void; onMembership?: () => void; onPrivateCourse?: () => void; onActivity?: () => void; showNavigation?: boolean;
};
export function MemberHomeScreen({ user, dashboard, loading, error, onRetry, onBook, onMembership, onPrivateCourse, onServices }: MemberHomeScreenProps) {
 const firstName = user.name.trim().split(/\s+/)[0] || 'Member', notifications = useMemberNotifications();
 const upcoming = [...(dashboard?.upcomingBookings ?? [])].filter(b => b.userId === user.id).sort((a, b) => a.date.localeCompare(b.date) || attendanceStart(a.time) - attendanceStart(b.time));
 const next = upcoming[0], enrollment = dashboard?.enrollment;
 return <MemberPage title={`Hello, ${firstName}.`} sectionLabel="YOUR CLUB. YOUR GAME." tab="Home">
  <SelectionPressable testID="home-book-court" accessibilityRole="button" accessibilityLabel="Book a Court" onPress={onBook ?? (() => router.push('/(member)/book'))} style={s.hero}>
   <Image source={require('../../../assets/facilities/court.webp')} contentFit="cover" style={StyleSheet.absoluteFill} /><LinearGradient colors={['#10174720', '#101747F5']} style={StyleSheet.absoluteFill} />
   <View style={s.copy}><Text style={s.kicker}>BADMINTON AT ZAWANA</Text><Text style={s.heroTitle}>{'Make time\nfor your game.'}</Text><View style={s.heroAction}><Text style={s.cta}>Book a Court</Text><AuthIcon name="arrow" color={brand.gold} /></View></View>
  </SelectionPressable>
  <Notice loading={loading} error={error} onRetry={onRetry} />
  {next ? <QuietRow title={next.title} subtitle={`${shortDate(next.date)} · ${next.time}`} icon="calendar" testID="home-next-booking" onPress={() => router.push(memberBookingHref(next))} /> : dashboard ? <QuietRow title="Your next session starts here." subtitle="View your bookings" icon="calendar" onPress={() => router.push('/(member)/bookings')} /> : null}
  <View style={{ flexDirection: 'row', gap: 12 }}>{[{ title: 'Packages', icon: 'retail' as const, action: onMembership ?? (() => router.push('/(member)/membership')) }, { title: 'Coaching', icon: 'badminton' as const, action: onPrivateCourse ?? (() => router.push('/(member)/private-course')) }].map(item => <SelectionPressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={item.action} style={{ flex: 1, minHeight: 106, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: brand.border, gap: 14 }}><AuthIcon name={item.icon} color={brand.navy} /><Text style={{ color: brand.navy, fontSize: 15, fontWeight: '600' }}>{item.title}</Text></SelectionPressable>)}</View>
  {enrollment ? <QuietRow title={enrollment.packageName} subtitle="Your remaining sessions" trailing={<BalanceRing remaining={enrollment.sessionsRemaining} total={enrollment.sessionsTotal} />} onPress={onMembership ?? (() => router.push('/(member)/membership'))} /> : null}
  <QuietRow title="Explore Services" subtitle="Badminton & what’s next" icon="badminton" onPress={onServices ?? (() => router.push('/(member)/services'))} />
  {notifications.unread > 0 ? <QuietRow title={`${notifications.unread} unread update${notifications.unread === 1 ? '' : 's'}`} subtitle="Stay up to date with your club" icon="bell" onPress={() => router.push('/(member)/notifications')} /> : null}
 </MemberPage>;
}
const s = StyleSheet.create({ hero: { minHeight: 252, borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end' }, copy: { padding: 24, gap: 14 }, kicker: { fontSize: 9, letterSpacing: 1.5, color: '#FFE1A0', fontWeight: '700' }, heroTitle: { color: '#FFFFFF', fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -1 }, heroAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }, cta: { color: '#FFE1A0', fontWeight: '700', fontSize: 14 } });
