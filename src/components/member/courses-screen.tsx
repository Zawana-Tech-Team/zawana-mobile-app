import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/auth/auth-provider";
import { AuthError } from "@/auth/errors";
import type { DashboardBooking } from "@/auth/types";
import { useResource } from "@/booking/use-resource";
import { courseStatus } from "@/booking/private-course";
import { useFormTask } from "@/hooks/use-form-task";
import {
  Button,
  Card,
  Confirm,
  MemberPage,
  Notice,
  Reveal,
  colors,
  money,
  shortDate,
  s,
} from "./ui";
export function CoursesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { api, user } = useAuth(),
    task = useFormTask();
  const resource = useResource(
    useCallback(
      (signal: AbortSignal) => api.getPrivateCourseBookings({ signal }),
      [api],
    ),
    user?.id ?? "",
  );
  const [cancel, setCancel] = useState<DashboardBooking | null>(null),
    [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const pay = (b: DashboardBooking) =>
    void task.run(async () => {
      const result = await api.payPrivateCourse(b.id);
      const url = result.payment.checkoutUrl;
      if (!url || new URL(url).protocol !== "https:")
        throw new AuthError(
          "unavailable",
          "Secure checkout is not available yet. Your request remains reserved until the payment deadline.",
        );
      await WebBrowser.openBrowserAsync(url);
      resource.retry();
    });
  return (
    <MemberPage
      title="Your private courses"
      subtitle="From first request to your next session."
      tab="Activity"
      back
    >
      <Button
        label="Book a private course"
        onPress={() => router.push("/(member)/private-course")}
      />
      <Notice
        loading={resource.loading}
        error={resource.error ?? task.error}
        onRetry={resource.retry}
      />
      {resource.data?.filter(b => !id || b.id === id).map((b, i) => {
        const deadline = b.paymentExpiresAt ?? b.reservationExpiresAt;
        const remaining = deadline ? Date.parse(deadline) - now : 0;
        const payable = b.status === "AWAITING_PAYMENT" && remaining > 0;
        const hours = Math.max(0, Math.floor(remaining / 3600000)),
          minutes = Math.max(0, Math.floor(remaining / 60000) % 60);
        return (
          <Reveal key={b.id} delay={Math.min(i * 40, 200)}>
            <Card>
              <View
                style={[
                  s.pill,
                  payable
                    ? { backgroundColor: "#F8EDD7" }
                    : b.status === "CONFIRMED"
                      ? { backgroundColor: "#E5F2EB" }
                      : null,
                ]}
              >
                <Text
                  style={[
                    s.pillText,
                    b.status === "CONFIRMED" && { color: colors.green },
                  ]}
                >
                  {courseStatus(b.status).toUpperCase()}
                </Text>
              </View>
              <Text style={s.sectionTitle}>{b.title}</Text>
              <Text style={s.body}>
                {b.coach?.name ?? "Your coach"} · {b.court?.name ?? b.location}
              </Text>
              <Text style={s.caption}>
                {shortDate(b.date)} · {b.time}
              </Text>
              <View style={s.line} />
              <View style={s.stats}>
                <Text style={s.strong}>{money(b.price)}</Text>
                <Text style={s.caption}>#{b.code}</Text>
              </View>
              {b.status === "PENDING_COACH_CONFIRMATION" ? (
                <Text style={s.body}>
                  Your coach is reviewing your request. No payment is due yet.
                </Text>
              ) : null}
              {b.status === "AWAITING_PAYMENT" ? (
                <>
                  <Text style={s.body}>
                    {payable
                      ? `Your coach accepted. ${hours}h ${minutes}m left to complete payment.`
                      : "The payment deadline has passed. Refresh to see the released reservation."}
                  </Text>
                  {deadline ? (
                    <Text style={s.caption}>
                      Pay by{" "}
                      {new Date(deadline).toLocaleString("en-GB", {
                        timeZone: "Asia/Yangon",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · Yangon
                    </Text>
                  ) : null}
                  <Button
                    label="Continue to secure payment"
                    disabled={!payable}
                    busy={task.loading}
                    onPress={() => pay(b)}
                  />
                </>
              ) : null}
              {b.status === "CONFIRMED" ? (
                <Text style={s.body}>
                  {b.paymentStatus === "paid"
                    ? "Payment verified. Your session is confirmed."
                    : "Session confirmed by the venue. Payment is still pending."}
                </Text>
              ) : null}
              {[
                "PENDING_COACH_CONFIRMATION",
                "AWAITING_PAYMENT",
                "CONFIRMED",
              ].includes(b.status) ? (
                <Button
                  secondary
                  label="Cancel request"
                  disabled={task.loading}
                  onPress={() => {
                    task.setError(null);
                    setCancel(b);
                  }}
                />
              ) : null}
            </Card>
          </Reveal>
        );
      })}
      {resource.data && !resource.data.length ? (
        <View style={[s.empty, { paddingVertical: 60 }]}>
          <Text style={[s.sectionTitle, { fontSize: 24 }]}>
            Your next level starts here.
          </Text>
          <Text style={[s.body, { textAlign: "center" }]}>
            Choose a badminton coach and send your first private-course request.
          </Text>
        </View>
      ) : null}
      <Confirm
        visible={!!cancel}
        title="Cancel this private course?"
        body="This releases the reserved court and coach time. If you have already paid, any refund follows ZAWANA’s policy; contact the venue for assistance."
        label="Cancel request"
        busy={task.loading}
        error={task.error}
        onClose={() => setCancel(null)}
        onConfirm={() =>
          void task.run(async () => {
            if (!cancel) return;
            await api.cancelPrivateCourse(cancel.id);
            setCancel(null);
            resource.retry();
          })
        }
      />
    </MemberPage>
  );
}
