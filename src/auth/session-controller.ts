import { AuthError, sanitizeAuthError } from "./errors.ts";
import type { AppUser, AuthSession } from "./types.ts";

export type SessionStatus =
  | "loading"
  | "anonymous"
  | "profile-required"
  | "authenticated"
  | "password-required"
  | "link-required"
  | "registration-password-required"
  | "error";
export type IdentitySummary = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber?: string | null;
};
export type SessionState = {
  status: SessionStatus;
  identity: IdentitySummary | null;
  user: AppUser | null;
  error: AuthError | null;
};
export const initialSessionState: SessionState = {
  status: "loading",
  identity: null,
  user: null,
  error: null,
};

type SessionControllerOptions = {
  validateSession(
    identity: IdentitySummary,
    signal: AbortSignal,
  ): Promise<AuthSession>;
  onChange(state: SessionState): void;
};

/** Firebase identity alone never authorizes access to the application's routes. */
export function createSessionController(options: SessionControllerOptions) {
  let generation = 0;
  let request: AbortController | null = null;
  let state = initialSessionState;
  const emit = (next: SessionState) => {
    state = next;
    options.onChange(next);
  };
  const invalidate = () => {
    generation++;
    request?.abort();
    request = null;
  };

  return {
    getState: () => state,
    dispose: invalidate,
    clear() {
      invalidate();
      emit({ status: "anonymous", identity: null, user: null, error: null });
    },
    fail(error: unknown) {
      invalidate();
      emit({
        status: "error",
        identity: state.identity,
        user: null,
        error: sanitizeAuthError(error),
      });
    },
    async restore(identity: IdentitySummary | null): Promise<SessionStatus> {
      invalidate();
      const attempt = generation;
      if (!identity) {
        emit({ status: "anonymous", identity: null, user: null, error: null });
        return "anonymous";
      }
      request = new AbortController();
      emit({ status: "loading", identity, user: null, error: null });
      try {
        const session = await options.validateSession(identity, request.signal);
        if (attempt !== generation) return state.status;
        if (session.security.mfaRequired) {
          throw new AuthError(
            "forbidden",
            "This account requires additional verification. Sign in through the ZAWANA website or contact support.",
          );
        }
        emit({
          status: "authenticated",
          identity,
          user: session.user,
          error: null,
        });
      } catch (error) {
        if (attempt !== generation) return state.status;
        const safeError = sanitizeAuthError(error);
        emit({
          status:
            safeError.code === "profileRequired" ? "profile-required" : "error",
          identity,
          user: null,
          error: safeError,
        });
      }
      return state.status;
    },
  };
}
