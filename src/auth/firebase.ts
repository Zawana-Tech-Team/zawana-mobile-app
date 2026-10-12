import { getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';

import { AuthError } from './errors';
import { getIdentityPersistence } from './firebase-persistence';
import type { PhoneConfirmation } from './phone-challenge';

let authInstance: FirebaseAuth.Auth | null = null;
let persistentPersistence: FirebaseAuth.Persistence | undefined;

/** Public client identifiers only. Private service-account keys belong on the backend. */
function firebaseConfig() {
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new AuthError('configuration', 'Firebase sign-in is not configured. Add the public Firebase configuration for the existing ZAWANA project.');
  }
  return config;
}

export function getFirebaseAuth(): FirebaseAuth.Auth {
  if (authInstance) return authInstance;
  const existing = getApps().find(app => app.name === 'zawana-mobile');
  const app = existing ?? initializeApp(firebaseConfig(), 'zawana-mobile');
  persistentPersistence = getIdentityPersistence().persistent;
  try {
    authInstance = FirebaseAuth.initializeAuth(app, {
      persistence: persistentPersistence,
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/already-initialized') {
      authInstance = FirebaseAuth.getAuth(app); // Fast Refresh uses the same configured instance.
    } else throw error;
  }
  return authInstance;
}

export async function setRememberDevice(remember: boolean): Promise<void> {
  const auth = getFirebaseAuth();
  await FirebaseAuth.setPersistence(auth, remember && persistentPersistence ? persistentPersistence : FirebaseAuth.inMemoryPersistence);
}

export async function signInIdentity(email: string, password: string, remember = true): Promise<FirebaseAuth.User> {
  await setRememberDevice(remember);
  const credential = await FirebaseAuth.signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return credential.user;
}

export async function createIdentity(email: string, password: string): Promise<FirebaseAuth.User> {
  const auth = getFirebaseAuth();
  const normalized = email.trim().toLowerCase();
  // Only resume this device's already authenticated identity. A duplicate-account
  // error never triggers a speculative sign-in with the submitted password.
  if (auth.currentUser?.email?.toLowerCase() === normalized) return auth.currentUser;
  await setRememberDevice(true);
  return (await FirebaseAuth.createUserWithEmailAndPassword(auth, normalized, password)).user;
}

export async function sendVerificationEmail(): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new AuthError('sessionExpired', 'Sign in before requesting verification.');
  if (!user.emailVerified) await FirebaseAuth.sendEmailVerification(user);
}

export async function reloadVerifiedIdentity(): Promise<FirebaseAuth.User> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new AuthError('sessionExpired', 'Sign in to continue verification.');
  await FirebaseAuth.reload(user);
  await user.getIdToken(true); // Backend must see the refreshed email_verified claim.
  return user;
}

export async function requestPasswordResetEmail(email: string): Promise<void> {
  await FirebaseAuth.sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function signOutIdentity(): Promise<void> {
  await FirebaseAuth.signOut(getFirebaseAuth());
}

export async function signInGoogleIdentity() {
  const provider = new FirebaseAuth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return (await FirebaseAuth.signInWithPopup(getFirebaseAuth(), provider)).user;
}

export async function signInAppleIdentity(): Promise<FirebaseAuth.User> {
  throw new AuthError('unavailable', 'Apple Sign-In requires a supported Apple device and development build.');
}

export async function isAppleAvailable() { return false; }
export async function prepareIdentitySession() { /* Web persistence is already initialized by Firebase. */ }

export async function sendPhoneVerification(_phone: string): Promise<PhoneConfirmation> {
  throw new AuthError('configuration', 'SMS verification requires the ZAWANA native development build with Firebase app verification.');
}

export { onIdTokenChanged } from 'firebase/auth';
export type { User as FirebaseIdentity } from 'firebase/auth';
