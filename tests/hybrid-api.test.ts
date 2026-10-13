import assert from "node:assert/strict";
import test from "node:test";
import { createAuthApi } from "../src/auth/api.ts";
import { sessionNavigation } from "../src/auth/navigation-policy.ts";

const session = () => ({
  user: {
    id: "canonical-user",
    name: "Member",
    email: "member@example.test",
    role: "member" as const,
    phone: "+959421234567",
    membership: null,
    avatar: null,
  },
  security: { mfaEnrolled: false, mfaRequired: false },
  accessToken: "a".repeat(43),
  refreshToken: "r".repeat(43),
  accessExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  sessionExpiresAt: new Date(Date.now() + 86400_000).toISOString(),
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("email login sends credentials once to the mobile endpoint without a Firebase bearer", async () => {
  let calls = 0;
  const api = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => {
      throw Error("Business token must not be requested");
    },
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, "http://localhost:8000/api/auth/mobile/email-login");
      assert.equal(new Headers(options?.headers).has("Authorization"), false);
      assert.deepEqual(JSON.parse(options?.body as string), {
        email: "member@example.test",
        password: "Password1!",
        remember: true,
      });
      return json(session());
    },
  });
  const result = await api.emailLogin("member@example.test", "Password1!");
  assert("user" in result);
  assert.equal(result.user.id, "canonical-user");
  assert.equal(calls, 1);
});

test("Google and Apple proofs are explicit and cannot replace the business access token", async () => {
  let access = "application-access";
  const calls: string[] = [];
  const api = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => access,
    fetchImpl: async (url, options) => {
      const headers = new Headers(options?.headers);
      calls.push(String(url));
      if (String(url).endsWith("/mobile/provider-session")) {
        assert.equal(headers.get("Authorization"), "Bearer firebase-proof");
        return json(session());
      }
      assert.equal(headers.get("Authorization"), "Bearer application-access");
      return json(session().user);
    },
  });
  await api.providerLogin("google.com", "firebase-proof");
  await api.providerLogin("apple.com", "firebase-proof");
  await api.getCurrentUser();
  assert.equal(calls.length, 3);
  access = "";
});

test("phone OTP returns only a challenge; password endpoint receives its capability", async () => {
  const api = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => {
      throw Error("No application session");
    },
    fetchImpl: async (url, options) => {
      if (String(url).endsWith("/mobile/challenge"))
        return json({
          challengeToken: "c".repeat(43),
          expiresAt: new Date(Date.now() + 300_000).toISOString(),
          next: "password",
          phone: "+959421234567",
        });
      assert.equal(new Headers(options?.headers).has("Authorization"), false);
      assert.deepEqual(JSON.parse(options?.body as string), {
        challengeToken: "c".repeat(43),
        password: "Password1!",
        remember: true,
      });
      return json(session());
    },
  });
  const proof = await api.phoneChallenge("firebase-phone-token", "signin");
  assert.equal("accessToken" in proof, false);
  const result = await api.phonePassword(proof.challengeToken, "Password1!");
  assert.equal(result.user.id, "canonical-user");
});

test("invalid password is not retried or converted into session restoration", async () => {
  let calls = 0,
    refresh = 0;
  const api = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => "",
    refreshSession: async () => {
      refresh++;
    },
    fetchImpl: async () => {
      calls++;
      return json({ code: "INVALID_CREDENTIALS" }, 401);
    },
  });
  await assert.rejects(api.emailLogin("member@example.test", "wrong"), {
    code: "invalidCredentials",
  });
  assert.equal(calls, 1);
  assert.equal(refresh, 0);
});

test("provider onboarding and phone/password states cannot enter Home", async () => {
  const user = session().user;
  for (const status of [
    "profile-required",
    "password-required",
    "link-required",
    "registration-password-required",
  ] as const) {
    const policy = sessionNavigation({
      status,
      user,
      identity: { uid: "firebase", email: user.email, emailVerified: true },
    });
    assert.equal(policy.member, false);
  }
  assert.equal(
    sessionNavigation({
      status: "authenticated",
      user: { ...user, role: "admin" },
      identity: { uid: "firebase", email: user.email, emailVerified: true },
    }).member,
    false,
  );
});

test("malformed credentials and missing registration fields are rejected before authorization", async () => {
  const api = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => "",
    fetchImpl: async () => json({ ...session(), accessToken: "not-a-session" }),
  });
  await assert.rejects(api.emailLogin("member@example.test", "Password1!"), {
    code: "invalidResponse",
  });
  const broken = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => "",
    fetchImpl: async () =>
      json({
        status: "onboarding",
        registrationToken: "cap",
        profile: { email: "x" },
      }),
  });
  await assert.rejects(broken.providerLogin("apple.com", "proof"), {
    code: "invalidResponse",
  });
});

test("business 401 rotates application credentials, while refresh itself never retries", async () => {
  let token = "old";
  let rotations = 0;
  let calls = 0;
  const api = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => token,
    refreshSession: async () => {
      rotations++;
      token = "new";
    },
    fetchImpl: async (_url, options) => {
      calls++;
      return new Headers(options?.headers).get("Authorization") === "Bearer old"
        ? json({ code: "SESSION_REVOKED" }, 401)
        : json(session().user);
    },
  });
  await api.getCurrentUser();
  assert.equal(rotations, 1);
  assert.equal(calls, 2);
  let refreshCalls = 0;
  const expired = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => "",
    fetchImpl: async () => {
      refreshCalls++;
      return json({ code: "SESSION_REVOKED" }, 401);
    },
  });
  await assert.rejects(expired.refresh("r".repeat(43)), {
    code: "sessionExpired",
  });
  assert.equal(refreshCalls, 1);
});

test("MFA and staff restrictions direct mobile users to web authentication", async () => {
  for (const code of ["MFA_REQUIRED", "MOBILE_ROLE_UNSUPPORTED"]) {
    const api = createAuthApi({
      baseUrl: "http://localhost:8000",
      getIdToken: async () => "",
      fetchImpl: async () => json({ code }, 403),
    });
    await assert.rejects(
      api.emailLogin("member@example.test", "Password1!"),
      (error) => {
        assert.equal((error as Error & { code: string }).code, "forbidden");
        assert.match((error as Error).message, /ZAWANA website/);
        return true;
      },
    );
  }
});

test("account checks use the public backend endpoint without requesting a session", async () => {
  const api = createAuthApi({
    baseUrl: "http://localhost:8000",
    getIdToken: async () => { throw Error("No session should be requested"); },
    fetchImpl: async (url, options) => {
      assert.equal(url, "http://localhost:8000/api/auth/mobile/account-check");
      assert.equal(new Headers(options?.headers).has("Authorization"), false);
      assert.deepEqual(JSON.parse(options?.body as string), { email: "member@example.test", phone: "+959421234567" });
      return json({ emailExists: true, phoneExists: false });
    },
  });
  assert.deepEqual(await api.accountCheck({ email: "member@example.test", phone: "+959421234567" }), { emailExists: true, phoneExists: false });
});

test("account checks reject incomplete server responses instead of assuming availability", async () => {
  const api = createAuthApi({ baseUrl: "http://localhost:8000", getIdToken: async () => "", fetchImpl: async () => json({}) });
  await assert.rejects(api.accountCheck({ phone: "+959421234567" }), { code: "invalidResponse" });
});
