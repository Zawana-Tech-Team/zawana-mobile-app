import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createAuthApi, type AuthApi } from './api';
import { AuthError, sanitizeAuthError, type AuthErrorCode } from './errors';
import {
  createIdentity, getFirebaseAuth, onIdTokenChanged, reloadVerifiedIdentity,
  requestPasswordResetEmail, sendVerificationEmail, setRememberDevice, signInIdentity,
  signOutIdentity,
  isAppleAvailable, prepareIdentitySession, sendPhoneVerification, signInAppleIdentity, signInGoogleIdentity,
} from './firebase';
import { clearRegistrationDraft } from './registration-draft';
import {
  createSessionController, initialSessionState, type IdentitySummary, type SessionState, type SessionStatus,
} from './session-controller';
import type { AppUser, ProfileInput } from './types';
import { Platform } from 'react-native';
import { hasVerifiedIdentity, type FirebaseIdentity } from './identity';
import { createPhoneChallenge, type PhoneChallenge } from './phone-challenge';
import { secureDeviceStorage, ephemeralStorage } from './storage';

type AuthContextValue = {
  status: SessionStatus;
  user: AppUser | null;
  identity: IdentitySummary | null;
  error: string | null;
  errorCode: AuthErrorCode | null;
  busy: boolean;
  phoneChallenge: PhoneChallenge | null;
  appleAvailable: boolean;
  signInGoogle(): Promise<SessionStatus>;
  signInApple(): Promise<SessionStatus>;
  sendPhoneOtp(phone: string): Promise<SessionStatus | null>;
  verifyPhoneOtp(code: string): Promise<SessionStatus>;
  cancelPhoneOtp(): Promise<void>;
  api: AuthApi;
  signIn(email: string, password: string, remember?: boolean): Promise<SessionStatus>;
  signUp(email: string, password: string): Promise<SessionStatus>;
  sendVerification(): Promise<void>;
  checkVerification(): Promise<SessionStatus>;
  completeProfile(profile: ProfileInput): Promise<SessionStatus>;
  uploadAvatar(dataUrl: string): Promise<void>;
  signOut(): Promise<void>;
  retryRestore(): Promise<SessionStatus>;
  requestPasswordReset(email: string): Promise<void>;
  setRemember(remember: boolean): Promise<void>;
  clearError(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const summary = (user: FirebaseIdentity | null): IdentitySummary | null => user ? {
  uid: user.uid, email: user.email, emailVerified: user.emailVerified, phoneNumber: user.phoneNumber,
} : null;

function createAuthRuntime(onChange: (next: SessionState) => void) {
  let mounted = false;
  let operationPending = false;
  let signingOut = false;
  let phoneCancelled = false;
  const api = createAuthApi({
    getIdToken: async forceRefresh => {
      const user = getFirebaseAuth().currentUser;
      if (!user || !hasVerifiedIdentity(user) || signingOut) {
        throw new AuthError('sessionExpired', 'Verify your account and sign in to continue.');
      }
      return user.getIdToken(forceRefresh);
    },
  });
  const controller = createSessionController({
    validateSession: (_identity, signal) => api.session({ signal }),
    onChange: next => { if (mounted) onChange(next); },
  });
  return {
    api, controller,
    isMounted: () => mounted,
    setMounted: (value: boolean) => { mounted = value; },
    isPending: () => operationPending,
    setPending: (value: boolean) => { operationPending = value; },
    isSigningOut: () => signingOut,
    setSigningOut: (value: boolean) => { signingOut = value; },
    isPhoneCancelled: () => phoneCancelled,
    setPhoneCancelled: (value: boolean) => { phoneCancelled = value; },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(initialSessionState);
  const [operationError, setOperationError] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);
  const [phoneChallenge, setPhoneChallenge] = useState<PhoneChallenge | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const runtime = useMemo(() => createAuthRuntime(setSession), []);
  const { api, controller } = runtime;
  const phone = useMemo(() => createPhoneChallenge({
    storage: Platform.OS === 'web' ? ephemeralStorage : secureDeviceStorage,
    send: sendPhoneVerification,
    onChange: challenge => { if (runtime.isMounted()) setPhoneChallenge(challenge); },
  }), [runtime]);

  useEffect(() => {
    runtime.setMounted(true);
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      await prepareIdentitySession();
      await phone.restore();
      const available = await isAppleAvailable();
      if (!runtime.isMounted()) return;
      setAppleAvailable(available);
      unsubscribe = onIdTokenChanged(getFirebaseAuth(), user => {
        if (runtime.isPhoneCancelled() && user?.phoneNumber) {
          controller.clear();
          void signOutIdentity().catch(error => controller.fail(error));
          return;
        }
        if (!runtime.isSigningOut() && !runtime.isPending()) void controller.restore(summary(user));
      });
    })().catch(error => { if (runtime.isMounted()) controller.fail(error); });
    return () => { runtime.setMounted(false); unsubscribe?.(); controller.dispose(); };
  }, [controller, runtime, phone]);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    if (runtime.isPending()) throw new AuthError('cancelled', 'Wait for the current request to finish.');
    runtime.setPending(true);
    setBusy(true);
    setOperationError(null);
    try { return await action(); }
    catch (error) {
      const safeError = sanitizeAuthError(error);
      if (runtime.isMounted()) setOperationError(safeError);
      throw safeError;
    } finally {
      runtime.setPending(false);
      if (runtime.isMounted()) setBusy(false);
    }
  }, [runtime]);

  const value: AuthContextValue = {
    status: session.status,
    user: session.user,
    identity: session.identity,
    error: (operationError ?? session.error)?.message ?? null,
    errorCode: (operationError ?? session.error)?.code ?? null,
    busy,
    phoneChallenge,
    appleAvailable,
    signInGoogle: () => run(async () => {
      runtime.setPhoneCancelled(false);
      controller.clear(); await phone.clear();
      return controller.restore(summary(await signInGoogleIdentity()));
    }),
    signInApple: () => run(async () => {
      runtime.setPhoneCancelled(false);
      controller.clear(); await phone.clear();
      return controller.restore(summary(await signInAppleIdentity()));
    }),
    sendPhoneOtp: number => run(async () => {
      runtime.setPhoneCancelled(false);
      controller.clear();
      try { await phone.send(number); }
      catch (error) {
        if (error instanceof AuthError && error.code === 'cancelled') await signOutIdentity();
        throw error;
      }
      // Android Firebase can verify automatically. It still needs backend authorization.
      const identity = getFirebaseAuth().currentUser;
      if (identity?.phoneNumber === number) {
        await phone.clear();
        return controller.restore(summary(identity));
      }
      return null;
    }),
    verifyPhoneOtp: code => run(async () => {
      try { return await controller.restore(summary(await phone.verify(code))); }
      catch (error) {
        if (error instanceof AuthError && error.code === 'cancelled') { controller.clear(); await signOutIdentity(); }
        throw error;
      }
    }),
    cancelPhoneOtp: () => {
      runtime.setPhoneCancelled(true);
      controller.clear();
      return phone.clear();
    },
    api,
    signIn: (email, password, remember = true) => run(async () => {
      runtime.setPhoneCancelled(false);
      controller.clear();
      return controller.restore(summary(await signInIdentity(email, password, remember)));
    }),
    signUp: (email, password) => run(async () => { runtime.setPhoneCancelled(false); return controller.restore(summary(await createIdentity(email, password))); }),
    sendVerification: () => run(sendVerificationEmail),
    checkVerification: () => run(async () => {
      const identity = await reloadVerifiedIdentity();
      return controller.restore(summary(identity));
    }),
    completeProfile: profile => run(async () => {
      const identity = getFirebaseAuth().currentUser;
      if (!identity?.emailVerified) throw new AuthError('invalidVerification', 'Verify your email before creating your member profile.');
      await api.completeProfile(profile);
      if (getFirebaseAuth().currentUser?.uid !== identity.uid || runtime.isSigningOut()) {
        throw new AuthError('cancelled', 'The session changed. Please sign in again.');
      }
      return controller.restore(summary(identity));
    }),
    uploadAvatar: dataUrl => run(async () => {
      if (controller.getState().status !== 'authenticated') throw new AuthError('sessionExpired', 'Sign in before updating your picture.');
      await api.uploadAvatar(dataUrl);
      await controller.restore(summary(getFirebaseAuth().currentUser));
    }),
    signOut: () => run(async () => {
      runtime.setSigningOut(true);
      controller.clear(); // Revoke local route access before asynchronous cleanup.
      try {
        await signOutIdentity();
      } finally {
        try { await phone.clear(); }
        finally {
          try { await clearRegistrationDraft(); }
          finally { runtime.setSigningOut(false); }
        }
      }
    }),
    retryRestore: () => run(async () => controller.restore(summary(getFirebaseAuth().currentUser))),
    requestPasswordReset: email => run(() => requestPasswordResetEmail(email)),
    setRemember: remember => run(() => setRememberDevice(remember)),
    clearError: () => setOperationError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
