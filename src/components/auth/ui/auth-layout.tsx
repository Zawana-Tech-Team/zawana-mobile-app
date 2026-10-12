import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { PrimaryButton } from './auth-button';
import { ProgressIndicator } from './auth-feedback';
import { AuthIcon } from './auth-icon';
import { BrandLogo } from './brand-logo';
import { authColors, authText } from './tokens';

type AuthVariant = 'photo' | 'plain';

export type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  centered?: boolean;
  onBack?: () => void;
  onHelp?: () => void;
  variant?: AuthVariant;
  progress?: { step: number; total?: number };
  logoSize?: number;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  testID?: string;
  childrenSpacing?: number;
};

export function AuthBackground({ variant = 'plain' }: { variant?: AuthVariant }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {variant === 'photo' ? (
        <View style={styles.photoFrame}>
          <Image source={require('../../../../assets/auth/welcome-building.png')} contentFit="cover" contentPosition="bottom" style={StyleSheet.absoluteFill} accessible={false} />
          <LinearGradient colors={[authColors.paper, 'rgba(255,254,252,0.98)', 'rgba(255,254,252,0.45)', 'rgba(255,254,252,0)']} locations={[0, 0.15, 0.43, 0.74]} style={StyleSheet.absoluteFill} />
        </View>
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="none" accessible={false}>
          <Path d="M390 280C282 490 100 637 0 792V844H390Z" fill="#F8F4EA" fillOpacity={0.48} />
          <Path d="M390 620C284 731 134 789 0 844H390Z" fill="#F1E9D8" fillOpacity={0.32} />
        </Svg>
      )}
    </View>
  );
}

export function AuthHeader({ onBack, onHelp }: { onBack?: () => void; onHelp: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => { Keyboard.dismiss(); onBack(); }} style={styles.headerButton} testID="auth-back">
          <AuthIcon name="back" size={24} />
        </Pressable>
      ) : <View style={styles.headerButton} />}
      <Pressable accessibilityRole="button" accessibilityLabel="Get help with your account" onPress={() => { Keyboard.dismiss(); onHelp(); }} style={styles.helpButton} testID="auth-help">
        <Text style={styles.helpText}>Need Help?</Text>
        <AuthIcon name="help" size={21} />
      </Pressable>
    </View>
  );
}

export function AuthLayout({ children, title, description, centered = false, onBack, onHelp, variant = 'plain', progress, logoSize = 140, contentStyle, footer, testID, childrenSpacing = 22 }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [helpVisible, setHelpVisible] = useState(false);
  const scale = Math.min(width, 460) / 390;
  const top = Math.max(insets.top + 2, 46 * scale);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <View style={styles.screen} testID={testID}>
          <AuthBackground variant={variant} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} contentContainerStyle={{ minHeight: height, paddingBottom: Math.max(insets.bottom + 22, 28) }}>
            <View style={{ paddingTop: top }}>
              <AuthHeader onBack={onBack} onHelp={onHelp ?? (() => setHelpVisible(true))} />
              <BrandLogo size={logoSize * scale} style={{ marginTop: -22 * scale }} />
            </View>
            <View style={[styles.content, { paddingTop: 42 * scale }, contentStyle]}>
              {progress ? <ProgressIndicator step={progress.step} total={progress.total} style={{ marginBottom: 26 }} /> : null}
              {title ? <Text accessibilityRole="header" style={[authText.title, centered ? styles.centered : null]}>{title}</Text> : null}
              {description ? <Text style={[authText.body, styles.description, centered ? styles.centered : null]}>{description}</Text> : null}
              <View style={{ marginTop: title || description ? childrenSpacing : 0 }}>{children}</View>
            </View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {helpVisible ? <Modal transparent visible animationType="fade" onRequestClose={() => setHelpVisible(false)}>
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View accessibilityViewIsModal style={[styles.modalCard, { maxHeight: height - insets.top - insets.bottom - 48 }]}>
            <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
              <Text accessibilityRole="header" style={styles.modalTitle}>Need a hand?</Text>
              <Text style={[authText.body, { marginTop: 12, marginBottom: 22 }]}>Check that your phone number is correct and that you can receive verification messages. If you cannot access your account, contact ZAWANA staff through the official support channel you already use.</Text>
              <PrimaryButton label="Got it" arrow={false} onPress={() => setHelpVisible(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: authColors.paper },
  keyboard: { flex: 1, width: '100%', maxWidth: 460 },
  screen: { flex: 1, overflow: 'hidden', backgroundColor: authColors.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 },
  headerButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  helpButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 },
  helpText: { fontSize: 14, color: authColors.navy },
  content: { paddingHorizontal: 26 },
  centered: { textAlign: 'center' },
  description: { marginTop: 8 },
  footer: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingTop: 34, minHeight: 150 },
  photoFrame: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,23,71,0.28)', paddingHorizontal: 24 },
  modalCard: { width: '100%', maxWidth: 390, borderRadius: 22, backgroundColor: authColors.paper, overflow: 'hidden' },
  modalTitle: { color: authColors.navy, fontSize: 23, lineHeight: 30, fontWeight: '700' },
});
