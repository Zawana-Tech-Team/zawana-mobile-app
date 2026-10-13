import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/auth/auth-provider";
import { useRegistrationDraft } from "@/auth/registration-draft";
import { useFormTask } from "@/hooks/use-form-task";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import {
  AuthErrorMessage,
  AuthLayout,
  FooterServices,
  PrimaryButton,
  SecondaryButton,
  VerificationCodeInput,
  authColors,
} from "../ui";

export function VerifyScreen() {
  const auth = useAuth();
  const { draft } = useRegistrationDraft();
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const task = useFormTask();
  const deadline = auth.phoneChallenge?.resendAt ?? 0;
  const phoneNumber = auth.phoneChallenge?.phone ?? draft.phone;
  const displayPhone =
    parsePhoneNumberFromString(phoneNumber)?.formatInternational() ??
    phoneNumber;
  const edit = () => {
    setCode("");
    void auth
      .cancelPhoneOtp()
      .then(() => router.replace("/sign-in"))
      .catch(() =>
        task.setError("Could not clear verification. Please retry."),
      );
  };
  useEffect(() => {
    if (!deadline) return;
    const update = () =>
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const send = () =>
    task.run(async () => {
      if (deadline > Date.now()) return;
      if (!phoneNumber)
        throw new Error("Return to Sign In and enter a mobile phone number.");
      const status = await auth.sendPhoneOtp(phoneNumber);
      if (status === "profile-required") router.replace("/create-account");
      else if (status === "password-required" || status === "link-required") router.replace("/password");
      else if (status === "registration-password-required") router.replace("/set-password");
      else if (status && status !== "authenticated") throw new Error("ZAWANA could not validate the phone session. Please retry.");
    });
  const verify = () =>
    task.run(async () => {
      const submittedCode = code;
      setCode("");
      const status = await auth.verifyPhoneOtp(submittedCode);
      if (status === "profile-required") router.replace("/create-account");
      else if (status === "password-required" || status === "link-required") router.replace("/password");
      else if (status === "registration-password-required") router.replace("/set-password");
      else if (status !== "authenticated") throw new Error("Your phone was verified, but ZAWANA could not authorize the member session. Please retry.");
    });
  return (
    <AuthLayout
      title="Verify Your Number"
      centered
      description="We’ve sent a 6-digit code to"
      onBack={edit}
      variant="photo"
      childrenSpacing={0}
      contentStyle={{ paddingTop: 26, paddingHorizontal: 29 }}
      footer={<FooterServices />}
      testID="verify-screen"
    >
      <View style={styles.identity}>
        <Text style={styles.number}>
          {displayPhone || "your phone number"}
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={edit}
          style={styles.edit}
        >
          <Text style={styles.link}>Edit</Text>
        </Pressable>
      </View>
      <VerificationCodeInput
        value={code}
        onChange={setCode}
        onSubmit={verify}
        autoFocus
        disabled={task.loading || !auth.phoneChallenge?.resumable}
        testID="verification-code"
      />
      {!auth.phoneChallenge?.resumable ? (
        <Text style={styles.instructions}>
          Request a new SMS code to continue. Verification codes and credentials
          are not saved when the app closes.
        </Text>
      ) : null}
      <View style={styles.resend}>
        <Text style={styles.body}>
          Didn’t receive the code?
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={seconds > 0 || task.loading}
          accessibilityState={{ disabled: seconds > 0 || task.loading }}
          onPress={send}
          style={styles.resendButton}
        >
          <Text style={styles.link}>
            {seconds
              ? `Resend in 00:${String(seconds).padStart(2, "0")}`
              : "Resend"}
          </Text>
        </Pressable>
      </View>
      <AuthErrorMessage message={task.error} />
      <PrimaryButton
        label="Verify & Continue"
        onPress={verify}
        loading={task.loading}
        disabled={
          !auth.phoneChallenge?.resumable || code.length !== 6
        }
        testID="verify-submit"
      />
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.body}>or</Text>
        <View style={styles.line} />
      </View>
      <SecondaryButton
        label="Call Me Instead"
        onPress={() => task.setError("Voice verification is not available. Contact ZAWANA staff for account recovery.")}
        icon="phone"
      />
    </AuthLayout>
  );
}
const styles = StyleSheet.create({
  identity: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 21,
  },
  number: {
    color: authColors.navy,
    fontSize: 17,
    textAlign: "center",
    flexShrink: 1,
  },
  edit: { minHeight: 28, justifyContent: "center" },
  link: { color: authColors.goldDark, fontSize: 14 },
  body: { color: authColors.muted, fontSize: 13 },
  instructions: {
    color: authColors.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    paddingVertical: 12,
  },
  resend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 17,
    marginBottom: 13,
  },
  resendButton: { minHeight: 44, justifyContent: "center" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 19,
    marginBottom: 9,
  },
  line: { height: 1, flex: 1, backgroundColor: authColors.outline },
});
