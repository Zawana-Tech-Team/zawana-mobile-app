import '../global.css';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { sessionNavigation } from '@/auth/navigation-policy';

export default function RootLayout() {
  return <AuthProvider><SessionNavigator /></AuthProvider>;
}

function SessionNavigator() {
  const auth = useAuth();
  const policy = sessionNavigation(auth);
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFEFC' } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={policy.authentication}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={policy.member}>
          <Stack.Screen name="(member)" />
        </Stack.Protected>
      </Stack>
      {policy.restoring ? (
        <View style={styles.restoring} accessibilityViewIsModal testID="session-restoring">
          <ActivityIndicator size="large" color="#B69A5B" />
          <Text style={styles.message} accessibilityLiveRegion="polite">Restoring your session…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  restoring: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#FFFEFC' },
  message: { color: '#101747', fontSize: 16 },
});
