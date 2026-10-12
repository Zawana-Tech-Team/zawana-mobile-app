import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { useRegistrationDraft } from '@/auth/registration-draft';
import { useFormTask } from '@/hooks/use-form-task';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { AuthErrorMessage, AuthLayout, FooterServices, PrimaryButton, SecondaryButton, VerificationCodeInput, authColors } from '../ui';

export function VerifyScreen() {
  const auth = useAuth();
  const { draft } = useRegistrationDraft();
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [emailDeadline, setEmailDeadline] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const task = useFormTask();
  const emailVerification = !auth.phoneChallenge && Boolean(auth.identity?.email);
  const deadline = emailVerification ? emailDeadline : auth.phoneChallenge?.resendAt ?? 0;
  const phoneNumber = auth.phoneChallenge?.phone ?? draft.phone;
  const displayPhone = parsePhoneNumberFromString(phoneNumber)?.formatInternational() ?? phoneNumber;
  const edit = () => {
    setCode('');
    void auth.cancelPhoneOtp().then(() => router.replace('/sign-in')).catch(() => task.setError('Could not clear verification. Please retry.'));
  };
  useEffect(() => {
    if (!deadline) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [deadline]);
  const send = () => task.run(async () => {
    if (deadline > Date.now()) return;
    if (!emailVerification) {
      if (!phoneNumber) throw new Error('Return to Sign In and enter a mobile phone number.');
      const status = await auth.sendPhoneOtp(phoneNumber);
      if (status === 'profile-required') router.replace('/create-account');
      else if (status && status !== 'authenticated') throw new Error('ZAWANA could not validate the phone session. Please retry.');
      return;
    }
    await auth.sendVerification();
    setSent(true); setEmailDeadline(Date.now() + 60_000);
  });
  const verify = () => task.run(async () => {
    if (!emailVerification) {
      const submittedCode = code;
      setCode('');
      const status = await auth.verifyPhoneOtp(submittedCode);
      if (status === 'profile-required') router.replace('/create-account');
      else if (status !== 'authenticated') throw new Error('Your identity was verified, but ZAWANA could not authorize the member session. Please retry.');
      return;
    }
    const restored = await auth.checkVerification();
    if (restored === 'verification-required') throw new Error('Your email is not verified yet. Open the latest verification link, then try again.');
    if (restored === 'authenticated') return; // The root guard resets the authentication stack.
    if (restored !== 'profile-required') throw new Error('Your member session could not be validated. Please retry.');
    if (draft.name.trim().length >= 2 && draft.phone) {
      const status = await auth.completeProfile({ name: draft.name, phone: draft.phone });
      if (status === 'authenticated') router.replace('/complete');
      else throw new Error('Your member profile could not be loaded. Please retry.');
    } else router.replace('/create-account');
  });
  return <AuthLayout title={emailVerification ? 'Verify Your Email' : 'Verify Your Number'} centered
    description={emailVerification ? (sent ? 'Open the verification link sent to' : 'Request a verification link for') : 'We’ve sent a 6-digit code to'}
    onBack={emailVerification ? () => router.back() : edit} variant="photo" childrenSpacing={0} contentStyle={{ paddingTop: 26, paddingHorizontal: 29 }} footer={<FooterServices />} testID="verify-screen">
    <View style={styles.identity}><Text style={styles.number}>{emailVerification ? auth.identity?.email : displayPhone || 'your phone number'}</Text>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={emailVerification ? () => router.back() : edit} style={styles.edit}><Text style={styles.link}>Edit</Text></Pressable>
    </View>
    {emailVerification ? <Text style={styles.instructions}>For your security, Firebase verifies the link in your email. Return here after opening it. Never enter an email link into an SMS code field.</Text>
      : <VerificationCodeInput value={code} onChange={setCode} onSubmit={verify} autoFocus disabled={task.loading || !auth.phoneChallenge?.resumable} testID="verification-code" />}
    {!emailVerification && !auth.phoneChallenge?.resumable ? <Text style={styles.instructions}>Request a new SMS code to continue. Verification codes and credentials are not saved when the app closes.</Text> : null}
    <View style={styles.resend}><Text style={styles.body}>{emailVerification ? (sent ? 'Didn’t receive the link?' : 'Need a verification link?') : 'Didn’t receive the code?'}</Text>
      <Pressable accessibilityRole="button" disabled={seconds > 0 || task.loading} accessibilityState={{ disabled: seconds > 0 || task.loading }} onPress={send} style={styles.resendButton}>
        <Text style={styles.link}>{seconds ? `Resend in 00:${String(seconds).padStart(2, '0')}` : emailVerification ? (sent ? 'Resend' : 'Send link') : 'Resend'}</Text>
      </Pressable>
    </View>
    <AuthErrorMessage message={task.error} />
    <PrimaryButton label="Verify & Continue" onPress={verify} loading={task.loading} disabled={!emailVerification && (!auth.phoneChallenge?.resumable || code.length !== 6)} testID="verify-submit" />
    {!emailVerification ? <><View style={styles.divider}><View style={styles.line} /><Text style={styles.body}>or</Text><View style={styles.line} /></View>
      <SecondaryButton label="Call Me Instead" onPress={() => task.setError('Voice verification is not available. Contact ZAWANA staff for account recovery.')} icon="phone" />
    </> : null}
  </AuthLayout>;
}
const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 21 },
  number: { color: authColors.navy, fontSize: 17, textAlign: 'center', flexShrink: 1 },
  edit: { minHeight: 28, justifyContent: 'center' },
  link: { color: authColors.goldDark, fontSize: 14 },
  body: { color: authColors.muted, fontSize: 13 },
  instructions: { color: authColors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', paddingVertical: 12 },
  resend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 17, marginBottom: 13 },
  resendButton: { minHeight: 44, justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 19, marginBottom: 9 },
  line: { height: 1, flex: 1, backgroundColor: authColors.outline },
});
