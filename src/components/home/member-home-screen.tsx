import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import type { AppUser, DashboardBooking, MemberDashboard } from '../../auth/types';
import { PrimaryButton } from '../auth/ui/auth-button';
import { AuthErrorMessage } from '../auth/ui/auth-feedback';
import { AuthIcon, type AuthIconName } from '../auth/ui/auth-icon';
import { BrandLogo } from '../auth/ui/brand-logo';
import { authColors } from '../auth/ui/tokens';

export type MemberHomeScreenProps = {
  user: AppUser;
  dashboard: MemberDashboard | null;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onSignOut: () => void;
  onProfile?: () => void;
  onBook?: () => void;
  onServices?: () => void;
  onActivity?: () => void;
  /** Disable when the containing Expo Router navigator supplies native tabs. */
  showNavigation?: boolean;
};

type Panel = 'bookings' | 'services' | 'activity' | 'notifications' | 'profile' | 'support';

const panelTitles: Record<Panel, string> = {
  bookings: 'Your bookings',
  services: 'ZAWANA Services',
  activity: 'Your activity',
  notifications: 'Notifications',
  profile: 'Your profile',
  support: 'ZAWANA support'
};

const facilities = [
  {
    name: 'Badminton Arena',
    detail: 'Professional courts',
    image: require('../../../assets/facilities/court.webp')
  },
  {
    name: 'Gym & Fitness',
    detail: 'Train stronger',
    image: require('../../../assets/facilities/gym.webp')
  },
  {
    name: 'Revive Clinic',
    detail: 'Recovery & wellness',
    image: require('../../../assets/facilities/revive.webp')
  },
  {
    name: 'LI-NING Store',
    detail: 'Sports equipment',
    image: require('../../../assets/partners/partner-3.png')
  },
  {
    name: 'ZAWANA Café',
    detail: 'Food & drinks',
    image: require('../../../assets/facilities/cafe.webp')
  },
] as const;

const quickActions: { label: string; detail: string; icon: AuthIconName; panel: Panel }[] = [
  {
    label: 'Book Court',
    detail: 'Reserve your court',
    icon: 'calendar',
    panel: 'bookings'
  },
  {
    label: 'Private Coaching',
    detail: 'Train with experts',
    icon: 'person',
    panel: 'services'
  },
  { label: 'Membership', detail: 'Your memberships', icon: 'retail', panel: 'services' },
  {
    label: 'Performance',
    detail: 'Track your progress',
    icon: 'dumbbell',
    panel: 'services'
  },
];

function displayDate(value: string) {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  if (!match) return value;
  const date = new Date(`${match[0]}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Yangon' });
}

function displayStatus(value: string) {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function BookingRow({ booking, onPress }: { booking: DashboardBooking; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${booking.title}, ${booking.date}, ${booking.time}`}
      onPress={onPress}
      className="flex-row items-center rounded-xl border border-outline bg-white"
      style={styles.bookingRow}
    >
      <Image
        source={booking.kind === 'recovery' ? require('../../../assets/facilities/revive.webp') : booking.kind === 'pt' ? require('../../../assets/facilities/gym.webp') : require('../../../assets/facilities/court.webp')}
        contentFit="cover"
        style={styles.bookingImage}
        accessible={false}
      />
      <View style={styles.bookingCopy}>
        <Text style={styles.bookingDate}>{displayDate(booking.date)} · {booking.time}</Text>
        <Text style={styles.bookingTitle}>{booking.title}</Text>
        <Text style={styles.bookingLocation}>{booking.location}</Text>
      </View>
      <View
        style={[
          styles.paymentBadge,
          booking.paymentStatus === 'paid' ? { backgroundColor: '#E5F6ED' } : null
        ]}
      >
        <Text style={[styles.paymentText, booking.paymentStatus === 'paid' ? { color: '#16744C' } : null]}>
          {displayStatus(booking.paymentStatus)}
        </Text>
      </View>
    </Pressable>
  );
}

