import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AuthIcon, type AuthIconName } from './auth-icon';
import { authColors } from './tokens';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  arrow?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

export function PrimaryButton({ label, onPress, loading = false, disabled = false, arrow = true, style, accessibilityLabel, testID }: PrimaryButtonProps) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.primary, { opacity: unavailable ? 0.55 : pressed ? 0.8 : 1 }, style]}
    >
      <LinearGradient pointerEvents="none" colors={['#E5B951', '#DCAF49', '#E3B74E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryContent}>
        {loading ? <ActivityIndicator color={authColors.navy} /> : null}
        <Text style={styles.primaryText}>{label}</Text>
        {arrow && !loading ? <AuthIcon name="arrow" color="#151411" size={23} /> : null}
      </LinearGradient>
    </Pressable>
  );
}

type SecondaryButtonProps = Omit<PrimaryButtonProps, 'arrow'> & { icon?: AuthIconName };

export function SecondaryButton({ label, onPress, loading = false, disabled = false, style, icon, accessibilityLabel, testID }: SecondaryButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} testID={testID} style={({ pressed }) => [styles.secondary, { opacity: disabled || loading ? 0.55 : pressed ? 0.7 : 1 }, style]}>
      <View style={styles.secondaryContent}>
        {loading ? <ActivityIndicator color={authColors.navy} /> : icon ? <AuthIcon name={icon} /> : null}
        <Text style={styles.secondaryText}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: { overflow: 'hidden', borderRadius: 10 },
  primaryContent: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#151411', fontWeight: '600', fontSize: 17, lineHeight: 24, textAlign: 'center', flexShrink: 1 },
  secondary: { borderColor: authColors.outline, borderWidth: 1, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.65)' },
  secondaryContent: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: authColors.navy, fontWeight: '600', fontSize: 16, lineHeight: 24, textAlign: 'center', flexShrink: 1 },
});
