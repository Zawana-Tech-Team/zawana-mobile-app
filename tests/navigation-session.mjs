import assert from 'node:assert/strict';
import test from 'node:test';
import { sessionNavigation } from '../src/auth/navigation-policy.ts';
import { createSessionController } from '../src/auth/session-controller.ts';
import { AuthError } from '../src/auth/errors.ts';

const identity = { uid: 'firebase-member', email: 'member@example.test', emailVerified: true };
const session = {
  user: { id: 'backend-member', name: 'Member', email: identity.email, role: 'member', phone: null, membership: null, avatar: null },
  security: { mfaEnrolled: false, mfaRequired: false },
};
const controller = validateSession => createSessionController({ validateSession, onChange() {} });
const policy = instance => sessionNavigation(instance.getState());

test('startup blocks Home until both Firebase restoration and backend validation finish', async () => {
  let resolve;
  const request = new Promise(done => { resolve = done; });
  const auth = controller(() => request);
  assert.equal(policy(auth).restoring, true);
  assert.equal(policy(auth).member, false);
  const restored = auth.restore(identity);
  assert.equal(policy(auth).member, false);
  resolve(session);
  await restored;
  assert.equal(policy(auth).member, true);
  assert.equal(policy(auth).authentication, false);
  assert.equal(policy(auth).landing, '/home');
});

test('unverified restoration resumes Verify without backend access', async () => {
  const auth = controller(() => { throw new Error('Must not contact the backend'); });
  await auth.restore({ ...identity, emailVerified: false });
  assert.equal(policy(auth).landing, '/verify');
  assert.equal(policy(auth).member, false);
});

test('backend profile requirement resumes account creation without granting Home access', async () => {
  const auth = controller(async () => { throw new AuthError('profileRequired', 'Complete your profile'); });
  await auth.restore(identity);
  assert.equal(policy(auth).landing, '/create-account');
  assert.equal(policy(auth).member, false);
});

test('failed restoration revokes member routes and leaves recovery available', async () => {
  let offline = false;
  const auth = controller(async () => {
    if (offline) throw new AuthError('network', 'Unable to connect');
    return session;
  });
  await auth.restore(identity);
  offline = true;
  await auth.restore(identity);
  assert.equal(policy(auth).member, false);
  assert.equal(policy(auth).authentication, true);
  assert.equal(policy(auth).restoring, false);
  assert.equal(policy(auth).landing, '/');
});

test('sign out immediately removes member access and late restoration cannot reopen it', async () => {
  let resolve;
  const auth = controller(() => new Promise(done => { resolve = done; }));
  const restored = auth.restore(identity);
  auth.clear();
  assert.equal(policy(auth).landing, '/');
  assert.equal(policy(auth).member, false);
  resolve(session);
  await restored;
  assert.equal(policy(auth).member, false);
  assert.equal(auth.getState().user, null);
});

test('authenticated status alone cannot bypass missing user or email verification', () => {
  assert.equal(sessionNavigation({ status: 'authenticated', identity, user: null }).member, false);
  assert.equal(sessionNavigation({ status: 'authenticated', identity: { ...identity, emailVerified: false }, user: session.user }).member, false);
});

test('MFA-required backend sessions cannot reach member Home', async () => {
  const auth = controller(async () => ({ ...session, security: { mfaEnrolled: true, mfaRequired: true } }));
  await auth.restore(identity);
  assert.equal(policy(auth).member, false);
  assert.equal(policy(auth).landing, '/');
});
