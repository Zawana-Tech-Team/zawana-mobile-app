import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { AuthError } from './errors';
import type { FirebaseIdentity } from './identity';
import type { PhoneConfirmation } from './phone-challenge';
import { secureDeviceStorage } from './storage';

// Defer optional native modules so missing development builds fail with an actionable error.
function nativeAuth(): typeof import('@react-native-firebase/auth') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load only when used; Expo Go must render an actionable configuration error.
  try { return require('@react-native-firebase/auth'); }
  catch {
    throw new AuthError(
      'configuration',
      'Install a ZAWANA development build containing native Firebase Auth. Expo Go is not supported.'
    );
  }
}
function googleModule(): typeof import('react-native-nitro-google-signin') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Optional native module cannot be eagerly evaluated in Expo Go.
  try { return require('react-native-nitro-google-signin'); }
  catch {
    throw new AuthError('configuration', 'Rebuild ZAWANA with its native Google Sign-In module.');
  }
}

export function getFirebaseAuth() {
  try { return nativeAuth().getAuth(); }
  catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      'configuration',
      'The Firebase native app configuration is missing. Supply the existing project configuration and rebuild.'
    );
  }
}
let rememberDevice = true;
const EPHEMERAL_KEY = 'native-firebase-ephemeral-session-v1';
export async function setRememberDevice(remember: boolean) {
  rememberDevice = remember;
  if (remember) await secureDeviceStorage.removeItem(EPHEMERAL_KEY);
}

export function onIdTokenChanged(
  auth: ReturnType<typeof getFirebaseAuth>,
  listener: (user: FirebaseIdentity | null) => void
) {
  return nativeAuth().onIdTokenChanged(auth, listener);
}
export async function signInIdentity(email: string, password: string, remember = true) {
  await setRememberDevice(remember);
  const user = (await nativeAuth().signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)).user;
  if (!rememberDevice) {
    try { await secureDeviceStorage.setItem(EPHEMERAL_KEY, user.uid); }
    catch {
      await nativeAuth().signOut(getFirebaseAuth());
      throw new AuthError('unavailable', 'Could not keep this session temporary. Please retry.');
    }
  }
  return user;
}
export async function createIdentity(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.email?.toLowerCase() === email.trim().toLowerCase()) return auth.currentUser;
  rememberDevice = true;
  return (await nativeAuth().createUserWithEmailAndPassword(auth, email.trim(), password)).user;
}
export async function sendVerificationEmail() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new AuthError('sessionExpired', 'Sign in before requesting verification.');
  if (!user.emailVerified) await nativeAuth().sendEmailVerification(user);
}
export async function reloadVerifiedIdentity() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new AuthError('sessionExpired', 'Sign in to continue verification.');
  await nativeAuth().reload(user);
  await nativeAuth().getIdToken(user, true);
  return getFirebaseAuth().currentUser ?? user;
}
export async function requestPasswordResetEmail(email: string) { await nativeAuth().sendPasswordResetEmail(getFirebaseAuth(), email.trim()); }
export async function signOutIdentity() {
  await nativeAuth().signOut(getFirebaseAuth());
  await secureDeviceStorage.removeItem(EPHEMERAL_KEY);
  try { await googleModule().GoogleOneTapSignIn.signOut(); } catch { /* Firebase session is already revoked locally. */ }
}
export async function prepareIdentitySession() {
  // Native Firebase owns Keychain/SDK persistence. Never copy its refresh token into JS storage.
  // A session explicitly marked as ephemeral must not be restored after a fresh app start.
  if (await secureDeviceStorage.getItem(EPHEMERAL_KEY)) {
    await nativeAuth().signOut(getFirebaseAuth());
    await secureDeviceStorage.removeItem(EPHEMERAL_KEY);
  }
}

export async function sendPhoneVerification(phone: string): Promise<PhoneConfirmation> {
  await setRememberDevice(true);
  return nativeAuth().signInWithPhoneNumber(getFirebaseAuth(), phone);
}

export async function signInGoogleIdentity() {
  await setRememberDevice(true);
  const auth = getFirebaseAuth();
  const { GoogleOneTapSignIn, isNoSavedCredentialFoundResponse, isSuccessResponse } = googleModule();
  GoogleOneTapSignIn.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'autoDetect' });
  if (Platform.OS === 'android') await GoogleOneTapSignIn.checkPlayServices();
  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.createAccount();
  if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.presentExplicitSignIn();
  if (!isSuccessResponse(response)) throw new AuthError('cancelled', 'Google sign-in was cancelled.');
  if (!response.data?.idToken) throw new AuthError('invalidCredentials', 'Google did not return an identity credential.');
  const credential = nativeAuth().GoogleAuthProvider.credential(response.data.idToken);
  return (await nativeAuth().signInWithCredential(auth, credential)).user;
}

export async function isAppleAvailable() {
  return Platform.OS === 'ios' && await AppleAuthentication.isAvailableAsync();
}
export async function signInAppleIdentity() {
  if (!await isAppleAvailable()) throw new AuthError('unavailable', 'Apple Sign-In is unavailable on this device.');
  const auth = getFirebaseAuth();
  await setRememberDevice(true);
  const rawNonce = Array.from(Crypto.getRandomBytes(32), byte => byte.toString(16).padStart(2, '0')).join('');
  const state = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const response = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL
    ],
    nonce,
    state,
  });
  if (!response.identityToken || response.state !== state) throw new AuthError('invalidCredentials', 'Apple returned an invalid authentication response.');
  const provider = new (nativeAuth().OAuthProvider)('apple.com');
  const credential = provider.credential({
    idToken: response.identityToken,
    rawNonce,
    ...(response.fullName ? {
      fullName: {
        givenName: response.fullName.givenName ?? undefined,
        familyName: response.fullName.familyName ?? undefined
      }
    } : {}),
  });
  // Firebase persists the first authorization's name and relay email; null later responses never overwrite them.
  return (await nativeAuth().signInWithCredential(auth, credential)).user;
}
export type { FirebaseIdentity } from './identity';
