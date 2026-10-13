export type AuthErrorCode =
  | 'configuration'
  | 'invalidInput'
  | 'invalidCredentials'
  | 'accountNotFound'
  | 'invalidVerification'
  | 'expiredVerification'
  | 'profileRequired'
  | 'sessionExpired'
  | 'accountExists'
  | 'forbidden'
  | 'rateLimited'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'unavailable'
  | 'invalidResponse';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status?: number;
  readonly retryAfterSeconds?: number;

  constructor(code: AuthErrorCode, message: string, options?: { status?: number; retryAfterSeconds?: number }) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = options?.status;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

/** Do not pass provider/transport error text through to UI or logs. */
export function sanitizeAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';
  // Android can wrap a billing rejection in auth/unknown or auth/internal-error.
  // Inspect only the known marker; provider messages never reach the UI.
  if (['auth/unknown', 'auth/internal-error'].includes(code) && typeof error === 'object' && error !== null) {
    const messages = ['message', 'nativeErrorMessage'].map(key =>
      key in error ? (error as Record<string, unknown>)[key] : undefined
    );
    if (messages.some(value => typeof value === 'string' && /\[\s*BILLING_NOT_ENABLED\s*\]/.test(value)))
      return new AuthError('configuration', 'SMS verification requires Firebase billing setup. Contact ZAWANA support.');
  }
  switch (code) {
    case 'SIGN_IN_CANCELLED':
    case 'ERR_REQUEST_CANCELED':
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new AuthError('cancelled', 'Sign-in was cancelled.');
    case 'DEVELOPER_ERROR':
    case 'auth/invalid-app-credential':
    case 'auth/missing-app-credential':
    case 'auth/app-not-authorized':
    case 'auth/missing-client-identifier':
      return new AuthError(
        'configuration',
        'Native sign-in app verification is not configured. Check the Firebase app credentials and signing fingerprints.'
      );
    case 'PLAY_SERVICES_NOT_AVAILABLE':
      return new AuthError('unavailable', 'Google Play Services is unavailable. Update it or use another sign-in method.');
    case 'auth/invalid-phone-number':
      return new AuthError('invalidInput', 'Enter a valid mobile phone number.');
    case 'auth/billing-not-enabled':
      return new AuthError('configuration', 'SMS verification requires Firebase billing setup. Contact ZAWANA support.');
    case 'auth/multi-factor-auth-required':
      return new AuthError(
        'forbidden',
        'This account requires additional verification. Sign in through the ZAWANA website or contact support.'
      );
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new AuthError('invalidCredentials', 'The sign-in details are incorrect. Try again or reset your password.');
    case 'auth/invalid-verification-code':
    case 'auth/invalid-action-code':
      return new AuthError(
        'invalidVerification',
        'This verification could not be accepted. Request a new one and try again.'
      );
    case 'auth/code-expired':
    case 'auth/expired-action-code':
    case 'auth/session-expired':
      return new AuthError('expiredVerification', 'This verification has expired. Request a new one.');
    case 'auth/email-already-in-use':
    case 'auth/account-exists-with-different-credential':
    case 'auth/credential-already-in-use':
      return new AuthError('accountExists', 'This account already uses a sign-in method. Sign in or reset your password.');
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return new AuthError('rateLimited', 'Too many attempts. Please wait before trying again.');
    case 'auth/network-request-failed':
      return new AuthError('network', 'Could not connect. Check your internet connection and try again.');
    case 'auth/invalid-email':
      return new AuthError('invalidInput', 'Enter a valid email address.');
    case 'auth/weak-password':
      return new AuthError('invalidInput', 'Choose a stronger password with at least 8 characters.');
    case 'auth/user-token-expired':
    case 'auth/invalid-user-token':
      return new AuthError('sessionExpired', 'Your session has expired. Please sign in again.');
    case 'auth/user-disabled':
      return new AuthError('forbidden', 'This account is unavailable. Please contact ZAWANA support.');
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
    case 'auth/invalid-api-key':
    case 'auth/unauthorized-domain':
      return new AuthError('configuration', 'Sign-in is not configured yet. Please contact ZAWANA support.');
    default:
      return new AuthError('unavailable', 'Could not complete the request. Please try again.');
  }
}

export function authHttpError(status: number, retryAfterSeconds?: number): AuthError {
  const options = { status, retryAfterSeconds };
  if (status === 400 || status === 422) return new AuthError('invalidInput', 'Check your details and try again.', options);
  if (status === 401) return new AuthError('sessionExpired', 'Your session has expired. Please sign in again.', options);
  if (status === 403) return new AuthError(
    'forbidden',
    'This verified identity cannot access the account. Contact ZAWANA support.',
    options
  );
  if (status === 409) return new AuthError('accountExists', 'The account could not be updated. Try signing in again.', options);
  if (status === 428) return new AuthError('profileRequired', 'Complete your member profile to continue.', options);
  if (status === 429) return new AuthError('rateLimited', 'Too many attempts. Please wait before trying again.', options);
  return new AuthError('unavailable', 'ZAWANA could not complete the request. Please try again later.', options);
}
