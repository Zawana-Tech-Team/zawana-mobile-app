import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionController } from '../src/auth/session-controller.ts';
import { AuthError } from '../src/auth/errors.ts';
import { createChunkedStorage, createMemoryStorage } from '../src/auth/storage.ts';
import { sanitizeRegistrationDraft } from '../src/auth/draft-core.ts';

const identity = (uid = 'identity-a', emailVerified = true) => ({ uid, email: `${uid}@example.test`, emailVerified });
const session = name => ({
  user: {
    id: name,
    name,
    email: `${name}@example.test`,
    role: 'member',
    phone: null,
    membership: null,
    avatar: null
  },
  security: { mfaEnrolled: false, mfaRequired: false },
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

test('anonymous identities are blocked; email verification does not replace backend session validation', async () => {
  let calls = 0;
  const controller = createSessionController({
    validateSession: async () => {
      calls++;
      return session('a');
    }, onChange() { }
  });
  assert.equal(await controller.restore(null), 'anonymous');
  assert.equal(calls, 0);
  assert.equal(await controller.restore(identity('a', false)), 'authenticated');
  assert.equal(calls, 1);
  assert.equal(controller.getState().user.id, 'a');
});

test('a verified identity receives route access only after backend session validation', async () => {
  const request = deferred();
  const controller = createSessionController({ validateSession: () => request.promise, onChange() { } });
  const restoration = controller.restore(identity());
  assert.equal(controller.getState().status, 'loading');
  assert.equal(controller.getState().user, null);
  request.resolve(session('canonical-member'));
  assert.equal(await restoration, 'authenticated');
  assert.equal(controller.getState().user.id, 'canonical-member');
});

test('a missing application profile routes to profile completion', async () => {
  const controller = createSessionController({
    validateSession: async () => { throw new AuthError('profileRequired', 'Profile required'); },
    onChange() { }
  });
  assert.equal(await controller.restore(identity()), 'profile-required');
  assert.equal(controller.getState().user, null);
});

test('restoration network failure revokes any previous application access', async () => {
  let fail = false;
  const controller = createSessionController({
    validateSession: async () => {
      if (fail) throw new AuthError('network', 'Offline');
      return session('member');
    },
    onChange() { }
  });
  assert.equal(await controller.restore(identity()), 'authenticated');
  fail = true;
  assert.equal(await controller.restore(identity()), 'error');
  assert.equal(controller.getState().user, null);
});

test('a stale response for an older identity cannot replace the newer session', async () => {
  const first = deferred();
  let firstSignal;
  const controller = createSessionController({
    validateSession: (user, signal) => {
      if (user.uid === 'a') {
        firstSignal = signal;
        return first.promise;
      }
      return Promise.resolve(session('b'));
    },
    onChange() { },
  });
  const old = controller.restore(identity('a'));
  await controller.restore(identity('b'));
  assert.equal(firstSignal.aborted, true);
  first.resolve(session('a'));
  await old;
  assert.equal(controller.getState().user.id, 'b');
});

test('sign-out during restoration immediately clears access and ignores later success', async () => {
  const request = deferred();
  const controller = createSessionController({ validateSession: () => request.promise, onChange() { } });
  const restoration = controller.restore(identity());
  controller.clear();
  request.resolve(session('member'));
  await restoration;
  assert.equal(controller.getState().status, 'anonymous');
  assert.equal(controller.getState().user, null);
  assert.equal(controller.getState().identity, null);
});

test('required MFA does not become an authenticated mobile session', async () => {
  const controller = createSessionController({
    validateSession: async () => ({ ...session('staff'), security: { mfaEnrolled: true, mfaRequired: true } }),
    onChange() { }
  });
  assert.equal(await controller.restore(identity()), 'error');
  assert.equal(controller.getState().user, null);
  assert.equal(controller.getState().error.code, 'forbidden');
});

test('secure storage chunks large Unicode JSON and removes all committed parts on sign-out', async () => {
  const values = new Map();
  const driver = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => {
      assert.ok(Buffer.byteLength(value) <= 1_600);
      values.set(key, value);
    },
    removeItem: async key => { values.delete(key); },
  };
  const storage = createChunkedStorage(driver);
  const value = JSON.stringify({ testValue: '🌸'.repeat(1_500) });
  await storage.setItem('firebase:auth:user', value);
  assert.equal(await storage.getItem('firebase:auth:user'), value);
  assert.ok(values.size > 2);
  await storage.removeItem('firebase:auth:user');
  assert.equal(values.size, 0);
});

test('a failed secure-storage write preserves the prior committed session', async () => {
  const base = createMemoryStorage();
  let fail = false;
  const storage = createChunkedStorage({
    ...base,
    setItem: async (key, value) => {
      if (fail && value === 'replacement') throw new Error('storage failure');
      await base.setItem(key, value);
    }
  });
  await storage.setItem('key', 'original');
  fail = true;
  await assert.rejects(storage.setItem('key', 'replacement'));
  assert.equal(await storage.getItem('key'), 'original');
});

test('a missing encrypted chunk never restores truncated authentication data', async () => {
  const values = new Map();
  const storage = createChunkedStorage({
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  });
  await storage.setItem('key', 'a'.repeat(1_000));
  values.delete([...values.keys()].find(key => key.endsWith('.1')));
  assert.equal(await storage.getItem('key'), null);
  assert.equal(values.size, 0);
});

test('queued writes and a following removal cannot resurrect a signed-out session', async () => {
  const storage = createChunkedStorage(createMemoryStorage());
  const writes = [
    storage.setItem('key', 'first'),
    storage.setItem('key', 'second'),
    storage.removeItem('key')
  ];
  await Promise.all(writes);
  assert.equal(await storage.getItem('key'), null);
});

test('interrupted registration preserves only allowlisted nonsecret fields', () => {
  const draft = sanitizeRegistrationDraft({
    email: 'member@example.test',
    name: 'Member',
    phone: '+959123456789',
    dateOfBirth: '2000-01-01',
    interests: ['Badminton'],
    avatarUri: 'file:///profile.jpg',
    password: 'do-not-store',
    verificationCode: '123456',
    refreshToken: 'do-not-store',
    accessToken: 'do-not-store',
  });
  assert.deepEqual(draft, {
    email: 'member@example.test',
    name: 'Member',
    phone: '+959123456789',
    dateOfBirth: '2000-01-01',
    interests: ['Badminton'],
    avatarUri: 'file:///profile.jpg',
  });
  assert.equal(sanitizeRegistrationDraft({ avatarUri: 'data:image/jpeg;base64,secret' }).avatarUri, undefined);
});
