import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { createAuthApi, type AuthApi } from "./api";
import { AuthError, sanitizeAuthError, type AuthErrorCode } from "./errors";
import {
  getFirebaseAuth,
  onIdTokenChanged,
  signOutIdentity,
  isAppleAvailable,
  prepareIdentitySession,
  sendPhoneVerification,
  signInAppleIdentity,
  signInGoogleIdentity,
} from "./firebase";
import { ApplicationRuntime } from "./application-runtime";
import { normalizePhone } from "./validation";
import {
  clearRegistrationDraft,
  useRegistrationDraft,
} from "./registration-draft";
import {
  initialSessionState,
  type SessionState,
  type SessionStatus,
} from "./session-controller";
import type { AppUser, AuthSession, LoginResult, ProfileInput } from "./types";
import { createPhoneChallenge, type PhoneChallenge } from "./phone-challenge";
import { secureDeviceStorage, ephemeralStorage } from "./storage";

const SESSION_KEY = "zawana-application-refresh-v1";
type AuthContextValue = {
  status: SessionStatus;
  user: AppUser | null;
  identity: SessionState["identity"];
  error: string | null;
  errorCode: AuthErrorCode | null;
  busy: boolean;
  phoneChallenge: PhoneChallenge | null;
  appleAvailable: boolean;
  beginLink(): void;
  hasPhoneProof: boolean;
  registrationReady: boolean;
  linking: boolean;
  api: AuthApi;
  signInGoogle(): Promise<SessionStatus>;
  signInApple(): Promise<SessionStatus>;
  sendPhoneOtp(
    phone: string,
    intent?: "signin" | "signup" | "link",
  ): Promise<SessionStatus | null>;
  verifyPhoneOtp(code: string): Promise<SessionStatus>;
  cancelPhoneOtp(): Promise<void>;
  signIn(
    email: string,
    password: string,
    remember?: boolean,
  ): Promise<SessionStatus>;
  signUp(email: string, password: string): Promise<SessionStatus>;
  completeProfile(profile: ProfileInput): Promise<SessionStatus>;
  uploadAvatar(dataUrl: string): Promise<void>;
  signOut(): Promise<void>;
  retryRestore(): Promise<SessionStatus>;
  requestPasswordReset(email: string): Promise<void>;
  setRemember(remember: boolean): Promise<void>;
  clearError(): void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(initialSessionState);
  const [operationError, setOperationError] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);
  const [phoneChallenge, setPhoneChallenge] = useState<PhoneChallenge | null>(
    null,
  );
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (
      ![
        "profile-required",
        "password-required",
        "registration-password-required",
        "link-required",
      ].includes(state.status)
    )
      return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.status]);
  const draft = useRegistrationDraft();
  const runtime = useMemo(() => new ApplicationRuntime(), []);
  const storage =
    Platform.OS === "web" ? ephemeralStorage : secureDeviceStorage;
  const emit = useCallback(
    (status: SessionStatus, user: AppUser | null = null) => {
      if (!runtime.state.mounted) return;
      setState({
        status,
        user,
        error: null,
        identity: user
          ? {
              uid: user.id,
              email: user.email,
              emailVerified: true,
              phoneNumber: user.phone,
            }
          : null,
      });
    },
    [runtime],
  );
  const acceptSession = useCallback(
    async (result: AuthSession, generation: number) => {
      if (generation !== runtime.state.generation)
        throw new AuthError("cancelled", "Sign-in was cancelled.");
      if (
        result.user.role !== "member" ||
        result.security.mfaRequired ||
        !/^[A-Za-z0-9_-]{43}$/.test(result.accessToken) ||
        !/^[A-Za-z0-9_-]{43}$/.test(result.refreshToken)
      )
        throw new AuthError(
          "forbidden",
          "Use the ZAWANA website for this account.",
        );
      if (runtime.state.remember)
        await storage.setItem(
          SESSION_KEY,
          JSON.stringify({
            refreshToken: result.refreshToken,
            expiresAt: result.sessionExpiresAt,
          }),
        );
      else await storage.removeItem(SESSION_KEY);
      if (generation !== runtime.state.generation) {
        await storage.removeItem(SESSION_KEY);
        throw new AuthError("cancelled", "Sign-in was cancelled.");
      }
      runtime.set("accessToken", result.accessToken);
      runtime.set("refreshToken", result.refreshToken);
      runtime.set("registration", null);
      runtime.set("challenge", null);
      runtime.set("linkingToken", "");
      runtime.set("registrationReady", false);
      emit("authenticated", result.user);
      return "authenticated" as const;
    },
    [emit, storage, runtime],
  );
  const api = useMemo(() => {
    const transport = createAuthApi({
      getIdToken: async () => runtime.state.accessToken,
      onSessionInvalid: async (token) => {
        if (token !== runtime.state.accessToken) return;
        runtime.invalidate();
        runtime.set("accessToken", "");
        runtime.set("refreshToken", "");
        await storage.removeItem(SESSION_KEY);
        emit("anonymous");
      },
      refreshSession: async () => {
        if (runtime.state.refreshFlight) return runtime.state.refreshFlight;
        const generation = runtime.state.generation;
        const token = runtime.state.refreshToken;
        if (!token) throw new AuthError("sessionExpired", "Sign in again.");
        const current = (async () => {
          try {
            await acceptSession(await transport.refresh(token), generation);
          } catch (error) {
            const safe = sanitizeAuthError(error);
            if (
              generation === runtime.state.generation &&
              ["sessionExpired", "forbidden"].includes(safe.code)
            ) {
              runtime.set("accessToken", "");
              runtime.set("refreshToken", "");
              await storage.removeItem(SESSION_KEY);
              emit("anonymous");
            }
            throw error;
          }
        })();
        runtime.set("refreshFlight", current);
        try {
          await current;
        } finally {
          if (runtime.state.refreshFlight === current)
            runtime.set("refreshFlight", null);
        }
      },
    });
    return transport;
  }, [runtime, acceptSession, storage, emit]);
  const phone = useMemo(
    () =>
      createPhoneChallenge({
        storage,
        send: sendPhoneVerification,
        onChange: (next) => {
          if (runtime.state.mounted) setPhoneChallenge(next);
        },
      }),
    [storage, runtime],
  );
  const acceptLogin = useCallback(
    async (result: LoginResult, generation: number) => {
      if ("accessToken" in result) return acceptSession(result, generation);
      if (generation !== runtime.state.generation)
        throw new AuthError("cancelled", "Sign-in was cancelled.");
      runtime.set("registration", result);
      draft.update(result.profile);
      emit("profile-required");
      return "profile-required" as const;
    },
    [acceptSession, draft, emit, runtime],
  );
  const restore = useCallback(async (): Promise<SessionStatus> => {
    const generation = runtime.state.generation;
    const raw = await storage.getItem(SESSION_KEY);
    if (!raw) {
      emit("anonymous");
      return "anonymous";
    }
    try {
      const saved = JSON.parse(raw) as {
        refreshToken?: string;
        expiresAt?: string;
      };
      if (
        !saved.refreshToken ||
        !/^[A-Za-z0-9_-]{43}$/.test(saved.refreshToken) ||
        !saved.expiresAt ||
        !Number.isFinite(Date.parse(saved.expiresAt)) ||
        Date.parse(saved.expiresAt) <= Date.now()
      )
        throw new AuthError("sessionExpired", "Sign in again.");
      runtime.set("refreshToken", saved.refreshToken);
      return await acceptSession(
        await api.refresh(saved.refreshToken),
        generation,
      );
    } catch (error) {
      if (generation !== runtime.state.generation) return "anonymous";
      const safe = sanitizeAuthError(error);
      runtime.set("accessToken", "");
      runtime.set("refreshToken", "");
      if (safe.code === "sessionExpired" || safe.code === "forbidden") {
        await storage.removeItem(SESSION_KEY);
        emit("anonymous");
        return "anonymous";
      }
      if (runtime.state.mounted)
        setState({ ...initialSessionState, status: "error", error: safe });
      return "error";
    }
  }, [storage, emit, acceptSession, api, runtime]);
  useEffect(() => {
    runtime.set("mounted", true);
    void (async () => {
      await prepareIdentitySession();
      await phone.restore();
      setAppleAvailable(await isAppleAvailable());
      await restore();
    })().catch((error) => {
      if (runtime.state.mounted) {
        emit("anonymous");
        setOperationError(sanitizeAuthError(error));
      }
    });
    return () => {
      runtime.set("mounted", false);
      runtime.invalidate();
    };
  }, [phone, restore, emit, runtime]);
  const run = useCallback(
    async <T,>(action: (generation: number) => Promise<T>): Promise<T> => {
      if (runtime.state.pending)
        throw new AuthError("cancelled", "Wait for the current request.");
      const generation = runtime.state.generation;
      runtime.set("pending", true);
      setBusy(true);
      setOperationError(null);
      try {
        return await action(generation);
      } catch (error) {
        const safe = sanitizeAuthError(error);
        if (runtime.state.mounted && generation === runtime.state.generation)
          setOperationError(safe);
        throw safe;
      } finally {
        if (generation === runtime.state.generation) {
          runtime.set("pending", false);
          if (runtime.state.mounted) setBusy(false);
        }
      }
    },
    [runtime],
  );
  const finishPhone = useCallback(
    async (
      identity: { getIdToken(force?: boolean): Promise<string> },
      generation: number,
    ) => {
      const proof = await api.phoneChallenge(
        await identity.getIdToken(true),
        runtime.state.intent,
      );
      if (generation !== runtime.state.generation)
        throw new AuthError("cancelled", "Verification was cancelled.");
      runtime.set("challenge", proof);
      const status: SessionStatus = runtime.state.registrationReady
        ? "registration-password-required"
        : proof.next === "password" && !runtime.state.registration
          ? "password-required"
          : runtime.state.intent === "link" || proof.next === "link-account"
            ? "link-required"
            : "profile-required";
      emit(status);
      return status;
    },
    [api, emit, runtime],
  );
  useEffect(() => {
    try {
      return onIdTokenChanged(getFirebaseAuth(), (identity) => {
        const pendingPhone = phone.getState();
        if (
          !identity?.metadata?.lastSignInTime ||
          runtime.state.pending ||
          !pendingPhone?.resumable ||
          identity.phoneNumber !== pendingPhone.phone ||
          identity.metadata?.lastSignInTime ===
            runtime.state.previousPhoneSignIn
        )
          return;
        void run(async (generation) => {
          await phone.clear();
          return finishPhone(identity, generation);
        }).catch(() => {
          /* The operation reports its sanitized error. */
        });
      });
    } catch {
      return undefined;
    }
  }, [phone, runtime, run, finishPhone]);
  const value: AuthContextValue = {
    ...state,
    error: (operationError || state.error)?.message || null,
    errorCode: (operationError || state.error)?.code || null,
    busy,
    phoneChallenge,
    appleAvailable,
    api,
    beginLink: () => {
      runtime.set("intent", "link");
      runtime.set("registration", null);
      emit("link-required");
    },
    hasPhoneProof: Boolean(
      runtime.state.challenge &&
      Date.parse(runtime.state.challenge.expiresAt) > now,
    ),
    registrationReady: runtime.state.registrationReady,
    linking: Boolean(
      runtime.state.linkingToken || runtime.state.intent === "link",
    ),
    signInGoogle: () =>
      run(async (generation) => {
        await phone.clear();
        runtime.set("challenge", null);
        const identity = await signInGoogleIdentity();
        const token = await identity.getIdToken(true);
        runtime.set("linkingToken", token);
        try {
          return await acceptLogin(
            await api.providerLogin("google.com", token),
            generation,
          );
        } catch (error) {
          if (error instanceof AuthError && error.code === "accountExists") {
            runtime.set("linkingToken", token);
            emit("link-required");
            return "link-required";
          }
          throw error;
        }
      }),
    signInApple: () =>
      run(async (generation) => {
        await phone.clear();
        runtime.set("challenge", null);
        const identity = await signInAppleIdentity();
        const token = await identity.getIdToken(true);
        runtime.set("linkingToken", token);
        try {
          return await acceptLogin(
            await api.providerLogin("apple.com", token),
            generation,
          );
        } catch (error) {
          if (error instanceof AuthError && error.code === "accountExists") {
            runtime.set("linkingToken", token);
            emit("link-required");
            return "link-required";
          }
          throw error;
        }
      }),
    sendPhoneOtp: (number, intent) =>
      run(async (generation) => {
        const normalized = normalizePhone(number);
        if (!normalized) throw new AuthError("invalidInput", "Enter a valid Myanmar mobile phone number.");
        const selectedIntent = intent || runtime.state.intent;
        if (selectedIntent !== "link") {
          const existing = await api.accountCheck({ phone: normalized });
          if (selectedIntent === "signup" && existing.phoneExists)
            throw new AuthError("accountExists", "This phone number already has a ZAWANA account. Sign in instead.");
          if (selectedIntent === "signin" && !existing.phoneExists)
            throw new AuthError("accountNotFound", "No ZAWANA account uses this phone number. Create an account first.");
        }
        if (generation !== runtime.state.generation)
          throw new AuthError("cancelled", "Verification was cancelled.");
        runtime.set("intent", selectedIntent);
        runtime.set("challenge", null);
        const previousSignIn =
          getFirebaseAuth().currentUser?.metadata.lastSignInTime;
        runtime.set("previousPhoneSignIn", previousSignIn || null);
        await phone.send(normalized);
        const identity = getFirebaseAuth().currentUser;
        if (
          identity?.phoneNumber === normalized &&
          identity.metadata.lastSignInTime !== previousSignIn
        ) {
          await phone.clear();
          return finishPhone(identity, generation);
        }
        return null;
      }),
    verifyPhoneOtp: (code) =>
      run(async (generation) =>
        finishPhone(await phone.verify(code), generation),
      ),
    cancelPhoneOtp: async () => {
      runtime.invalidate();
      runtime.set("pending", false);
      runtime.set("challenge", null);
      setBusy(false);
      await phone.clear();
      emit("anonymous");
    },
    signIn: (email, password, remember = true) =>
      run(async (generation) => {
        runtime.set("remember", remember);
        if (state.status === "link-required") {
          await api.link({
            email,
            password,
            ...(runtime.state.linkingToken
              ? { identityToken: runtime.state.linkingToken }
              : { challengeToken: runtime.state.challenge?.challengeToken }),
          });
          runtime.set("linkingToken", "");
          runtime.set("challenge", null);
          runtime.set("registration", null);
          runtime.set("intent", "signin");
          return await acceptLogin(
            await api.emailLogin(email, password, remember),
            generation,
          );
        }
        if (runtime.state.challenge?.next === "password")
          return await acceptSession(
            await api.phonePassword(
              runtime.state.challenge.challengeToken,
              password,
              remember,
            ),
            generation,
          );
        await phone.clear();
        return await acceptLogin(
          await api.emailLogin(email, password, remember),
          generation,
        );
      }),
    signUp: (email, password) =>
      run(async (generation) => {
        const challenge = runtime.state.challenge;
        if (!challenge || Date.parse(challenge.expiresAt) <= Date.now())
          throw new AuthError(
            "expiredVerification",
            "Verify your phone again before finishing registration.",
          );
        if (runtime.state.registrationReady && runtime.state.registration)
          return acceptSession(
            await api.finishRegistration({
              registrationToken: runtime.state.registration.registrationToken,
              challengeToken: challenge.challengeToken,
              password,
              remember: true,
            }),
            generation,
          );
        const result = await api.registerMobile({
          challengeToken: challenge.challengeToken,
          registrationToken: runtime.state.registration?.registrationToken,
          name: draft.draft.name,
          email,
          password,
        });
        runtime.set("registration", result);
        runtime.set("registrationReady", true);
        draft.update(result.profile);
        if (result.next === "complete")
          return acceptSession(
            await api.finishRegistration({
              registrationToken: result.registrationToken,
              challengeToken: challenge.challengeToken,
              password,
              remember: true,
            }),
            generation,
          );
        throw new AuthError("configuration", "Update the ZAWANA backend to finish registration without email verification.");
      }),
    completeProfile: (profile) =>
      run(async () => {
        draft.update(profile);
        emit("profile-required");
        return "profile-required" as const;
      }),
    uploadAvatar: (data) =>
      run(async () => {
        if (state.status !== "authenticated")
          throw new AuthError("sessionExpired", "Sign in first.");
        await api.uploadAvatar(data);
      }),
    signOut: async () => {
      const token = runtime.state.refreshToken;
      runtime.invalidate();
      runtime.set("pending", false);
      runtime.set("accessToken", "");
      runtime.set("refreshToken", "");
      runtime.set("challenge", null);
      runtime.set("registration", null);
      runtime.set("registrationReady", false);
      runtime.set("linkingToken", "");
      setBusy(false);
      emit("anonymous");
      await storage.removeItem(SESSION_KEY);
      try {
        if (token) await api.logout(token);
      } finally {
        await phone.clear();
        await clearRegistrationDraft();
        await signOutIdentity();
      }
    },
    retryRestore: () => run(async () => restore()),
    requestPasswordReset: (email) =>
      run(async () => {
        await api.recover(email);
      }),
    setRemember: (remember) =>
      run(async () => {
        runtime.set("remember", remember);
        if (!remember) await storage.removeItem(SESSION_KEY);
      }),
    clearError: () => setOperationError(null),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