function HomeGlyph({ name, active = false }: { name: 'home' | 'book' | 'services' | 'activity' | 'bell'; active?: boolean }) {
  const color = active ? authColors.goldDark : authColors.muted;
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {name === 'home' ? <Path d="m3 11 9-8 9 8v10h-6v-7H9v7H3V11Z" /> : null}
      {name === 'book' ? <><Rect x="4" y="5" width="16" height="16" rx="2" /><Path d="M8 3v4m8-4v4M4 10h16" /></> : null}
      {name === 'services' ? <>
        <Rect x="3" y="3" width="7" height="7" rx="2" />
        <Rect x="14" y="3" width="7" height="7" rx="2" />
        <Rect x="3" y="14" width="7" height="7" rx="2" />
        <Rect x="14" y="14" width="7" height="7" rx="2" />
      </> : null}
      {name === 'activity' ? <Path d="M4 21V11m5 10V6m5 15V9m5 12V3" /> : null}
      {name === 'bell' ? <Path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 3a2 2 0 0 0 4 0" /> : null}
    </Svg>
  );
}

export function MemberHomeScreen({
  user,
  dashboard,
  loading,
  error,
  onRetry,
  onSignOut,
  onProfile,
  onBook,
  onServices,
  onActivity,
  showNavigation = true
}: MemberHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<DashboardBooking | null>(null);
  const [featureName, setFeatureName] = useState<string | null>(null);
  const firstName = user.name.trim().split(/\s+/)[0] || 'Member';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const upcoming = [...(dashboard?.upcomingBookings ?? [])].filter((booking) => booking.userId === user.id).sort((left, right) => left.date.localeCompare(right.date) || left.time.localeCompare(right.time));
  const unread = dashboard?.notifications.filter((notification) => !notification.read).length ?? 0;

  const openPanel = (next: Panel) => {
    if (next === 'bookings' && onBook) return onBook();
    if (next === 'services' && onServices) return onServices();
    if (next === 'activity' && onActivity) return onActivity();
    if (next === 'profile' && onProfile) return onProfile();
    setSelectedBooking(null);
    setFeatureName(null);
    setPanel(next);
  };

  const openFeature = (name: string) => {
    setFeatureName(name);
    setPanel('services');
  };
  const closePanel = () => {
    setPanel(null);
    setSelectedBooking(null);
    setFeatureName(null);
  };

  return (
    <View className="flex-1 items-center bg-paper">
      <View style={{ flex: 1, width: Math.min(width, 460) }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 20 }}
          testID="member-home"
        >
          <View style={styles.header}>
            <BrandLogo size={54} />
            <View style={styles.greeting}>
              <Text style={styles.eyebrow}>{greeting}</Text>
              <Text accessibilityRole="header" style={styles.memberName}>{firstName}</Text>
              <Text style={styles.tagline}>Train. Recover. Perform.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`}
              onPress={() => openPanel('notifications')}
              style={styles.iconButton}
            >
              <HomeGlyph name="bell" />
              {unread > 0 ? <View style={styles.unreadDot} /> : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
              onPress={() => openPanel('profile')}
              style={styles.avatarButton}
            >
              {user.avatar ? <Image
                source={{ uri: user.avatar }}
                contentFit="cover"
                style={styles.avatarImage}
                accessibilityLabel="Your profile photo"
              /> : <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>}
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Image
              source={require('../../../assets/facilities/court.webp')}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              accessible={false}
            />
            <LinearGradient
              colors={['rgba(7,13,27,0.88)', 'rgba(7,13,27,0.24)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>BADMINTON AT ZAWANA</Text>
              <Text style={styles.heroTitle}>
                {'More Than\n'}
                <Text style={{ color: '#E7BD59' }}>A Game</Text>
              </Text>
              <Text style={styles.heroDetail}>{'Book. Train. Improve.\nAll in one place.'}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => openPanel('bookings')}
                style={styles.heroButton}
              >
                <Text style={styles.heroButtonText}>Book a Court</Text>
                <AuthIcon name="arrow" size={17} color="#101747" />
              </Pressable>
            </View>
          </View>

          <View style={styles.body}>
            <View style={[styles.actions, fontScale > 1.4 ? styles.actionsWrap : null]}>
              {quickActions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  onPress={() => action.label === 'Performance' ? openFeature(action.label) : openPanel(action.panel)}
                  style={[styles.action, fontScale > 1.4 ? styles.actionLarge : null]}
                >
                  <View style={styles.actionIcon}><AuthIcon name={action.icon} size={21} /></View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDetail}>{action.detail}</Text>
                </Pressable>
              ))}
            </View>

            {error ? <View style={{ marginBottom: 14 }}>
              <AuthErrorMessage message={error} />
              <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
                <Text style={styles.link}>Try again</Text>
              </Pressable>
            </View> : null}
            {loading ? <View style={styles.loading}>
              <ActivityIndicator color={authColors.goldDark} />
              <Text style={styles.smallBody}>Loading your ZAWANA activity…</Text>
            </View> : null}

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
              <Pressable accessibilityRole="button" onPress={() => openPanel('bookings')} hitSlop={12}>
                <Text style={styles.smallLink}>View All →</Text>
              </Pressable>
            </View>
            {upcoming.length ? upcoming.slice(0, 2).map((booking) => <BookingRow
              key={booking.id}
              booking={booking}
              onPress={() => {
                setSelectedBooking(booking);
                setPanel('bookings');
              }}
            />) : (
              <View style={styles.empty}>
                <AuthIcon name="calendar" size={21} color={authColors.muted} />
                <Text style={styles.smallBody}>
                  {dashboard ? 'No upcoming bookings yet.' : 'Your bookings will appear when your dashboard loads.'}
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View your memberships and training packages"
              onPress={() => openPanel('services')}
              style={styles.membership}
            >
              <Image
                source={require('../../../assets/facilities/gym.webp')}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
                accessible={false}
              />
              <LinearGradient
                colors={['rgba(9,17,43,0.98)', 'rgba(9,17,43,0.65)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.membershipCopy}>
                <Text style={styles.heroEyebrow}>ZAWANA MEMBERSHIPS</Text>
                <Text style={styles.membershipTitle}>{'Train More.\nGet More.'}</Text>
                <Text style={styles.membershipDetail}>
                  {dashboard?.enrollment ? `${dashboard.enrollment.packageName} · ${dashboard.enrollment.sessionsRemaining} sessions remaining` : user.membership ?? 'Explore memberships and training packages.'}
                </Text>
                <Text style={styles.membershipLink}>View Memberships →</Text>
              </View>
            </Pressable>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Explore Our Facilities</Text>
              <Pressable accessibilityRole="button" onPress={() => openPanel('services')} hitSlop={12}>
                <Text style={styles.smallLink}>View All →</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {facilities.map((facility) => <Pressable
                key={facility.name}
                accessibilityRole="button"
                accessibilityLabel={`Explore ${facility.name}`}
                onPress={() => openFeature(facility.name)}
                style={styles.facility}
              >
                <Image source={facility.image} contentFit="cover" style={styles.facilityImage} accessible={false} />
                <Text style={styles.facilityName}>{facility.name}</Text>
                <Text style={styles.facilityDetail}>{facility.detail}</Text>
              </Pressable>)}
            </ScrollView>
          </View>
        </ScrollView>

        {showNavigation ? <View style={[styles.navigation, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Home"
            accessibilityState={{ selected: true }}
            style={styles.navItem}
            onPress={closePanel}
          >
            <HomeGlyph name="home" active />
            <Text style={[styles.navLabel, { color: authColors.goldDark }]}>Home</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.navItem} onPress={() => openPanel('bookings')}>
            <HomeGlyph name="book" />
            <Text style={styles.navLabel}>Book</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.navItem} onPress={() => openPanel('services')}>
            <HomeGlyph name="services" />
            <Text style={styles.navLabel}>Services</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.navItem} onPress={() => openPanel('activity')}>
            <HomeGlyph name="activity" />
            <Text style={styles.navLabel}>Activity</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.navItem} onPress={() => openPanel('profile')}>
            <AuthIcon name="person" size={21} color={authColors.muted} />
            <Text style={styles.navLabel}>Profile</Text>
          </Pressable>
        </View> : null}
      </View>

      <Modal transparent visible={panel !== null} animationType="slide" onRequestClose={closePanel}>
        <View style={[styles.sheetBackdrop, { paddingTop: insets.top + 20 }]}>
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              { maxHeight: height - insets.top - 20, paddingBottom: Math.max(insets.bottom + 16, 24) }
            ]}
          >
            <View style={styles.sheetHeading}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>{panel ? panelTitles[panel] : ''}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closePanel}
                style={styles.closeButton}
              >
                <Text style={styles.link}>Close</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12 }}>
              {panel === 'bookings' ? <>
                {selectedBooking ? <View style={styles.record}>
                  <Text style={styles.recordTitle}>{selectedBooking.title}</Text>
                  <Text style={styles.recordBody}>Reference: {selectedBooking.code}</Text>
                  <Text style={styles.recordBody}>{displayDate(selectedBooking.date)} · {selectedBooking.time}</Text>
                  <Text style={styles.recordBody}>{selectedBooking.location}</Text>
                  <Text style={styles.recordBody}>Booking: {displayStatus(selectedBooking.status)}</Text>
                  <Text style={styles.recordBody}>Payment: {displayStatus(selectedBooking.paymentStatus)}</Text>
                  {selectedBooking.paymentExpiresAt ? <Text style={styles.recordBody}>Payment deadline: {selectedBooking.paymentExpiresAt}</Text> : null}
                </View> : (dashboard?.bookings ?? []).filter((booking) => booking.userId === user.id).map((booking) => <BookingRow key={booking.id} booking={booking} onPress={() => setSelectedBooking(booking)} />)}
                {!selectedBooking && !dashboard?.bookings.length ? <Text style={styles.panelBody}>
                  {dashboard ? 'You have no bookings yet.' : 'Your bookings are not available right now.'}
                </Text> : null}
                <Text style={styles.panelNotice}>Court checkout is not available in this release. Contact ZAWANA staff to arrange a booking or modify an existing reservation.</Text>
              </> : null}
              {panel === 'services' ? <>
                {featureName ? <Text style={styles.recordTitle}>{featureName}</Text> : null}
                {dashboard?.enrollment ? <View style={styles.record}>
                  <Text style={styles.recordTitle}>{dashboard.enrollment.packageName}</Text>
                  <Text style={styles.recordBody}>{dashboard.enrollment.sessionsRemaining} of {dashboard.enrollment.sessionsTotal} sessions remaining</Text>
                  <Text style={styles.recordBody}>Expires {displayDate(dashboard.enrollment.expiryDate)}</Text>
                  <Text style={styles.recordBody}>Status: {displayStatus(dashboard.enrollment.status)}</Text>
                </View> : <Text style={styles.panelBody}>
                  {user.membership ? `Membership: ${user.membership}` : dashboard ? 'No training package is linked to your account.' : 'Your membership details are not available right now.'}
                </Text>}
                {dashboard?.packages.length ? <Text style={styles.recordTitle}>Available training packages</Text> : null}
                {(dashboard?.packages ?? []).map((item) => <View key={item.id} style={styles.record}>
                  <Text style={styles.recordTitle}>{item.title}</Text>
                  <Text style={styles.recordBody}>{item.description}</Text>
                  <Text style={styles.recordBody}>{item.sessions} sessions · {item.validity} days validity</Text>
                </View>)}
                <Text style={styles.panelNotice}>Contact ZAWANA staff for memberships, coaching, recovery services and purchases. Online service checkout and performance tracking are not available in this release.</Text>
              </> : null}
              {panel === 'activity' ? <>
                {(dashboard?.bookings ?? []).filter((booking) => booking.userId === user.id).map((booking) => <View key={booking.id} style={styles.record}>
                  <Text style={styles.recordTitle}>{booking.title}</Text>
                  <Text style={styles.recordBody}>{displayDate(booking.date)} · {booking.time}</Text>
                  <Text style={styles.recordBody}>{displayStatus(booking.status)} · Payment {displayStatus(booking.paymentStatus)}</Text>
                </View>)}
                {(dashboard?.purchases ?? []).map((purchase) => <View key={purchase.id} style={styles.record}>
                  <Text style={styles.recordTitle}>{purchase.packageName}</Text>
                  <Text style={styles.recordBody}>{purchase.code} · {displayDate(purchase.createdAt)}</Text>
                  <Text style={styles.recordBody}>{displayStatus(purchase.status)} · {purchase.paymentMethod}</Text>
                </View>)}
                {(dashboard?.checkIns ?? []).map((entry) => <View key={entry.id} style={styles.record}>
                  <Text style={styles.recordTitle}>Training check-in</Text>
                  <Text style={styles.recordBody}>{displayDate(entry.date)} · {entry.time}</Text>
                  <Text style={styles.recordBody}>{entry.sessionsUsed} sessions used</Text>
                </View>)}
                {!dashboard?.bookings.length && !dashboard?.purchases.length && !dashboard?.checkIns.length ? <Text style={styles.panelBody}>
                  {dashboard ? 'No bookings, purchases or check-ins yet.' : 'Your activity is not available right now.'}
                </Text> : null}
              </> : null}
              {panel === 'notifications' ? <>
                {(dashboard?.notifications ?? []).map((notification) => <View key={notification.id} style={styles.record}>
                  <Text style={styles.recordTitle}>{notification.title}</Text>
                  <Text style={styles.recordBody}>{notification.body}</Text>
                  <Text style={styles.recordBody}>{displayDate(notification.createdAt)}</Text>
                </View>)}
                {!dashboard?.notifications.length ? <Text style={styles.panelBody}>
                  {dashboard ? 'You are all caught up.' : 'Notifications are not available right now.'}
                </Text> : null}
              </> : null}
              {panel === 'profile' ? <>
                <View style={styles.record}>
                  <Text style={styles.recordTitle}>{user.name}</Text>
                  <Text style={styles.recordBody}>{user.phone ?? 'No phone number linked'}</Text>
                  {user.email ? <Text style={styles.recordBody}>{user.email}</Text> : null}
                  <Text style={styles.recordBody}>Account: {displayStatus(user.role)}</Text>
                </View>
                <PrimaryButton
                  label="Sign Out"
                  arrow={false}
                  onPress={() => {
                    closePanel();
                    onSignOut();
                  }}
                  testID="member-sign-out"
                />
              </> : null}
              {panel === 'support' ? <Text style={styles.panelBody}>For help with bookings, memberships or your account, contact ZAWANA staff through the official support channel you already use.</Text> : null}
              {error ? <AuthErrorMessage message={error} /> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 9,
    paddingBottom: 12
  },
  greeting: { flex: 1, minWidth: 0 },
  eyebrow: { color: authColors.muted, fontSize: 11, lineHeight: 16 },
  memberName: { color: authColors.navy, fontWeight: '700', fontSize: 25, lineHeight: 30 },
  tagline: { color: authColors.muted, fontSize: 9, lineHeight: 14 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  unreadDot: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C84650'
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFEDE6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: { width: 44, height: 44 },
  avatarInitial: { color: authColors.navy, fontWeight: '600', fontSize: 20 },
  hero: { minHeight: 192, overflow: 'hidden' },
  heroCopy: { paddingHorizontal: 23, paddingVertical: 20, alignItems: 'flex-start' },
  heroEyebrow: { color: '#D5C797', fontSize: 8, lineHeight: 13, letterSpacing: 1.5 },
  heroTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 30, lineHeight: 29, marginTop: 4 },
  heroDetail: { color: '#F0F1F4', fontSize: 11, lineHeight: 16, marginTop: 5 },
  heroButton: {
    backgroundColor: '#E5B952',
    borderRadius: 22,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    marginTop: 10
  },
  heroButtonText: { color: authColors.navy, fontWeight: '600', fontSize: 12 },
  body: {
    backgroundColor: authColors.paper,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    marginTop: -8,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, paddingBottom: 16 },
  actionsWrap: { flexWrap: 'wrap' },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionLarge: { flexBasis: '45%' },
  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#F2F2F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionLabel: {
    color: authColors.navy,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  actionDetail: { color: authColors.muted, fontSize: 8, lineHeight: 12, textAlign: 'center' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8
  },
  sectionTitle: {
    color: authColors.navy,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    flexShrink: 1
  },
  smallLink: { color: authColors.navy, fontSize: 10, lineHeight: 16 },
  smallBody: { color: authColors.muted, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  empty: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: authColors.outline
  },
  bookingRow: { padding: 7, gap: 8, marginBottom: 8 },
  bookingImage: { width: 65, height: 57, borderRadius: 8 },
  bookingCopy: { flex: 1, minWidth: 0 },
  bookingDate: { color: authColors.muted, fontSize: 9, lineHeight: 14 },
  bookingTitle: { color: authColors.navy, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  bookingLocation: { color: authColors.muted, fontSize: 9, lineHeight: 14 },
  paymentBadge: {
    borderRadius: 8,
    backgroundColor: '#FBF3DD',
    paddingHorizontal: 6,
    paddingVertical: 4,
    maxWidth: 85
  },
  paymentText: { color: '#926013', fontSize: 9, lineHeight: 13 },
  membership: { marginTop: 7, marginBottom: 16, borderRadius: 12, overflow: 'hidden', minHeight: 120 },
  membershipCopy: { padding: 15, maxWidth: '90%' },
  membershipTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '700', lineHeight: 23 },
  membershipDetail: { color: '#F2F0E9', fontSize: 10, lineHeight: 15, marginTop: 4 },
  membershipLink: { color: '#EBC264', fontSize: 10, lineHeight: 18, fontWeight: '600', marginTop: 5 },
  facility: { width: 93 },
  facilityImage: { width: 93, height: 69, borderRadius: 7, backgroundColor: '#ECECEF' },
  facilityName: { color: authColors.navy, fontSize: 9, lineHeight: 13, fontWeight: '600', marginTop: 4 },
  facilityDetail: { color: authColors.muted, fontSize: 8, lineHeight: 11 },
  navigation: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ECECF0',
    paddingTop: 9,
    backgroundColor: '#FFFFFF'
  },
  navItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4 },
  navLabel: { color: authColors.muted, fontSize: 10, lineHeight: 14 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(16,23,71,0.3)'
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: authColors.paper,
    overflow: 'hidden'
  },
  sheetHeading: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8
  },
  sheetTitle: {
    color: authColors.navy,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '700',
    flexShrink: 1
  },
  closeButton: { minHeight: 44, justifyContent: 'center' },
  link: { color: authColors.goldDark, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  record: {
    padding: 14,
    borderWidth: 1,
    borderColor: authColors.outline,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10
  },
  recordTitle: {
    color: authColors.navy,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    marginBottom: 5
  },
  recordBody: { color: authColors.muted, fontSize: 14, lineHeight: 22 },
  panelBody: { color: authColors.muted, fontSize: 15, lineHeight: 23, marginVertical: 14 },
  panelNotice: { color: authColors.muted, fontSize: 14, lineHeight: 22, marginVertical: 16 },
});
