import { AuthError, authHttpError, sanitizeAuthError } from './errors.ts';
import type { AppUser, AuthSession, MemberDashboard, ProfileInput, ProfileUpdate, UserRole } from './types.ts';

type RequestOptions = { signal?: AbortSignal };
type ApiOptions = {
  /** Origin or API base including /api; EXPO_PUBLIC_API_URL is used when omitted. */
  baseUrl?: string;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const roles = new Set<UserRole>(['member', 'coach', 'admin', 'gym_fo', 'clinic_fo', 'badminton_fo', 'store_fo', 'cafe_fo', 'doctor', 'owner']);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const invalidResponse = () => new AuthError('invalidResponse', 'ZAWANA returned an unexpected response. Please try again later.');

function appUser(value: unknown): AppUser {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string'
    || typeof value.email !== 'string' || typeof value.role !== 'string' || !roles.has(value.role as UserRole)
    || !nullableString(value.phone) || !nullableString(value.membership) || !nullableString(value.avatar)) throw invalidResponse();
  return value as AppUser;
}

function authSession(value: unknown): AuthSession {
  if (!isRecord(value) || !isRecord(value.security) || typeof value.security.mfaEnrolled !== 'boolean'
    || typeof value.security.mfaRequired !== 'boolean') throw invalidResponse();
  appUser(value.user);
  return value as AuthSession;
}

function memberDashboard(value: unknown): MemberDashboard {
  const collections = ['bookings', 'recentBookings', 'todayBookings', 'upcomingBookings', 'packages', 'notifications', 'enrollmentHistory', 'checkIns', 'purchases'];
  if (!isRecord(value) || collections.some(key => !Array.isArray(value[key]) || value[key].some((entry: unknown) => !isRecord(entry)))
    || typeof value.todayBookingCount !== 'number' || !Number.isInteger(value.todayBookingCount) || value.todayBookingCount < 0
    || typeof value.upcomingBookingCount !== 'number' || !Number.isInteger(value.upcomingBookingCount) || value.upcomingBookingCount < 0
    || !(value.enrollment === null || isRecord(value.enrollment))) throw invalidResponse();
  return value as MemberDashboard;
}

function retryAfter(response: Response): number | undefined {
  const value = response.headers.get('Retry-After');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const deadline = Date.parse(value);
  return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)) : undefined;
}

/** Identity tokens are obtained for each request and never written to storage here. */
export function createAuthApi(options: ApiOptions) {
  const configuredUrl = (options.baseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const baseUrl = configuredUrl && !/\/api$/.test(configuredUrl) ? configuredUrl + '/api' : configuredUrl;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  function validateConfiguration() {
    let url: URL;
    try { url = new URL(baseUrl); }
    catch { throw new AuthError('configuration', 'The ZAWANA API is not configured yet. Please contact support.'); }
    if (!['http:', 'https:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
      || url.username || url.password || url.search || url.hash
      || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new AuthError('configuration', 'The ZAWANA API configuration is invalid. Please contact support.');
    }
  }

  async function request<T>(path: string, method: 'GET' | 'POST' | 'PATCH', body: unknown, validate: (value: unknown) => T, requestOptions: RequestOptions = {}): Promise<T> {
    validateConfiguration();
    for (let attempt = 0; attempt < 2; attempt++) {
      if (requestOptions.signal?.aborted) throw new AuthError('cancelled', 'The request was cancelled.');
      let token: string;
      try { token = await options.getIdToken(attempt === 1); }
      catch (error) { throw sanitizeAuthError(error); }
      if (!token || /[\r\n]/.test(token)) throw new AuthError('sessionExpired', 'Please sign in again to continue.');
      const controller = new AbortController();
      let timedOut = false;
      const onAbort = () => controller.abort();
      requestOptions.signal?.addEventListener('abort', onAbort, { once: true });
      if (requestOptions.signal?.aborted) controller.abort();
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          method,
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: controller.signal,
        });
        if (response.status === 401 && attempt === 0) continue;
        if (!response.ok) throw authHttpError(response.status, retryAfter(response));
        let value: unknown;
        try { value = await response.json(); }
        catch (error) { if (controller.signal.aborted) throw error; throw invalidResponse(); }
        return validate(value);
      } catch (error) {
        if (timedOut) throw new AuthError('timeout', 'The request took too long. Please try again.');
        if (requestOptions.signal?.aborted) throw new AuthError('cancelled', 'The request was cancelled.');
        if (error instanceof AuthError) throw error;
        throw new AuthError('network', 'Could not connect to ZAWANA. Check your internet connection and try again.');
      } finally {
        clearTimeout(timer);
        requestOptions.signal?.removeEventListener('abort', onAbort);
      }
    }
    throw new AuthError('sessionExpired', 'Your session has expired. Please sign in again.');
  }

  const session = (requestOptions?: RequestOptions) => request('/auth/session', 'POST', {}, authSession, requestOptions);
  return {
    session,
    async completeProfile(profile: ProfileInput, requestOptions?: RequestOptions): Promise<AuthSession> {
      try { return await request('/auth/complete-profile', 'POST', { name: profile.name.trim(), phone: profile.phone.trim() }, authSession, requestOptions); }
      catch (error) {
        // Another retry may already have created this verified identity's profile.
        // Resolve the canonical session rather than sending another registration mutation.
        if (error instanceof AuthError && error.status === 409) return session(requestOptions);
        throw error;
      }
    },
    getCurrentUser: (requestOptions?: RequestOptions) => request('/auth/me', 'GET', undefined, appUser, requestOptions),
    updateProfile: (profile: ProfileUpdate, requestOptions?: RequestOptions) => request('/profile', 'PATCH', profile, appUser, requestOptions),
    uploadAvatar: (image: string, requestOptions?: RequestOptions) => request('/profile/avatar', 'POST', { image }, value => {
      if (!isRecord(value) || typeof value.avatar !== 'string' || !value.avatar) throw invalidResponse();
      return value as { avatar: string };
    }, requestOptions),
    getMemberDashboard: (referenceDate?: string, requestOptions?: RequestOptions) => {
      if (referenceDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
        return Promise.reject(new AuthError('invalidInput', 'Choose a valid dashboard date.'));
      }
      return request(`/member/dashboard${referenceDate === undefined ? '' : `?referenceDate=${encodeURIComponent(referenceDate)}`}`, 'GET', undefined, memberDashboard, requestOptions);
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
