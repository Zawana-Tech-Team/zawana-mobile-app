import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhoneChallenge } from '../src/auth/phone-challenge.ts';
import { createMemoryStorage } from '../src/auth/storage.ts';
import { createSessionController } from '../src/auth/session-controller.ts';
import { sessionNavigation } from '../src/auth/navigation-policy.ts';
import { AuthError, sanitizeAuthError } from '../src/auth/errors.ts';

const number = '+959421234567';
const user = { uid: 'firebase-phone', email: null, emailVerified: false, phoneNumber: number, displayName: null, getIdToken: async () => 'unit-fixture' };
const canonical = { user: { id: 'zawana-member', name: 'Member', email: 'member@example.test', role: 'member', phone: number, avatar: null, membership: null }, security: { mfaRequired: false, mfaEnrolled: false } };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function setup(send = async () => ({ confirm: async () => ({ user }) })) {
  let clock = 1_000_000;
  const storage = createMemoryStorage();
  const challenge = createPhoneChallenge({ storage, send, onChange() {}, now: () => clock });
  return { challenge, storage, advance: value => { clock += value; }, clock: () => clock };
}

test('SMS requests persist only metadata; Firebase confirmation and OTP never enter storage', async () => {
  const { challenge, storage } = setup();
  await challenge.send(number);
  assert.equal(challenge.getState().resumable, true);
  assert.deepEqual(JSON.parse(await storage.getItem('phone-challenge-metadata-v1')), { phone: number, sentAt: 1_000_000 });
  assert.equal((await challenge.verify('123456')).uid, user.uid);
  assert.equal(challenge.getState(), null);
  assert.equal(await storage.getItem('phone-challenge-metadata-v1'), null);
});

test('empty and malformed OTPs never reach Firebase', async () => {
  let calls = 0;
  const { challenge } = setup(async () => ({ confirm: async () => { calls++; return { user }; } }));
  await challenge.send(number);
  for (const code of ['', '12345', 'abcdef', '1234567']) await assert.rejects(challenge.verify(code), error => error.code === 'invalidVerification');
  assert.equal(calls, 0);
});

test('Firebase invalid and expired code failures never manufacture verification success', async () => {
  for (const code of ['auth/invalid-verification-code', 'auth/session-expired']) {
    const { challenge } = setup(async () => ({ confirm: async () => { throw { code }; } }));
    await challenge.send(number);
    await assert.rejects(challenge.verify('123456'));
    assert.ok(challenge.getState());
  }
});

test('resend cooldown prevents duplicate SMS and permits a later real provider request', async () => {
  let calls = 0;
  const { challenge, advance } = setup(async () => { calls++; return { confirm: async () => ({ user }) }; });
  await challenge.send(number);
  await assert.rejects(challenge.send(number), error => error.code === 'rateLimited');
  advance(60_000);
  await challenge.send(number);
  assert.equal(calls, 2);
});

test('SMS quota and network failures do not create a verification challenge', async () => {
  for (const code of ['auth/quota-exceeded', 'auth/network-request-failed']) {
    const { challenge } = setup(async () => { throw { code }; });
    await assert.rejects(challenge.send(number));
    assert.equal(challenge.getState(), null);
  }
});

test('restart restores resend timing but requires a new Firebase proof', async () => {
  const { challenge, storage, clock } = setup();
  await challenge.send(number);
  const restarted = createPhoneChallenge({ storage, send: async () => ({ confirm: async () => ({ user }) }), onChange() {}, now: clock });
  await restarted.restore();
  assert.equal(restarted.getState().phone, number);
  assert.equal(restarted.getState().resumable, false);
  await assert.rejects(restarted.verify('123456'), error => error.code === 'expiredVerification');
  await assert.rejects(restarted.send(number), error => error.code === 'rateLimited');
});

test('cancelling an outstanding SMS request prevents its late response from reviving the challenge', async () => {
  const pending = deferred();
  const { challenge, storage } = setup(() => pending.promise);
  const request = challenge.send(number);
  await challenge.clear();
  pending.resolve({ confirm: async () => ({ user }) });
  await assert.rejects(request, error => error.code === 'cancelled');
  assert.equal(challenge.getState(), null);
  assert.equal(await storage.getItem('phone-challenge-metadata-v1'), null);
});

test('cancelling in-flight verification rejects late Firebase success', async () => {
  const pending = deferred();
  const { challenge } = setup(async () => ({ confirm: () => pending.promise }));
  await challenge.send(number);
  const request = challenge.verify('123456');
  await challenge.clear();
  pending.resolve({ user });
  await assert.rejects(request, error => error.code === 'cancelled');
});

test('a provider result for another number is rejected', async () => {
  const { challenge } = setup(async () => ({ confirm: async () => ({ user: { ...user, phoneNumber: '+6581234567' } }) }));
  await challenge.send(number);
  await assert.rejects(challenge.verify('123456'), error => error.code === 'invalidVerification');
});

test('verified phone-only identity still needs canonical backend validation before Home', async () => {
  const pending = deferred();
  const controller = createSessionController({ validateSession: () => pending.promise, onChange() {} });
  const request = controller.restore(user);
  assert.equal(sessionNavigation(controller.getState()).member, false);
  pending.resolve(canonical);
  await request;
  assert.equal(sessionNavigation(controller.getState()).landing, '/home');
});

test('backend rejection and onboarding requirement never grant phone users protected access', async () => {
  for (const code of ['sessionExpired', 'forbidden', 'profileRequired']) {
    const controller = createSessionController({ validateSession: async () => { throw new AuthError(code, 'Rejected'); }, onChange() {} });
    await controller.restore(user);
    assert.equal(sessionNavigation(controller.getState()).member, false);
    if (code === 'profileRequired') assert.equal(controller.getState().status, 'profile-required');
  }
});

test('Google/Apple cancellation, provider configuration and unavailable services are sanitized', () => {
  for (const code of ['SIGN_IN_CANCELLED', 'ERR_REQUEST_CANCELED']) assert.equal(sanitizeAuthError({ code, message: 'private provider details' }).code, 'cancelled');
  for (const code of ['DEVELOPER_ERROR', 'auth/invalid-app-credential']) assert.equal(sanitizeAuthError({ code }).code, 'configuration');
  assert.equal(sanitizeAuthError({ code: 'PLAY_SERVICES_NOT_AVAILABLE' }).code, 'unavailable');
  assert.equal(sanitizeAuthError({ code: 'auth/network-request-failed' }).code, 'network');
});
