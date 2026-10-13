import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { authColors } from './tokens';

type ProgressIndicatorProps = { step: number; total?: number; style?: StyleProp<ViewStyle> };

export function ProgressIndicator({ step, total = 3, style }: ProgressIndicatorProps) {
  const count = Math.max(1, Math.floor(total));
  const current = Math.max(0, Math.min(step, count));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Account setup progress"
      accessibilityValue={{ min: 0, max: count, now: current, text: `Step ${current} of ${count}` }}
      style={[styles.progress, style]}
    >
      {Array.from(
        { length: count },
        (_, index) => <View
          key={index}
          style={[
            styles.stroke,
            { backgroundColor: index < current ? authColors.gold : authColors.outline }
          ]}
        />
      )}
    </View>
  );
}

export function AuthErrorMessage({ message }: { message?: string | null }) {
  return message ? (
    <View style={styles.errorBox}>
      <Text accessibilityLiveRegion="polite" style={styles.errorText}>{message}</Text>
    </View>
  ) : null;
}

export function FooterServices({ light = false, style }: { light?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={[styles.services, { color: light ? '#FFFFFF' : authColors.navy }]}>
        {'SPORTS\nFITNESS\nHEALTHCARE\nLIFESTYLE'}
      </Text>
      <View style={styles.servicesUnderline} />
    </View>
  );
}

export function LoadingOverlay({ visible, label = 'Please wait…' }: { visible: boolean; label?: string }) {
  return visible ? (
    <View accessibilityViewIsModal accessibilityLiveRegion="polite" style={styles.loadingOverlay}>
      <View style={styles.loadingCard}>
        <ActivityIndicator color={authColors.goldDark} size="large" />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  progress: { alignSelf: 'center', flexDirection: 'row', width: 192, gap: 8 },
  stroke: { flex: 1, height: 5, borderRadius: 3 },
  errorBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F4CCD2',
    backgroundColor: '#FFF3F4'
  },
  errorText: { color: authColors.error, fontSize: 14, lineHeight: 20 },
  services: { fontSize: 10, lineHeight: 15, letterSpacing: 1.25 },
  servicesUnderline: {
    width: 25,
    height: 3,
    borderRadius: 2,
    marginTop: 12,
    backgroundColor: authColors.gold
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,254,252,0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  loadingCard: {
    padding: 24,
    gap: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center'
  },
  loadingText: { color: authColors.navy, fontSize: 15, lineHeight: 22 },
});
