import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useRegistrationDraft } from '@/auth/registration-draft';
import { useAuth } from '@/auth/auth-provider';
import { useFormTask } from '@/hooks/use-form-task';
import { isEmail, isPhone, normalizePhone } from '@/auth/validation';
import {
  AuthErrorMessage,
  AuthIcon,
  AuthLayout,
  AuthTextInput,
  FooterServices,
  PrimaryButton,
  authColors
} from '../ui';

export function IdentifierScreen({ signup = false }: { signup?: boolean }) {
  const { draft, update } = useRegistrationDraft();
  const auth = useAuth();
  const task = useFormTask();
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [country, setCountry] = useState('+95');
  const [countryOpen, setCountryOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const title = signup ? 'Sign Up' : 'Sign In';
  const submit = () => task.run(async () => {
    Keyboard.dismiss();
    setError(null);
    if (channel === 'phone') {
      const normalized = normalizePhone(phone, country);
      if (!isPhone(normalized)) {
        setError('Enter a valid mobile phone number.');
        return;
      }
      update({ phone: normalized });
      const status = await auth.sendPhoneOtp(normalized);
      if (status === null) router.push('/verify');
      else if (status === 'profile-required') router.replace('/create-account');
      else if (status !== 'authenticated') throw new Error('ZAWANA could not validate the verified phone session. Please retry.');
      return;
    }
    if (!isEmail(draft.email)) {
      setError('Enter a valid email address.');
      return;
    }
    router.push(signup ? '/profile-setup' : '/password');
  });
  return (
    <AuthLayout
      title={title}
      description={channel === 'phone'
        ? `Enter your phone number\nto ${signup ? 'create' : 'access'} your ZAWANA account.`
        : `Enter your email address\nto ${signup ? 'create' : 'access'} your ZAWANA account.`}
      variant="photo"
      onBack={() => {
        void auth.cancelPhoneOtp().catch(() => task.setError('Could not clear verification. Please retry.'));
        router.back();
      }}
      footer={<FooterServices />}
      testID={signup ? 'sign-up-screen' : 'sign-in-screen'}
    >
      {channel === 'phone' ? <View style={styles.phoneRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country calling code ${country}`}
          disabled={task.loading}
          onPress={() => setCountryOpen(true)}
          style={styles.country}
        >
          <View style={styles.flag}>
            <View style={{ flex: 1, backgroundColor: '#FECB00' }} />
            <View style={{ flex: 1, backgroundColor: '#34B233' }} />
            <View style={{ flex: 1, backgroundColor: '#EA2839' }} />
          </View>
          <Text style={styles.countryText}>{country}</Text>
          <AuthIcon name="chevron-down" size={18} />
        </Pressable>
        <AuthTextInput
          style={{ flex: 1 }}
          value={phone}
          editable={!task.loading}
          onChangeText={setPhone}
          placeholder="9 421 234 567"
          accessibilityLabel="Phone number"
          keyboardType="phone-pad"
          autoComplete="tel-national"
          maxLength={20}
          onSubmitEditing={submit}
          testID="phone-input"
        />
      </View> : <AuthTextInput
        value={draft.email}
        onChangeText={email => update({ email })}
        label="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        maxLength={254}
        onSubmitEditing={submit}
        testID="email-input"
      />}
      <AuthErrorMessage message={error ?? task.error} />
      <PrimaryButton
        label={channel === 'phone' ? 'Send Verification Code' : 'Continue'}
        onPress={submit}
        loading={task.loading}
        testID="identifier-submit"
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setChannel(channel === 'phone' ? 'email' : 'phone');
          setError(null);
        }}
        style={styles.alternative}
      >
        <Text style={styles.link}>
          {channel === 'phone' ? 'Use your existing email account' : 'Use phone number'}
        </Text>
      </Pressable>
      <Modal
        transparent
        visible={countryOpen}
        animationType="fade"
        onRequestClose={() => setCountryOpen(false)}
      >
        <View style={styles.backdrop}>
          <View accessibilityViewIsModal style={styles.countryCard}>
            <Text style={styles.countryTitle}>Country calling code</Text>
            {['+95', '+66', '+65'].map(code => <Pressable
              key={code}
              accessibilityRole="button"
              onPress={() => {
                setCountry(code);
                setCountryOpen(false);
              }}
              style={styles.countryOption}
            >
              <Text style={styles.countryText}>{code === '+95' ? 'Myanmar' : code === '+66' ? 'Thailand' : 'Singapore'}  {code}</Text>
            </Pressable>)}
            <Pressable
              accessibilityRole="button"
              onPress={() => setCountryOpen(false)}
              style={styles.countryOption}
            >
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  country: {
    borderWidth: 1,
    borderColor: authColors.outline,
    borderRadius: 10,
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    backgroundColor: '#FFFFFFD9'
  },
  flag: { width: 24, height: 24, borderRadius: 12, overflow: 'hidden' },
  countryText: { fontSize: 17, color: authColors.navy },
  alternative: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 12 },
  link: { color: authColors.goldDark, fontSize: 14, textDecorationLine: 'underline' },
  backdrop: {
    flex: 1,
    backgroundColor: '#10174755',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  countryCard: { width: '100%', maxWidth: 350, borderRadius: 22, backgroundColor: 'white', padding: 20 },
  countryTitle: { fontSize: 22, fontWeight: '700', color: authColors.navy, marginBottom: 12 },
  countryOption: { paddingVertical: 15, minHeight: 48 },
});
