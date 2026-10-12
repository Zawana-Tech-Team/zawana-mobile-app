import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { useRegistrationDraft } from '@/auth/registration-draft';
import { isEmail } from '@/auth/validation';
import { useFormTask } from '@/hooks/use-form-task';
import { AuthErrorMessage, AuthIcon, AuthLayout, PasswordInput, PrimaryButton, authColors } from '../ui';

export function PasswordScreen() {
  const auth = useAuth();
  const { draft } = useRegistrationDraft();
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const task = useFormTask();
  const submit = () => task.run(async () => {
    Keyboard.dismiss();
    if (!isEmail(draft.email)) throw new Error('Return to Sign In and enter your email address.');
    if (!password) throw new Error('Enter your password.');
    try {
      const status = await auth.signIn(draft.email, password, remember);
      if (status === 'verification-required') router.replace('/verify');
      else if (status === 'profile-required') router.replace('/create-account');
      else if (status !== 'authenticated') throw new Error('Your session could not be validated. Please try again.');
    } finally { setPassword(''); }
  });
  return <AuthLayout title="Enter Your Password" description="Enter your password to sign in.\nYour email must be verified to continue." onBack={() => { setPassword(''); router.back(); }} variant="photo" testID="password-screen">
    <PasswordInput value={password} onChangeText={setPassword} editable={!task.loading} onSubmitEditing={submit} testID="sign-in-password" />
    <Pressable accessibilityRole="button" onPress={() => router.push('/recover')} style={styles.forgot}><Text style={styles.link}>Forgot password?</Text></Pressable>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} accessibilityLabel="Remember this device" onPress={() => setRemember(!remember)} style={styles.remember}>
      <View style={[styles.checkbox, remember && { backgroundColor: authColors.gold }]}>{remember ? <AuthIcon name="check" color="white" size={20} /> : null}</View>
      <Text style={styles.body}>Remember this device</Text>
    </Pressable>
    <AuthErrorMessage message={task.error} />
    <PrimaryButton label="Sign In" onPress={submit} loading={task.loading} testID="password-submit" />
  </AuthLayout>;
}
const styles = StyleSheet.create({
  forgot: { alignItems: 'flex-end', minHeight: 48, justifyContent: 'center' },
  link: { color: authColors.goldDark, textDecorationLine: 'underline', fontSize: 14 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 48, marginBottom: 19 },
  checkbox: { width: 24, height: 24, borderRadius: 5, borderWidth: 1, borderColor: authColors.gold, alignItems: 'center', justifyContent: 'center' },
  body: { color: authColors.muted, fontSize: 14 },
});
