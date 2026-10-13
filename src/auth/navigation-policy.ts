import type { SessionState } from "./session-controller.ts";

/** Route access requires an authenticated backend session and the canonical member. */
export function sessionNavigation(
  state: Pick<SessionState, "status" | "identity" | "user">,
) {
  const member =
    state.status === "authenticated" &&
    state.user?.role === "member" &&
    Boolean(state.identity && state.user);
  return {
    member,
    authentication: !member,
    restoring: state.status === "loading",
    landing: member
      ? "/home"
      : state.status === "password-required" || state.status === "link-required"
        ? "/password"
        : state.status === "registration-password-required"
          ? "/set-password"
          : state.status === "profile-required"
            ? "/create-account"
            : "/",
  } as const;
}
