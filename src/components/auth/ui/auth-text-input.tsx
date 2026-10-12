import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';

import { AuthIcon, type AuthIconName } from './auth-icon';
import { authColors, authText } from './tokens';

export type AuthTextInputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  labelPlacement?: 'above' | 'inside';
  error?: string;
  icon?: AuthIconName;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export const AuthTextInput = forwardRef<TextInput, AuthTextInputProps>(function AuthTextInput({ label, labelPlacement = 'above', error, icon, trailing, style, inputStyle, onFocus, onBlur, editable = true, accessibilityLabel, ...inputProps }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {label && labelPlacement === 'above' ? <Text style={[authText.label, styles.aboveLabel]}>{label}</Text> : null}
      <View style={[styles.field, { borderColor: error ? authColors.error : focused ? authColors.goldDark : authColors.outline, opacity: editable ? 1 : 0.75 }]}>
        {icon ? <AuthIcon name={icon} color={authColors.muted} /> : null}
        <View style={[styles.inputContent, label && labelPlacement === 'inside' ? styles.compactContent : null]}>
          {label && labelPlacement === 'inside' ? <Text style={styles.insideLabel}>{label}</Text> : null}
          <TextInput
            ref={ref}
            {...inputProps}
            editable={editable}
            accessibilityLabel={accessibilityLabel ?? label ?? inputProps.placeholder}
            placeholderTextColor={authColors.muted}
            selectionColor={authColors.goldDark}
            onFocus={(event) => { setFocused(true); onFocus?.(event); }}
            onBlur={(event) => { setFocused(false); onBlur?.(event); }}
            style={[styles.input, label && labelPlacement === 'inside' ? styles.compactInput : null, inputStyle]}
          />
        </View>
        {trailing}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
});

export type PasswordInputProps = Omit<AuthTextInputProps, 'icon' | 'trailing' | 'secureTextEntry'>;

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthTextInput
      ref={ref}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="current-password"
      placeholder="Password"
      {...props}
      secureTextEntry={!visible}
      icon="lock"
      trailing={
        <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} accessibilityState={{ checked: visible }} onPress={() => setVisible((previous) => !previous)} style={styles.visibility} testID={props.testID ? `${props.testID}-visibility` : undefined}>
          <AuthIcon name={visible ? 'eye-off' : 'eye'} color={authColors.muted} />
        </Pressable>
      }
    />
  );
});

const styles = StyleSheet.create({
  aboveLabel: { marginBottom: 7 },
  field: { minHeight: 56, borderWidth: 1, borderRadius: 10, paddingLeft: 15, paddingRight: 10, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)' },
  inputContent: { flex: 1, minWidth: 0, paddingVertical: 9 },
  compactContent: { paddingVertical: 6 },
  insideLabel: { color: authColors.muted, fontSize: 12, lineHeight: 16 },
  input: { color: authColors.navy, fontSize: 17, lineHeight: 24, paddingVertical: 0, paddingHorizontal: 0, minHeight: 30 },
  compactInput: { minHeight: 26 },
  visibility: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { color: authColors.error, fontSize: 13, lineHeight: 19, marginTop: 6 },
});
