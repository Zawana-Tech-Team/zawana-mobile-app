import { useCallback } from 'react';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { Text, View } from 'react-native';
import { useMemberNotifications } from '@/notifications/provider';
import { brand } from '@/design/tokens';
import { SelectionPressable } from '../booking/selection-pressable';
import { AuthIcon } from '../auth/ui/auth-icon';
export function NotificationBell() {
 const { unread, refresh } = useMemberNotifications(), path = usePathname();
 useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
 if (path === '/notifications') return <View style={{ width: 44, height: 44 }} />;
 return <SelectionPressable accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`} testID="member-notifications" onPress={() => router.push('/(member)/notifications')} style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
  <AuthIcon name="bell" color={brand.navy} />{unread > 0 ? <View style={{ position: 'absolute', right: 0, top: 0, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, backgroundColor: brand.gold, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: brand.navy, fontWeight: '700', fontSize: 9 }}>{unread > 99 ? '99+' : unread}</Text></View> : null}
 </SelectionPressable>;
}
