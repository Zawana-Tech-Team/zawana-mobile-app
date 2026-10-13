import { router } from "expo-router";
import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/auth/auth-provider";
import { useRegistrationDraft } from "@/auth/registration-draft";
import { isEmail, isPhone, passwordRules } from "@/auth/validation";
import { useFormTask } from "@/hooks/use-form-task";
import {
  AuthErrorMessage,
  AuthIcon,
  AuthLayout,
  PasswordInput,
  PrimaryButton,
  authColors,
} from "../ui";

const labels = [
  "At least 8 characters",
  "Include letters and numbers",
  "Include a special character (e.g. @ # $)",
];
export function SetPasswordScreen() {
  const auth = useAuth();
  const { draft } = useRegistrationDraft();
  const task = useFormTask();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const rules = passwordRules(password);
  const submit = () =>
    task.run(async () => {
      Keyboard.dismiss();
      if (
        !isEmail(draft.email) ||
        !isPhone(draft.phone) ||
        draft.name.trim().length < 2
      )
        throw new Error("Return to Create Account and complete your details.");
      if (!rules.every(Boolean))
        throw new Error("Use a password that meets all three requirements.");
      if (password !== confirm) throw new Error("Your passwords do not match.");
      try {
        const status = await auth.signUp(draft.email, password);
        if (status === "profile-required")
          router.replace("/create-account");
        else if (status === "registration-password-required")
          router.replace("/set-password");
        else if (status !== "authenticated")
          throw new Error(
            "Account verification could not be started. Please try again.",
          );
      } finally {
        setPassword("");
        setConfirm("");
      }
    });
  return (
    <AuthLayout
      title="Set a Password"
      description={"Create a secure password\nfor your account."}
      onBack={() => {
        setPassword("");
        setConfirm("");
        router.back();
      }}
      testID="set-password-screen"
    >
      <PasswordInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!task.loading}
        testID="new-password"
      />
      <View style={styles.rules}>
        {labels.map((label, index) => (
          <View key={label} style={styles.rule}>
            <View
              style={[
                styles.circle,
                {
                  backgroundColor: rules[index]
                    ? authColors.success
                    : "#E4E7EE",
                },
              ]}
            >
              <AuthIcon
                name="check"
                size={15}
                color={rules[index] ? "white" : authColors.muted}
              />
            </View>
            <Text style={styles.ruleText}>{label}</Text>
          </View>
        ))}
      </View>
      <PasswordInput
        label="Confirm Password"
        value={confirm}
        onChangeText={setConfirm}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!task.loading}
        onSubmitEditing={submit}
        testID="confirm-password"
      />
      <AuthErrorMessage message={task.error} />
      {!auth.hasPhoneProof && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            task.run(async () => {
              const status = await auth.sendPhoneOtp(draft.phone, "signup");
              if (status === null) router.replace("/verify");
            })
          }
          style={styles.recovery}
        >
          <Text style={styles.recoveryText}>Verify phone again</Text>
        </Pressable>
      )}
      <View style={{ marginTop: 23 }}>
        <PrimaryButton
          label={
            auth.registrationReady ? "Finish Registration" : "Create Account"
          }
          onPress={submit}
          loading={task.loading}
          testID="create-account-submit"
        />
      </View>
      {task.error ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/sign-in")}
          style={styles.recovery}
        >
          <Text style={styles.recoveryText}>
            Already have an account? Sign In
          </Text>
        </Pressable>
      ) : null}
    </AuthLayout>
  );
}
const styles = StyleSheet.create({
  rules: { gap: 8, marginTop: 16, marginBottom: 30 },
  rule: { flexDirection: "row", alignItems: "center", gap: 10 },
  circle: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleText: { fontSize: 13, lineHeight: 19, color: authColors.muted, flex: 1 },
  recovery: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  recoveryText: {
    color: authColors.goldDark,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
