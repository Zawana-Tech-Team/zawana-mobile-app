import { router } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRegistrationDraft } from "@/auth/registration-draft";
import { useAuth } from "@/auth/auth-provider";
import { useFormTask } from "@/hooks/use-form-task";
import { isEmail, isPhone, normalizePhone } from "@/auth/validation";
import {
  AuthErrorMessage,
  AuthLayout,
  AuthTextInput,
  FooterServices,
  PrimaryButton,
  authColors,
} from "../ui";

export function IdentifierScreen({ signup = false }: { signup?: boolean }) {
  const { draft, update } = useRegistrationDraft();
  const auth = useAuth();
  const task = useFormTask();
  const [channel, setChannel] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const title = signup ? "Sign Up" : "Sign In";
  const submit = () =>
    task.run(async () => {
      Keyboard.dismiss();
      setError(null);
      if (channel === "phone") {
        const normalized = normalizePhone(phone);
        if (!isPhone(normalized)) {
          setError("Enter a valid Myanmar mobile phone number.");
          return;
        }
        update({ phone: normalized });
        const status = await auth.sendPhoneOtp(
          normalized,
          signup ? "signup" : "signin",
        );
        if (status === null) router.push("/verify");
        else if (status === "profile-required")
          router.replace("/create-account");
        else if (status === "password-required" || status === "link-required")
          router.replace("/password");
        else if (status === "registration-password-required")
          router.replace("/set-password");
        else if (status !== "authenticated")
          throw new Error(
            "ZAWANA could not validate the verified phone session. Please retry.",
          );
        return;
      }
      if (!isEmail(draft.email)) {
        setError("Enter a valid email address.");
        return;
      }
      const existing = await auth.api.accountCheck({ email: draft.email.trim().toLowerCase() });
      if (signup && existing.emailExists) throw new Error("This email already has a ZAWANA account. Sign in instead.");
      if (!signup && !existing.emailExists) throw new Error("No ZAWANA account uses this email. Create an account first.");
      router.push(signup ? "/profile-setup" : "/password");
    });
  return (
    <AuthLayout
      title={title}
      description={
        channel === "phone"
          ? `Enter your phone number\nto ${signup ? "create" : "access"} your ZAWANA account.`
          : `Enter your email address\nto ${signup ? "create" : "access"} your ZAWANA account.`
      }
      variant="photo"
      onBack={() => {
        void auth
          .cancelPhoneOtp()
          .catch(() =>
            task.setError("Could not clear verification. Please retry."),
          );
        router.back();
      }}
      footer={<FooterServices />}
      testID={signup ? "sign-up-screen" : "sign-in-screen"}
    >
      {channel === "phone" ? (
        <View style={styles.phoneRow}>
          <View accessibilityLabel="Myanmar country calling code +95" style={styles.country}>
            <View style={styles.flag}>
              <View style={{ flex: 1, backgroundColor: "#FECB00" }} />
              <View style={{ flex: 1, backgroundColor: "#34B233" }} />
              <View style={{ flex: 1, backgroundColor: "#EA2839" }} />
            </View>
            <Text style={styles.countryText}>+95</Text>
          </View>
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
        </View>
      ) : (
        <AuthTextInput
          value={draft.email}
          onChangeText={(email) => update({ email })}
          label="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          maxLength={254}
          onSubmitEditing={submit}
          testID="email-input"
        />
      )}
      <AuthErrorMessage message={error ?? task.error} />
      <PrimaryButton
        label={channel === "phone" ? "Send Verification Code" : "Continue"}
        onPress={submit}
        loading={task.loading}
        testID="identifier-submit"
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void auth.cancelPhoneOtp();
          setChannel(channel === "phone" ? "email" : "phone");
          setError(null);
        }}
        style={styles.alternative}
      >
        <Text style={styles.link}>
          {channel === "phone"
            ? "Use your existing email account"
            : "Use phone number"}
        </Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  country: {
    borderWidth: 1,
    borderColor: authColors.outline,
    borderRadius: 10,
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    backgroundColor: "#FFFFFFD9",
  },
  flag: { width: 24, height: 24, borderRadius: 12, overflow: "hidden" },
  countryText: { fontSize: 17, color: authColors.navy },
  alternative: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 12,
  },
  link: {
    color: authColors.goldDark,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
