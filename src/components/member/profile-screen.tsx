import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useFormTask } from '@/hooks/use-form-task';
import { Avatar } from './membership-card';
import { Confirm, MemberPage, s } from './ui';
import { DetailSheet, QuietRow } from '../shared/quiet-ui';
import { Fact } from '../attendance/ui';
export function ProfileScreen() {
 const { user, signOut } = useAuth(), task = useFormTask(), [logout, setLogout] = useState(false), [account, setAccount] = useState(false);
 if (!user) return null;
 return <MemberPage title="Your profile." sectionLabel="ZAWANA MEMBER" tab="Profile">
  <View style={[s.split, { paddingVertical: 12 }]}><Avatar user={user} /><View style={{ flex: 1, gap: 6 }}><Text style={s.sectionTitle}>{user.name}</Text><Text style={s.caption}>{user.email}</Text></View></View>
  <QuietRow title="Account details" icon="person" onPress={() => setAccount(true)} />
  <QuietRow title="Notifications" icon="bell" onPress={() => router.push('/(member)/notifications')} />
  <QuietRow title="My packages" icon="retail" onPress={() => router.push('/(member)/membership')} />
  <QuietRow title="Attendance & history" icon="calendar" onPress={() => router.push('/(member)/attendance')} />
  <QuietRow title="Payment records" icon="retail" onPress={() => router.push('/(member)/payments')} />
  <QuietRow title="My private courses" icon="badminton" onPress={() => router.push('/(member)/courses')} />
  <QuietRow title="Sign out" icon="lock" onPress={() => setLogout(true)} />
  <DetailSheet title="Account details" visible={account} onClose={() => setAccount(false)}><Fact label="Name" value={user.name} /><Fact label="Email" value={user.email ?? 'Not added'} /><Fact label="Phone" value={user.phone ?? 'Not added'} /><Text style={s.caption}>Display size and reduced motion follow your device’s accessibility settings.</Text></DetailSheet>
  <Confirm visible={logout} title="Sign out?" body="Your saved session on this device will be removed." label="Sign out" busy={task.loading} error={task.error} onClose={() => setLogout(false)} onConfirm={() => void task.run(signOut)} />
 </MemberPage>;
}
