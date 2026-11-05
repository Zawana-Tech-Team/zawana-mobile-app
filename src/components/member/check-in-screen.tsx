import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { categoryLabel, parseCheckInQr, type QrResult } from "@/attendance/domain";
import { useResource } from "@/booking/use-resource";
import { brand } from "@/design/tokens";
import { useFormTask } from "@/hooks/use-form-task";
import { AuthIcon } from "../auth/ui/auth-icon";
import { a, Fact } from "../attendance/ui";
import { Button, MemberPage, Notice, shortDate } from "./ui";

export function CheckInScreen() {
  const { api, user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(false);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<QrResult | null>(null);
  const scanLock = useRef(false);
  const task = useFormTask();
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); setCamera(false); };
  }, []));
  useEffect(() => {
    const listener = AppState.addEventListener("change", value => setForeground(value === "active"));
    return () => listener.remove();
  }, []);
  const preview = useResource(useCallback((signal: AbortSignal) => api.previewCheckIn(token, { signal }), [api, token]), `${user?.id}:${token}`, !!token && !result && !task.loading);
  const accept = (value: string) => {
    if (scanLock.current) return;
    try {
      const code = parseCheckInQr(value);
      scanLock.current = true;
      task.setError(null);
      setToken(code);
      setInput("");
      setCamera(false);
    } catch (error) {
      setCamera(false);
      task.setError(error instanceof Error ? error.message : "Scan a ZAWANA front desk code.");
    }
  };
  const reset = () => {
    setToken(""); setInput(""); setResult(null); setCamera(false);
    scanLock.current = false; task.setError(null);
  };
  return <MemberPage title={result ? "You’re checked in." : "Your next rally starts here."} subtitle={result ? "Attendance confirmed by ZAWANA." : "Scan the QR code displayed at the front desk."} tab="Badminton" back>
    <View style={styles.hero}>
      <AuthIcon name={result ? "check" : "camera"} color={brand.gold} size={44} />
      <Text style={styles.heroTitle}>{result ? "Make every rally count." : "Arrive. Scan. Play."}</Text>
      <Text style={styles.heroBody}>Your category and eligible package are verified before a session is used.</Text>
    </View>
    <Notice error={task.error} />
    {result ? <View style={a.card} accessibilityLiveRegion="polite">
      <Text style={a.kicker}>{categoryLabel(result.categoryCode).toUpperCase()} · CHECK-IN CONFIRMED</Text>
      <Text style={a.title}>{result.enrollment.packageName}</Text>
      <Fact label="Sessions deducted" value={String(result.sessionsDeducted)} />
      <Fact label="Remaining sessions" value={String(result.enrollment.sessionsRemaining)} />
      <Fact label="Check-in reference" value={result.checkInId} />
      <Button label="View my attendance" onPress={() => router.replace("/(member)/attendance")} />
      <Button secondary label="Check in to another category" onPress={reset} />
    </View> : token ? <View style={a.card}>
      <Notice loading={preview.loading} error={preview.error} onRetry={preview.retry} />
      {preview.data ? <>
        <Text style={a.kicker}>{categoryLabel(preview.data.categoryCode).toUpperCase()} PACKAGE</Text>
        <Text style={a.title}>{preview.data.enrollment.packageName}</Text>
        <Fact label="Current balance" value={`${preview.data.enrollment.sessionsRemaining} sessions`} />
        <Fact label="This visit" value={`${preview.data.sessionsDeducted} session`} />
        <Fact label="After check-in" value={`${preview.data.expectedRemaining} remaining`} />
        <Fact label="Valid until" value={shortDate(preview.data.enrollment.expiryDate)} />
        <Text style={a.muted}>ZAWANA checks the package and final balance again when you confirm.</Text>
      </> : null}
      <Button label="Confirm check-in" busy={task.loading} disabled={!preview.data || preview.loading} onPress={() => void task.run(async () => {
        const confirmed = await api.confirmCheckIn(token);
        setResult(confirmed);
        setToken("");
      })} />
      <Button secondary label="Scan another code" disabled={task.loading} onPress={reset} />
      <Text style={a.muted}>If the connection drops, check Attendance before trying again. The server prevents a second deduction for the same category today.</Text>
    </View> : <>
      {camera && permission?.granted && focused && foreground ? <View style={styles.camera}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => accept(data)} onMountError={() => { setCamera(false); task.setError("Camera could not start. Open device settings or paste the front desk QR link below."); }} />
      </View> : null}
      <Button label={camera ? "Stop camera" : "Scan front desk QR"} onPress={() => void task.run(async () => {
        if (camera) { setCamera(false); return; }
        if (!permission?.granted) {
          if (permission && !permission.canAskAgain) { await Linking.openSettings(); return; }
          const granted = await requestPermission();
          if (!granted.granted) { task.setError("Camera access is needed to scan. You can also paste the front desk QR link below."); return; }
        }
        setCamera(true);
      })} busy={task.loading} />
      <View style={a.card}>
        <Text style={a.title}>Have the front desk link?</Text>
        <Text style={a.muted}>Paste the complete ZAWANA QR link to review your package.</Text>
        <TextInput accessibilityLabel="Front desk QR link" placeholder="https://thezawana.com/check-in#…" placeholderTextColor={brand.muted} value={input} onChangeText={setInput} autoCapitalize="none" autoCorrect={false} secureTextEntry style={styles.input} />
        <Button secondary label="Review check-in" disabled={!input.trim()} onPress={() => accept(input)} />
      </View>
      <Button secondary label="View attendance history" onPress={() => router.push("/(member)/attendance")} />
    </>}
  </MemberPage>;
}
const styles = StyleSheet.create({
  hero: { backgroundColor: brand.ink, borderRadius: 24, padding: 26, gap: 18 },
  heroTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 27, letterSpacing: -0.6 },
  heroBody: { color: "#D1D5DB", fontSize: 14, lineHeight: 22 },
  camera: { height: 290, borderRadius: 24, overflow: "hidden", backgroundColor: brand.ink },
  input: { minHeight: 52, borderWidth: 1, borderColor: brand.border, borderRadius: 12, padding: 14, color: brand.ink },
});
