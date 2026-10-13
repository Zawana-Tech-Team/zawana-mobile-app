import { AuthError, authHttpError, sanitizeAuthError } from "./errors.ts";
import type {
  AppUser,
  AuthSession,
  MemberDashboard,
  ProfileInput,
  ProfileUpdate,
  UserRole,
  LoginResult,
  Onboarding,
  PhoneProofChallenge,
} from "./types.ts";

type RequestOptions = { signal?: AbortSignal };
type ApiOptions = {
  /** Origin or API base including /api; EXPO_PUBLIC_API_URL is used when omitted. */
  baseUrl?: string;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  refreshSession?: () => Promise<void>;
  onSessionInvalid?: (token: string) => Promise<void>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const roles = new Set<UserRole>([
  "member",
  "coach",
  "admin",
  "gym_fo",
  "clinic_fo",
  "badminton_fo",
  "store_fo",
  "cafe_fo",
  "doctor",
  "owner",
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nullableString = (value: unknown) =>
  value === null || typeof value === "string";
const invalidResponse = () =>
  new AuthError(
    "invalidResponse",
    "ZAWANA returned an unexpected response. Please try again later.",
  );

function appUser(value: unknown): AppUser {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    typeof value.email !== "string" ||
    typeof value.role !== "string" ||
    !roles.has(value.role as UserRole) ||
    !nullableString(value.phone) ||
    !nullableString(value.membership) ||
    !nullableString(value.avatar)
  )
    throw invalidResponse();
  return value as AppUser;
}

function authSession(value: unknown): AuthSession {
  if (
    !isRecord(value) ||
    !isRecord(value.security) ||
    typeof value.security.mfaEnrolled !== "boolean" ||
    typeof value.security.mfaRequired !== "boolean"
  )
    throw invalidResponse();
  appUser(value.user);
  return value as AuthSession;
}

function applicationSession(value: unknown): AuthSession {
  const session = authSession(value);
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(session.accessToken || "") ||
    !/^[A-Za-z0-9_-]{43}$/.test(session.refreshToken || "") ||
    !Number.isFinite(Date.parse(session.accessExpiresAt)) ||
    !Number.isFinite(Date.parse(session.sessionExpiresAt))
  )
    throw invalidResponse();
  return session;
}
function onboarding(value: unknown): Onboarding {
  if (
    !isRecord(value) ||
    value.status !== "onboarding" ||
    typeof value.registrationToken !== "string" ||
    !isRecord(value.profile) ||
    typeof value.profile.email !== "string" ||
    typeof value.profile.name !== "string" ||
    typeof value.profile.phone !== "string"
  )
    throw invalidResponse();
  return value as Onboarding;
}
function loginResult(value: unknown): LoginResult {
  return isRecord(value) && value.status === "onboarding"
    ? onboarding(value)
    : applicationSession(value);
}

function memberDashboard(value: unknown): MemberDashboard {
  const collections = [
    "bookings",
    "recentBookings",
    "todayBookings",
    "upcomingBookings",
    "packages",
    "notifications",
    "enrollmentHistory",
    "checkIns",
    "purchases",
  ];
  if (
    !isRecord(value) ||
    collections.some(
      (key) =>
        !Array.isArray(value[key]) ||
        value[key].some((entry: unknown) => !isRecord(entry)),
    ) ||
    typeof value.todayBookingCount !== "number" ||
    !Number.isInteger(value.todayBookingCount) ||
    value.todayBookingCount < 0 ||
    typeof value.upcomingBookingCount !== "number" ||
    !Number.isInteger(value.upcomingBookingCount) ||
    value.upcomingBookingCount < 0 ||
    !(value.enrollment === null || isRecord(value.enrollment))
  )
    throw invalidResponse();
  return value as MemberDashboard;
}

function retryAfter(response: Response): number | undefined {
  const value = response.headers.get("Retry-After");
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const deadline = Date.parse(value);
  return Number.isFinite(deadline)
    ? Math.max(0, Math.ceil((deadline - Date.now()) / 1_000))
    : undefined;
}

/** Business requests use application access tokens; Firebase proofs are explicit endpoint-only credentials. */
export function createAuthApi(options: ApiOptions) {
  const configuredUrl = (
    options.baseUrl ??
    process.env.EXPO_PUBLIC_API_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  const baseUrl =
    configuredUrl && !/\/api$/.test(configuredUrl)
      ? configuredUrl + "/api"
      : configuredUrl;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  function validateConfiguration() {
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch {
      throw new AuthError(
        "configuration",
        "The ZAWANA API is not configured yet. Please contact support.",
      );
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !Number.isFinite(timeoutMs) ||
      timeoutMs <= 0
    ) {
      throw new AuthError(
        "configuration",
        "The ZAWANA API configuration is invalid. Please contact support.",
      );
    }
  }

  async function request<T>(
    path: string,
    method: "GET" | "POST" | "PATCH",
    body: unknown,
    validate: (value: unknown) => T,
    requestOptions: RequestOptions = {},
    credential?: string | null,
  ): Promise<T> {
    validateConfiguration();
    for (let attempt = 0; attempt < 2; attempt++) {
      if (requestOptions.signal?.aborted)
        throw new AuthError("cancelled", "The request was cancelled.");
      let token: string;
      try {
        if (attempt === 1 && options.refreshSession)
          await options.refreshSession();
        token =
          credential === undefined
            ? await options.getIdToken(attempt === 1 && !options.refreshSession)
            : credential || "";
      } catch (error) {
        throw sanitizeAuthError(error);
      }
      if ((credential === undefined && !token) || /[\r\n]/.test(token))
        throw new AuthError(
          "sessionExpired",
          "Please sign in again to continue.",
        );
      const controller = new AbortController();
      let timedOut = false;
      const onAbort = () => controller.abort();
      requestOptions.signal?.addEventListener("abort", onAbort, { once: true });
      if (requestOptions.signal?.aborted) controller.abort();
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          method,
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: controller.signal,
        });
        if (
          response.status === 401 &&
          attempt === 0 &&
          credential === undefined
        )
          continue;
        if (!response.ok) {
          const failure = (await response.json().catch(() => null)) as {
            code?: string;
            message?: string;
          } | null;
          const code = failure?.code;
          if (
            credential === undefined &&
            [
              "SESSION_REVOKED",
              "MOBILE_ROLE_UNSUPPORTED",
              "PHONE_AUTHORITY_CONFLICT",
              "MFA_REQUIRED",
            ].includes(code || "")
          )
            await options.onSessionInvalid?.(token);
          if (code === "MFA_REQUIRED" || code === "MOBILE_ROLE_UNSUPPORTED")
            throw new AuthError(
              "forbidden",
              "Use the ZAWANA website to complete authentication for this account.",
              { status: response.status },
            );
          if (code === "INVALID_CREDENTIALS")
            throw new AuthError(
              "invalidCredentials",
              "The sign-in details are incorrect.",
              { status: response.status },
            );
          if (code === "ACCOUNT_LINK_REQUIRED" || code === "IDENTITY_CONFLICT")
            throw new AuthError(
              "accountExists",
              "Sign in to your existing account and explicitly link this identity.",
              { status: response.status },
            );
          if (code === "EMAIL_VERIFICATION_REQUIRED")
            throw new AuthError("configuration", "Update the ZAWANA backend to support sign-in without email verification.", { status: response.status });
          if (code === "ACCOUNT_NOT_FOUND")
            throw new AuthError("accountNotFound", "No ZAWANA account uses these details. Create an account first.", { status: response.status });
          if (
            code?.includes("CHALLENGE") ||
            code === "PROOF_EXPIRED" ||
            code === "PROOF_REPLAY"
          )
            throw new AuthError(
              "expiredVerification",
              "Request a new phone code.",
              { status: response.status },
            );
          throw authHttpError(response.status, retryAfter(response));
        }
        let value: unknown;
        try {
          value = await response.json();
        } catch (error) {
          if (controller.signal.aborted) throw error;
          throw invalidResponse();
        }
        return validate(value);
      } catch (error) {
        if (timedOut)
          throw new AuthError(
            "timeout",
            "The request took too long. Please try again.",
          );
        if (requestOptions.signal?.aborted)
          throw new AuthError("cancelled", "The request was cancelled.");
        if (error instanceof AuthError) throw error;
        throw new AuthError(
          "network",
          "Could not connect to ZAWANA. Check your internet connection and try again.",
        );
      } finally {
        clearTimeout(timer);
        requestOptions.signal?.removeEventListener("abort", onAbort);
      }
    }
    throw new AuthError(
      "sessionExpired",
      "Your session has expired. Please sign in again.",
    );
  }

  const session = (requestOptions?: RequestOptions) =>
    request("/auth/session", "POST", {}, authSession, requestOptions);
  return {
    session,
    accountCheck: (input: { email?: string; phone?: string }) =>
      request("/auth/mobile/account-check", "POST", input, (value) => {
        if (!isRecord(value) || (input.email !== undefined && typeof value.emailExists !== "boolean")
          || (input.phone !== undefined && typeof value.phoneExists !== "boolean")) throw invalidResponse();
        return value as { emailExists?: boolean; phoneExists?: boolean };
      }, {}, null),
    emailLogin: (email: string, password: string, remember = true) =>
      request(
        "/auth/mobile/email-login",
        "POST",
        { email, password, remember },
        loginResult,
        {},
        null,
      ),
    providerLogin: (provider: "google.com" | "apple.com", token: string) =>
      request(
        "/auth/mobile/provider-session",
        "POST",
        { provider, remember: true },
        loginResult,
        {},
        token,
      ),
    phoneChallenge: (token: string, intent: "signin" | "signup" | "link") =>
      request(
        "/auth/mobile/challenge",
        "POST",
        { intent },
        (value) => {
          if (
            !isRecord(value) ||
            typeof value.challengeToken !== "string" ||
            typeof value.phone !== "string" ||
            typeof value.next !== "string" ||
            typeof value.expiresAt !== "string"
          )
            throw invalidResponse();
          return value as PhoneProofChallenge;
        },
        {},
        token,
      ),
    phonePassword: (
      challengeToken: string,
      password: string,
      remember = true,
    ) =>
      request(
        "/auth/mobile/password",
        "POST",
        { challengeToken, password, remember },
        applicationSession,
        {},
        null,
      ),
    registerMobile: (input: {
      challengeToken: string;
      registrationToken?: string;
      name: string;
      email: string;
      password: string;
    }) => request("/auth/mobile/register", "POST", input, onboarding, {}, null),
    finishRegistration: (input: {
      registrationToken: string;
      challengeToken: string;
      password: string;
      remember: boolean;
    }) =>
      request(
        "/auth/mobile/register/complete",
        "POST",
        input,
        applicationSession,
        {},
        null,
      ),
    refresh: (refreshToken: string) =>
      request(
        "/auth/refresh",
        "POST",
        { refreshToken },
        applicationSession,
        {},
        null,
      ),
    logout: (refreshToken?: string) =>
      request(
        "/auth/logout",
        "POST",
        { refreshToken },
        (value) => value,
        {},
        null,
      ),
    recover: (email: string) =>
      request(
        "/auth/password-recovery",
        "POST",
        { email },
        (value) => value,
        {},
        null,
      ),
    link: (input: {
      email: string;
      password: string;
      identityToken?: string;
      challengeToken?: string;
    }) =>
      request(
        "/auth/identities/link",
        "POST",
        input,
        (value) => value,
        {},
        null,
      ),

    async completeProfile(
      profile: ProfileInput,
      requestOptions?: RequestOptions,
    ): Promise<AuthSession> {
      try {
        return await request(
          "/auth/complete-profile",
          "POST",
          { name: profile.name.trim(), phone: profile.phone.trim() },
          authSession,
          requestOptions,
        );
      } catch (error) {
        // Another retry may already have created this verified identity's profile.
        // Resolve the canonical session rather than sending another registration mutation.
        if (error instanceof AuthError && error.status === 409)
          return session(requestOptions);
        throw error;
      }
    },
    getCurrentUser: (requestOptions?: RequestOptions) =>
      request("/auth/me", "GET", undefined, appUser, requestOptions),
    updateProfile: (profile: ProfileUpdate, requestOptions?: RequestOptions) =>
      request("/profile", "PATCH", profile, appUser, requestOptions),
    uploadAvatar: (image: string, requestOptions?: RequestOptions) =>
      request(
        "/profile/avatar",
        "POST",
        { image },
        (value) => {
          if (
            !isRecord(value) ||
            typeof value.avatar !== "string" ||
            !value.avatar
          )
            throw invalidResponse();
          return value as { avatar: string };
        },
        requestOptions,
      ),
    getMemberDashboard: (
      referenceDate?: string,
      requestOptions?: RequestOptions,
    ) => {
      if (
        referenceDate !== undefined &&
        !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)
      ) {
        return Promise.reject(
          new AuthError("invalidInput", "Choose a valid dashboard date."),
        );
      }
      return request(
        `/member/dashboard${referenceDate === undefined ? "" : `?referenceDate=${encodeURIComponent(referenceDate)}`}`,
        "GET",
        undefined,
        memberDashboard,
        requestOptions,
      );
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
