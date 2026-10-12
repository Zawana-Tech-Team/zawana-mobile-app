import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { useRegistrationDraft } from '@/auth/registration-draft';
import { isDateOfBirth, isEmail, isPhone } from '@/auth/validation';
import { useFormTask } from '@/hooks/use-form-task';
import { AuthErrorMessage, AuthIcon, AuthLayout, AuthTextInput, PrimaryButton, authColors } from '../ui';

export function CreateAccountScreen() {
  const auth = useAuth();
  const { draft, update } = useRegistrationDraft();
  const task = useFormTask();
  const [genderOpen, setGenderOpen] = useState(false);
  const submit = () => task.run(async () => {
    Keyboard.dismiss();
    if (draft.name.trim().length < 2 || draft.name.trim().length > 100) throw new Error('Enter your full name (2–100 characters).');
    if (!isEmail(draft.email)) throw new Error('Enter your email address. The current ZAWANA account requires a verified email.');
    if (!isPhone(draft.phone)) throw new Error('Enter your contact phone in international format, for example +959123456789.');
    if (!isDateOfBirth(draft.dateOfBirth ?? '')) throw new Error('Use a valid date of birth in YYYY-MM-DD format.');
    if (auth.identity?.emailVerified) {
      const status = await auth.completeProfile({ name: draft.name, phone: draft.phone });
      if (status === 'authenticated') router.replace('/complete');
    } else router.push('/set-password');
  });
  const openPolicy = (kind: 'terms' | 'privacy') => task.run(async () => {
    const url = kind === 'terms' ? process.env.EXPO_PUBLIC_TERMS_URL : process.env.EXPO_PUBLIC_PRIVACY_URL;
    if (!url || !/^https:\/\//.test(url)) throw new Error('This policy link is not configured yet. Contact ZAWANA staff before completing registration.');
    await Linking.openURL(url);
  });
  return <AuthLayout title="Create Your Account" description={'Tell us a bit about yourself\nto get started.'} centered onBack={() => router.back()} logoSize={124} contentStyle={{ paddingTop: 20 }} testID="create-account-screen">
    <View style={styles.fields}>
      <AuthTextInput label="Full Name" labelPlacement="inside" icon="person" value={draft.name} onChangeText={name => update({ name })} autoComplete="name" maxLength={100} testID="full-name" />
      <AuthTextInput label="Email address" labelPlacement="inside" value={draft.email} onChangeText={email => update({ email })} editable={!auth.identity} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" testID="account-email" />
      <AuthTextInput label="Phone Number" labelPlacement="inside" icon="phone" value={draft.phone} onChangeText={phone => update({ phone })} keyboardType="phone-pad" autoComplete="tel" placeholder="+95 9 123 456 789" maxLength={20} testID="account-phone" />
      {auth.identity?.emailVerified ? <View style={styles.verified}><AuthIcon name="check" color={authColors.success} /><Text style={styles.verifiedText}>Email address verified</Text></View> : null}
      <AuthTextInput label="Date of Birth (Optional)" labelPlacement="inside" icon="calendar" value={draft.dateOfBirth ?? ''} onChangeText={dateOfBirth => update({ dateOfBirth })} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} testID="date-of-birth" />
      <Pressable accessibilityRole="button" accessibilityLabel="Choose gender" onPress={() => setGenderOpen(true)} style={styles.gender}><AuthIcon name="person" color={authColors.muted} /><View style={{ flex: 1 }}><Text style={styles.caption}>Gender (Optional)</Text><Text style={styles.genderValue}>{draft.gender || 'Select'}</Text></View><AuthIcon name="chevron-down" /></Pressable>
    </View>
    <Text style={styles.localNotice}>Date of birth, gender, and interests are kept on this device while extended member profiles are being added.</Text>
    <AuthErrorMessage message={task.error} />
    <PrimaryButton label="Continue" onPress={submit} loading={task.loading} testID="account-continue" />
    <Text style={styles.terms}>By continuing, you agree to our</Text>
    <View style={styles.policyRow}><Pressable accessibilityRole="link" onPress={() => openPolicy('terms')} style={styles.policy}><Text style={styles.policyText}>Terms of Service</Text></Pressable><Text style={styles.caption}>and</Text><Pressable accessibilityRole="link" onPress={() => openPolicy('privacy')} style={styles.policy}><Text style={styles.policyText}>Privacy Policy</Text></Pressable></View>
    <Modal transparent animationType="fade" visible={genderOpen} onRequestClose={() => setGenderOpen(false)}><View style={styles.backdrop}><View accessibilityViewIsModal style={styles.card}><Text style={styles.genderTitle}>Gender</Text>{['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(gender => <Pressable key={gender} accessibilityRole="button" onPress={() => { update({ gender }); setGenderOpen(false); }} style={styles.option}><Text style={styles.genderValue}>{gender}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={() => setGenderOpen(false)} style={styles.option}><Text style={styles.policyText}>Cancel</Text></Pressable></View></View></Modal>
  </AuthLayout>;
}
const styles = StyleSheet.create({
  fields: { gap: 13 }, gender: { minHeight: 58, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: authColors.outline, borderRadius: 10, backgroundColor: '#FFFFFFCC' },
  caption: { color: authColors.muted, fontSize: 12, lineHeight: 18 }, genderValue: { color: authColors.navy, fontSize: 17 },
  verified: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EAF8F1', padding: 10, borderRadius: 10 }, verifiedText: { color: authColors.success, fontSize: 13 },
  localNotice: { color: authColors.muted, fontSize: 12, lineHeight: 18, marginVertical: 14 },
  terms: { marginTop: 12, color: authColors.muted, fontSize: 13, textAlign: 'center' },
  policyRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4 }, policy: { minHeight: 44, justifyContent: 'center' }, policyText: { color: authColors.navy, textDecorationLine: 'underline', fontSize: 13 },
  backdrop: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10174755' }, card: { padding: 24, width: '100%', maxWidth: 350, backgroundColor: 'white', borderRadius: 22 }, genderTitle: { fontSize: 22, color: authColors.navy, fontWeight: '700' }, option: { minHeight: 48, paddingVertical: 12 },
});
