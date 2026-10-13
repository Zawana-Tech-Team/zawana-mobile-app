/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAuthApi } from '../src/auth/api.ts';
import { AuthError, sanitizeAuthError } from '../src/auth/errors.ts';

const user = {
  id: 'member-1',
  name: 'Member',
  email: 'member@example.test',
  phone: '+959123456789',
  role: 'member',
  membership: null,
  avatar: null
};
const session = { user, security: { mfaEnrolled: false, mfaRequired: false } };
const dashboard = {
  bookings: [],
  recentBookings: [],
  todayBookings: [],
  todayBookingCount: 0,
  upcomingBookings: [],
  upcomingBookingCount: 0,
  packages: [],
  notifications: [],
  enrollment: null,
  enrollmentHistory: [],
  checkIns: [],
  purchases: []
};
const json = (value: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const create = (fetchImpl: typeof fetch, overrides: Partial<Parameters<typeof createAuthApi>[0]> = {}) => createAuthApi({
  baseUrl: 'https://api.example.test/api/',
  getIdToken: async () => 'verified-test-token',
  fetchImpl,
  ...overrides
});

test('session uses the actual Firebase session endpoint and preserves canonical user identity', async () => {
  let calls = 0;
  const api = create(async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.example.test/api/auth/session');
    assert.equal(options?.method, 'POST');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer verified-test-token');
    assert.deepEqual(JSON.parse(String(options?.body)), {});
    assert.ok(options?.signal);
    return json(session);
  });
  assert.deepEqual(await api.session(), session);
  assert.equal(calls, 1);
});

test(
  'an API origin and an explicit API base both resolve the same endpoint without duplicating /api',
  async () => {
    for (const baseUrl of [
      'https://api.example.test',
      'https://api.example.test/',
      'https://api.example.test/api/'
    ]) {
      const api = create(async url => {
        assert.equal(url, 'https://api.example.test/api/auth/session');
        return json(session);
      }, { baseUrl });
      assert.deepEqual(await api.session(), session);
    }
  }
);

test('401 forces token refresh once and retries with the refreshed token', async () => {
  const refreshes: (boolean | undefined)[] = [];
  let calls = 0;
  const api = create(async (_url, options) => {
    calls++;
    const token = new Headers(options?.headers).get('Authorization');
    assert.equal(token, calls === 1 ? 'Bearer old-token' : 'Bearer fresh-token');
    return calls === 1 ? json({ message: 'Expired' }, 401) : json(user);
  }, {
    getIdToken: async force => {
      refreshes.push(force);
      return force ? 'fresh-token' : 'old-token';
    }
  });
  assert.deepEqual(await api.getCurrentUser(), user);
  assert.deepEqual(refreshes, [false, true]);
  assert.equal(calls, 2);
});

test('a repeated 401 ends the request instead of looping or admitting the user', async () => {
  let calls = 0;
  const api = create(async () => {
    calls++;
    return json({ token: 'do-not-expose' }, 401);
  });
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'sessionExpired' && !error.message.includes('do-not-expose')
  );
  assert.equal(calls, 2);
});

test('403 is not retried or treated as a token expiration', async () => {
  let calls = 0;
  const api = create(async () => {
    calls++;
    return json({ message: 'Sensitive account status' }, 403);
  });
  await assert.rejects(api.session(), (error: unknown) => error instanceof AuthError && error.code === 'forbidden');
  assert.equal(calls, 1);
});

test('428 is typed profileRequired even when the backend drops its code and draft metadata', async () => {
  const api = create(async () => json({ message: 'Complete your member profile to continue.' }, 428));
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'profileRequired' && error.status === 428
  );
});

test('profile completion posts only the real contract fields and trims user input', async () => {
  const api = create(async (url, options) => {
    assert.equal(url, 'https://api.example.test/api/auth/complete-profile');
    assert.deepEqual(JSON.parse(String(options?.body)), { name: 'Member', phone: '+959123456789' });
    return json(session, 201);
  });
  assert.deepEqual(await api.completeProfile({ name: ' Member ', phone: ' +959123456789 ' }), session);
});

test(
  'concurrent profile 409 resolves the existing canonical session without repeating account creation',
  async () => {
    const urls: string[] = [];
    const api = create(async url => {
      urls.push(String(url));
      return urls.length === 1 ? json({ message: 'Unique constraint' }, 409) : json(session);
    });
    assert.deepEqual(await api.completeProfile({ name: 'Member', phone: '+959123456789' }), session);
    assert.deepEqual(
      urls,
      [
        'https://api.example.test/api/auth/complete-profile',
        'https://api.example.test/api/auth/session'
      ]
    );
  }
);

test('profile conflict never fabricates success when subsequent session resolution fails', async () => {
  let calls = 0;
  const api = create(async () => json({}, ++calls === 1 ? 409 : 428));
  await assert.rejects(
    api.completeProfile({ name: 'Member', phone: '+959123456789' }),
    (error: unknown) => error instanceof AuthError && error.code === 'profileRequired'
  );
  assert.equal(calls, 2);
});

test('canonical user restoration rejects malformed success responses', async () => {
  const api = create(async () => json({ success: true, user: { ...user, role: 'fake-admin' } }));
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'invalidResponse'
  );
});

test('non-JSON success is reported safely instead of granting a session', async () => {
  const api = create(async () => new Response('SECRET PROXY DIAGNOSTIC', { status: 200 }));
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'invalidResponse' && !error.message.includes('SECRET')
  );
});

test('rate limiting retains Retry-After and hides backend diagnostics', async () => {
  const api = create(async () => json({ message: 'internal secret / phone / token' }, 429, { 'Retry-After': '120' }));
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'rateLimited' && error.retryAfterSeconds === 120 && !error.message.includes('internal')
  );
});

