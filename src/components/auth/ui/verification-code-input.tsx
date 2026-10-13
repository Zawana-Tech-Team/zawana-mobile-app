import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { authColors } from './tokens';

export type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  testID?: string;
};

export function VerificationCodeInput({ value, onChange, disabled = false, error, autoFocus = false, onSubmit, testID }: VerificationCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, '').slice(0, 6);
  const activeIndex = Math.min(digits.length, 5);

  return (
    <View>
      <Pressable
        accessible={false}
        disabled={disabled}
        onPress={() => inputRef.current?.focus()}
        style={[styles.codeRow, { opacity: disabled ? 0.55 : 1 }]}
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.boxRow}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.box,
                {
                  borderColor: error ? authColors.error : focused && activeIndex === index ? authColors.goldDark : authColors.outline
                }
              ]}
            >
              <Text style={styles.digit}>{digits[index] ?? ''}</Text>
              {focused && activeIndex === index && !digits[index] ? <View style={styles.cursor} /> : null}
            </View>
          ))}
        </View>
        <TextInput
          ref={inputRef}
          value={digits}
          onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, 6))}
          editable={!disabled}
          autoFocus={autoFocus}
          accessibilityLabel="6-digit verification code"
          keyboardType="number-pad"
          textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
          autoComplete={Platform.OS === 'ios' ? undefined : 'sms-otp'}
          autoCorrect={false}
          autoCapitalize="none"
          caretHidden
          maxLength={12}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmit}
          returnKeyType="done"
          selection={{ start: digits.length, end: digits.length }}
          style={styles.nativeInput}
          testID={testID}
        />
      </Pressable>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  codeRow: { minHeight: 56, position: 'relative' },
  boxRow: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)'
  },
  digit: { fontSize: 24, lineHeight: 34, color: authColors.navy, textAlign: 'center' },
  cursor: { position: 'absolute', width: 2, height: 23, backgroundColor: authColors.navy },
  // One native input provides autofill, paste, deletion and accessibility. The
  // six boxes are its presentation; code contents never enter persistent state.
  nativeInput: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    opacity: 0.02,
    fontSize: 24,
    padding: 0
  },
  error: { color: authColors.error, fontSize: 13, lineHeight: 19, marginTop: 7 },
});
