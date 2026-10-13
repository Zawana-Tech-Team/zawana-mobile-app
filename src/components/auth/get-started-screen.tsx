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

import { AppleIcon, ArrowIcon, GoogleIcon } from './auth-icons';
import { BrandLogo } from './ui/brand-logo';

type AuthAction = 'phone' | 'google' | 'apple' | 'signup' | 'help';

type GetStartedScreenProps = {
  /** Wire these actions to authentication as its subsequent screens are implemented. */
  onAction?: (action: AuthAction) => void;
  busy?: boolean;
  error?: string | null;
  appleAvailable?: boolean;
};

const actionTitles: Record<AuthAction, string> = {
  phone: 'Continue with your phone',
  google: 'Continue with Google',
  apple: 'Continue with Apple',
  signup: 'Create your ZAWANA account',
  help: 'Need a hand?',
};

export function GetStartedScreen({ onAction, busy = false, error, appleAvailable = false }: GetStartedScreenProps) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedAction, setSelectedAction] = useState<AuthAction | null>(null);
  const screenWidth = Math.min(width, 460);
  const scale = screenWidth / 390;
  const logoTop = Math.max(insets.top + 8, 63 * scale);
  const largeText = fontScale > 1.2;
  const titleTop = Math.max(213 * scale, logoTop + (largeText ? 150 * scale * fontScale : 145 * scale));
  const heroHeight = Math.max(490 * scale, height * 0.667, titleTop + 159 * scale * fontScale + 110);

  const handleAction = (action: AuthAction) => {
    if (busy && action !== 'help') return;
    if (onAction && action !== 'help') onAction(action);
    else setSelectedAction(action);
  };

  return (
    <View className="flex-1 bg-paper">
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
      >
        <View style={{ width: screenWidth, minHeight: height }}>
          <View testID="welcome-hero" style={[styles.hero, { height: heroHeight }]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Image
                source={require('../../../assets/auth/welcome-building.png')}
                contentFit="cover"
                contentPosition="top"
                style={StyleSheet.absoluteFill}
                accessible={false}
              />
              <LinearGradient
                colors={[
                  'rgba(255,254,252,0)',
                  'rgba(255,254,252,0.72)',
                  'rgba(255,254,252,0)',
                  'rgba(255,254,252,0)'
                ]}
                locations={[0, 0.58, 0.74, 1]}
                style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Need help signing in"
              onPress={() => handleAction('help')}
              hitSlop={14}
              className="absolute flex-row items-center active:opacity-60"
              style={{ right: 22 * scale, top: Math.max(insets.top + 8, 56 * scale), gap: 8 }}
            >
              <Text className="text-navy" style={{ fontSize: 14 * scale }}>Need Help?</Text>
              <View
                className="items-center justify-center rounded-full border-[1.5px] border-navy"
                style={{ width: 18 * scale, height: 18 * scale }}
              >
                <Text className="font-semibold text-navy" style={{ fontSize: 13 * scale, lineHeight: 16 * scale }}>?</Text>
              </View>
            </Pressable>

            <View
              accessibilityLabel="The Zawana, established 2022"
              accessible
              pointerEvents="none"
              className="absolute items-center"
              style={{ top: logoTop, alignSelf: 'center' }}
            >
              <BrandLogo size={140 * scale} />
            </View>

            <View className="absolute" style={{ left: 34 * scale, right: 22 * scale, top: titleTop }}>
              <Text
                accessibilityRole="header"
                className="font-bold text-navy"
                style={{ fontSize: 33 * scale, lineHeight: 37 * scale, letterSpacing: -0.7 }}
              >
                {'Welcome to\nZAWANA'}
              </Text>
              <Text
                style={{
                  color: '#515C76',
                  fontSize: 14.5 * scale,
                  lineHeight: 20 * scale,
                  marginTop: 7 * scale
                }}
              >
                {'One account. One platform.\nYour complete sports and wellness\nexperience.'}
              </Text>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 25 * scale,
              paddingTop: 12 * scale,
              paddingBottom: Math.max(insets.bottom + 18, 38 * scale)
            }}
          >
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              accessibilityState={{ disabled: busy }}
              onPress={() => handleAction('phone')}
              className="overflow-hidden rounded-xl active:opacity-80"
              testID="continue-phone"
            >
              <LinearGradient
                pointerEvents="none"
                colors={['#E3B34C', '#E7BC59', '#E3B34C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  minHeight: Math.max(48, 52 * scale),
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  justifyContent: 'center'
                }}
              >
                <View className="flex-row items-center justify-center" style={{ gap: 18 * scale }}>
                  <Text className="shrink text-center font-semibold text-black" style={{ fontSize: 15 * scale }}>Continue with Phone Number</Text>
                  <ArrowIcon size={22 * scale} />
                </View>
              </LinearGradient>
            </Pressable>

            <View className="flex-row items-center" style={{ marginVertical: 18 * scale, gap: 14 * scale }}>
              <View className="h-px flex-1 bg-outline" />
              <Text className="text-muted" style={{ fontSize: 14 * scale }}>or continue with</Text>
              <View className="h-px flex-1 bg-outline" />
            </View>

            <View style={{ flexDirection: largeText ? 'column' : 'row', gap: 14 * scale }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                onPress={() => handleAction('google')}
                className="flex-1 flex-row items-center justify-center rounded-xl border border-outline bg-white active:bg-gray-50"
                style={[
                  styles.socialButton,
                  { minHeight: Math.max(48, 56 * scale), paddingVertical: 12, gap: 15 * scale }
                ]}
              >
                <GoogleIcon size={30 * scale} />
                <Text className="shrink text-center font-semibold text-navy" style={{ fontSize: 15 * scale }}>Google</Text>
              </Pressable>
              {appleAvailable ? <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                onPress={() => handleAction('apple')}
                className="flex-1 flex-row items-center justify-center rounded-xl border border-outline bg-white active:bg-gray-50"
                style={[
                  styles.socialButton,
                  { minHeight: Math.max(48, 56 * scale), paddingVertical: 12, gap: 16 * scale }
                ]}
              >
                <AppleIcon size={30 * scale} />
                <Text className="shrink text-center font-semibold text-navy" style={{ fontSize: 15 * scale }}>Apple</Text>
              </Pressable> : null}
            </View>
            {busy ? <ActivityIndicator color="#101747" style={{ marginTop: 12 }} accessibilityLabel="Signing in" /> : null}
            {error ? <Text accessibilityRole="alert" style={{ color: '#B42336', fontSize: 14, marginTop: 12 }}>
              {error}
            </Text> : null}

            <View
              className="flex-row flex-wrap items-center justify-center"
              style={{ marginTop: 31 * scale, gap: 5 }}
            >
              <Text className="text-muted" style={{ fontSize: 15 * scale }}>Don’t have an account?</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign up for ZAWANA"
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                onPress={() => handleAction('signup')}
                hitSlop={14}
                className="active:opacity-60"
              >
                <Text className="font-semibold" style={{ color: '#A76D10', fontSize: 15 * scale }}>Sign Up</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {selectedAction !== null ? <Modal transparent visible animationType="fade" onRequestClose={() => setSelectedAction(null)}>
        <View
          className="flex-1 items-center justify-center bg-black/30 px-6"
          style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        >
          <View
            accessibilityViewIsModal
            className="w-full max-w-sm rounded-3xl bg-paper"
            style={{ maxHeight: height - insets.top - insets.bottom - 48 }}
          >
            <ScrollView bounces={false} contentContainerStyle={{ padding: 24 }}>
              <Text accessibilityRole="header" className="text-xl font-semibold text-navy">
                {selectedAction ? actionTitles[selectedAction] : ''}
              </Text>
              <Text className="mt-3 text-base leading-6 text-muted">
                {selectedAction === 'help'
                  ? 'Choose Continue to sign in, or Sign Up to create an account. Contact ZAWANA staff if you need help recovering access.'
                  : 'This sign-in provider is not configured for the mobile app yet. Please use the available sign-in method.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedAction(null)}
                className="mt-6 items-center rounded-xl bg-gold py-3 active:opacity-80"
              >
                <Text className="font-semibold text-navy">Got it</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  socialButton: { boxShadow: '0 2px 5px rgba(16, 23, 71, 0.05)' },
});
