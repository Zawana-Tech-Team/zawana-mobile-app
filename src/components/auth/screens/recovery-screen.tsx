import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { useRegistrationDraft } from '@/auth/registration-draft';
import { isEmail } from '@/auth/validation';
import { useFormTask } from '@/hooks/use-form-task';
import { AuthErrorMessage, AuthLayout, AuthTextInput, PrimaryButton, authColors } from '../ui';

export function RecoveryScreen() {
  const auth = useAuth();
  const { draft, update } = useRegistrationDraft();
  const [sent, setSent] = useState(false);
  const task = useFormTask();
  const submit = () => task.run(async () => {
    if (!isEmail(draft.email)) throw new Error('Enter a valid email address.');
    await auth.requestPasswordReset(draft.email);
    setSent(true);
  });
  return <AuthLayout title="Reset Your Password" description="Enter your account email to request a password reset link." onBack={() => router.back()}>
    <AuthTextInput label="Email address" value={draft.email} onChangeText={email => update({ email })} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!task.loading} />
    <AuthErrorMessage message={task.error} />
    {sent ? <Text accessibilityLiveRegion="polite" style={{ color: authColors.muted, fontSize: 15, lineHeight: 23, marginVertical: 15 }}>If this email can receive a reset message, check your inbox and follow the link. Then return to Sign In.</Text> : null}
    <PrimaryButton label={sent ? 'Back to Sign In' : 'Send Reset Link'} loading={task.loading} onPress={sent ? () => router.replace('/sign-in') : submit} />
  </AuthLayout>;
}
