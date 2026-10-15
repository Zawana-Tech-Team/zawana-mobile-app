import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { sanitizeAuthError } from "@/auth/errors";

/** Project-native focus-scoped requests: cancellation and generation prevent stale rendering. */
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  identity: string,
  enabled=true,
) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    identity: string;
    attempt: number;
    data: T | null;
    error: string | null;
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      if(!enabled)return;
      let active = true,
        controller: AbortController | undefined;
      const run = () => {
        controller?.abort();
        const request = new AbortController();
        controller = request;
        void load(request.signal)
          .then((data) => {
            if (active && !request.signal.aborted)
              setState({ identity, attempt, data, error: null });
          })
          .catch((error) => {
            if (active && !request.signal.aborted)
              setState({
                identity,
                attempt,
                data: null,
                error: sanitizeAuthError(error).message,
              });
          });
      };
      run();
      const listener = AppState.addEventListener("change", (value) => {
        if (value === "active") run();
      });
      const timer = setInterval(run, 60000);
      return () => {
        active = false;
        controller?.abort();
        listener.remove();
        clearInterval(timer);
      };
    }, [load, identity, attempt, enabled]),
  );
  const current = state?.identity === identity && state?.attempt === attempt;
  return {
    data: enabled && current ? state.data : null,
    error: enabled && current ? state.error : null,
    loading: enabled && !current,
    retry: () => setAttempt((v) => v + 1),
  };
}
