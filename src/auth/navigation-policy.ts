import type { SessionState } from "./session-controller.ts";
export const mobileRoles = ["member", "coach", "admin", "badminton_fo"] as const;
export const isMobileRole = (role: string) => (mobileRoles as readonly string[]).includes(role);

/** Route access requires an authenticated backend session and the canonical member. */
export function sessionNavigation(
  state: Pick<SessionState, "status" | "identity" | "user">,
) {
  const member =
    state.status === "authenticated" &&
    state.user?.role === "member" &&
    Boolean(state.identity && state.user);
  const staff = state.status === "authenticated" && Boolean(state.identity && state.user) &&
    ["coach", "admin", "badminton_fo"].includes(state.user?.role ?? "");
  return {
    member,
    staff,
    authentication: !member && !staff,
    restoring: state.status === "loading",
    landing: member
      ? "/home"
      : staff ? state.user?.role === "coach" ? "/(staff)/calendar" : "/(staff)/overview" : state.status === "link-required"
        ? "/password"
        : state.status === "registration-password-required"
          ? "/set-password"
          : state.status === "profile-required"
            ? "/create-account"
            : "/",
  } as const;
}
