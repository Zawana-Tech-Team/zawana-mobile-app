import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { bookingDateWindow } from "./date-policy";

/** Refresh on focus, resume, and the next Yangon midnight, including month rollover. */
export function useBookingDateWindow() {
  const [window, setWindow] = useState(() => bookingDateWindow());
  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout>;
      const update = () => {
        clearTimeout(timer);
        const next = bookingDateWindow();
        setWindow((previous) => previous.today === next.today ? previous : next);
        const midnight = new Date(`${next.today}T00:00:00+06:30`).getTime();
        timer = setTimeout(update, Math.max(1, midnight + 86400000 - Date.now()));
      };
      update();
      const listener = AppState.addEventListener("change", (state) => {
        if (state === "active") update();
      });
      return () => {
        clearTimeout(timer);
        listener.remove();
      };
    }, []),
  );
  return window;
}