test('failed network requests are sanitized and not automatically replayed', async () => {
  let calls = 0;
  const api = create(async () => {
    calls++;
    throw new TypeError('secret-token-url connection refused');
  });
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'network' && !error.message.includes('secret-token-url')
  );
  assert.equal(calls, 1);
});

test('timeout aborts the underlying request and reports a retryable failure', async () => {
  let aborted = false;
  const api = create(async (_url, options) => new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('aborted'));
    }, { once: true });
  }), { timeoutMs: 10 });
  await assert.rejects(api.session(), (error: unknown) => error instanceof AuthError && error.code === 'timeout');
  assert.equal(aborted, true);
});

test('caller cancellation aborts requests for abandoned screens', async () => {
  const controller = new AbortController();
  const api = create(async (_url, options) => new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    controller.abort();
  }));
  await assert.rejects(
    api.session({ signal: controller.signal }),
    (error: unknown) => error instanceof AuthError && error.code === 'cancelled'
  );
});

test('a request cancelled before starting does not obtain credentials or contact the API', async () => {
  const controller = new AbortController();
  controller.abort();
  const api = create(
    async () => { throw new Error('must not fetch'); },
    { getIdToken: async () => { throw new Error('must not get token'); } }
  );
  await assert.rejects(
    api.getCurrentUser({ signal: controller.signal }),
    (error: unknown) => error instanceof AuthError && error.code === 'cancelled'
  );
});

test('missing API configuration fails explicitly before contacting a fabricated endpoint', async () => {
  const api = create(async () => { throw new Error('must not fetch'); }, { baseUrl: '' });
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'configuration'
  );
});

test('URLs containing credentials are rejected', async () => {
  const api = create(async () => json(session), { baseUrl: 'https://username:password@api.example.test/api' });
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'configuration' && !error.message.includes('password')
  );
});

test('production API requests require HTTPS before sending identity tokens', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const api = create(async () => { throw new Error('must not fetch over HTTP'); }, { baseUrl: 'http://localhost:8000/api' });
    await assert.rejects(
      api.session(),
      (error: unknown) => error instanceof AuthError && error.code === 'configuration'
    );
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else process.env.NODE_ENV = previous;
  }
});

test('an absent Firebase token cannot establish an anonymous application session', async () => {
  const api = create(async () => { throw new Error('must not fetch'); }, { getIdToken: async () => '' });
  await assert.rejects(
    api.session(),
    (error: unknown) => error instanceof AuthError && error.code === 'sessionExpired'
  );
});

test('member dashboard uses the actual member endpoint and shape', async () => {
  const api = create(async (url, options) => {
    assert.equal(url, 'https://api.example.test/api/member/dashboard?referenceDate=2026-10-10');
    assert.equal(options?.method, 'GET');
    assert.equal(options?.body, undefined);
    return json(dashboard);
  });
  assert.deepEqual(await api.getMemberDashboard('2026-10-10'), dashboard);
});

test('member dashboard refuses a staff dashboard or malformed payload', async () => {
  const api = create(async () => json({ members: 123, bookingsToday: 8 }));
  await assert.rejects(
    api.getMemberDashboard(),
    (error: unknown) => error instanceof AuthError && error.code === 'invalidResponse'
  );
});

test('dashboard query cannot inject parameters into the request', async () => {
  const api = create(async () => { throw new Error('must not fetch'); });
  await assert.rejects(
    api.getMemberDashboard('2026-10-10&role=admin'),
    (error: unknown) => error instanceof AuthError && error.code === 'invalidInput'
  );
});

test('profile and avatar updates call their existing protected endpoints', async () => {
  const calls: { url: string; method?: string; body: unknown }[] = [];
  const api = create(async (url, options) => {
    calls.push({ url: String(url), method: options?.method, body: JSON.parse(String(options?.body)) });
    return String(url).endsWith('/avatar') ? json({ avatar: '/uploads/profiles/avatar.png' }) : json({ ...user, name: 'Updated' });
  });
  assert.equal((await api.updateProfile({ name: 'Updated', phone: null })).name, 'Updated');
  assert.deepEqual(
    await api.uploadAvatar('data:image/png;base64,test'),
    { avatar: '/uploads/profiles/avatar.png' }
  );
  assert.deepEqual(calls, [
    {
      url: 'https://api.example.test/api/profile',
      method: 'PATCH',
      body: { name: 'Updated', phone: null }
    },
    {
      url: 'https://api.example.test/api/profile/avatar',
      method: 'POST',
      body: { image: 'data:image/png;base64,test' }
    },
  ]);
});

test('provider credential errors do not distinguish unknown accounts from incorrect passwords', () => {
  for (const code of ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential']) {
    const error = sanitizeAuthError({ code, message: 'secret credentials' });
    assert.equal(error.code, 'invalidCredentials');
    assert.equal(error.message, 'The sign-in details are incorrect. Try again or reset your password.');
  }
});

test(
  'invalid and expired verifications remain distinct recovery states without leaking provider messages',
  () => {
    assert.equal(
      sanitizeAuthError({ code: 'auth/invalid-verification-code', message: 'secret OTP' }).code,
      'invalidVerification'
    );
    assert.equal(sanitizeAuthError({ code: 'auth/code-expired' }).code, 'expiredVerification');
    assert.equal(sanitizeAuthError({ code: 'auth/email-already-in-use' }).code, 'accountExists');
    assert.equal(sanitizeAuthError({ code: 'auth/network-request-failed' }).code, 'network');
    assert.equal(sanitizeAuthError({ message: 'internal secret' }).code, 'unavailable');
  }
);
