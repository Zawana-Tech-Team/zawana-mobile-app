import { useCallback } from "react";
import { useAuth } from "@/auth/auth-provider";
import { useResource } from "@/booking/use-resource";
export function useDashboard() {
  const { api, user } = useAuth();
  return useResource(
    useCallback(
      (signal: AbortSignal) => api.getMemberDashboard(undefined, { signal }),
      [api],
    ),
    user?.id ?? "",
    !!user,
  );
}
