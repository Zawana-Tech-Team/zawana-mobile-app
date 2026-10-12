import { AuthError } from './errors.ts';
import type { StorageDriver } from './storage.ts';
import type { FirebaseIdentity } from './identity.ts';

export type PhoneConfirmation = { confirm(code: string): Promise<{ user: FirebaseIdentity }> };
export type PhoneChallenge = { phone: string; sentAt: number; resendAt: number; resumable: boolean };
const KEY = 'phone-challenge-metadata-v1';
const COOLDOWN = 60_000;
const MAX_AGE = 10 * 60_000;

/** Only encrypted, non-credential metadata persists. Firebase proofs and codes stay in memory. */
export function createPhoneChallenge(options: {
  storage: StorageDriver;
  send(phone: string): Promise<PhoneConfirmation>;
  onChange(challenge: PhoneChallenge | null): void;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  let current: PhoneChallenge | null = null;
  let confirmation: PhoneConfirmation | null = null;
  let pending = false;
  let generation = 0;
  const publish = (next: PhoneChallenge | null) => { current = next; options.onChange(next); };
  return {
    getState: () => current,
    async restore() {
      const attempt = generation;
      const raw = await options.storage.getItem(KEY);
      if (attempt !== generation || !raw || current) return;
      try {
        const data: unknown = JSON.parse(raw);
        if (!data || typeof data !== 'object' || !('phone' in data) || typeof data.phone !== 'string'
          || !/^\+[1-9]\d{6,14}$/.test(data.phone) || !('sentAt' in data) || typeof data.sentAt !== 'number'
          || !Number.isFinite(data.sentAt) || data.sentAt > now() || now() - data.sentAt > MAX_AGE) {
          await options.storage.removeItem(KEY); return;
        }
        publish({ phone: data.phone, sentAt: data.sentAt, resendAt: data.sentAt + COOLDOWN, resumable: false });
      } catch { await options.storage.removeItem(KEY); }
    },
    async send(phone: string) {
      if (pending) throw new AuthError('cancelled', 'Wait for the current verification request.');
      if (current && current.resendAt > now()) throw new AuthError('rateLimited', 'Wait before requesting another SMS.', { retryAfterSeconds: Math.ceil((current.resendAt - now()) / 1_000) });
      if (!/^\+[1-9]\d{6,14}$/.test(phone)) throw new AuthError('invalidInput', 'Enter a valid mobile number.');
      pending = true;
      const attempt = ++generation;
      try {
        const next = await options.send(phone);
        if (attempt !== generation) throw new AuthError('cancelled', 'Verification was cancelled.');
        confirmation = next;
        const sentAt = now();
        publish({ phone, sentAt, resendAt: sentAt + COOLDOWN, resumable: true });
        await options.storage.setItem(KEY, JSON.stringify({ phone, sentAt }));
      } finally { pending = false; }
    },
    async verify(code: string) {
      if (pending) throw new AuthError('cancelled', 'Wait for the current verification request.');
      if (!/^\d{6}$/.test(code)) throw new AuthError('invalidVerification', 'Enter the 6-digit SMS code.');
      if (!confirmation || !current?.resumable || now() - current.sentAt > MAX_AGE) throw new AuthError('expiredVerification', 'Request a new SMS code to continue.');
      pending = true;
      const attempt = generation;
      try {
        const result = await confirmation.confirm(code);
        if (attempt !== generation) throw new AuthError('cancelled', 'Verification was cancelled.');
        if (result.user.phoneNumber !== current.phone) throw new AuthError('invalidVerification', 'The verified phone does not match this request.');
        confirmation = null;
        publish(null);
        await options.storage.removeItem(KEY);
        return result.user;
      } finally { pending = false; }
    },
    async clear() {
      generation++;
      confirmation = null;
      publish(null);
      await options.storage.removeItem(KEY);
    },
  };
}
