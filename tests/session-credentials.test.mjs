import assert from 'node:assert/strict';
import test, { after } from 'node:test';

function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
  };
}
const previous = Object.fromEntries(['window', 'localStorage', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
globalThis.window = new EventTarget();
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
window.localStorage = localStorage;
window.sessionStorage = sessionStorage;
after(() => {
  for (const [key, descriptor] of Object.entries(previous)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});

const credentials = await import('../lib/auth-token.mjs');
const api = await import('../lib/api/auth.js');

test('legacy credentials in browser storage are purged on startup and on metadata updates', () => {
  for (const store of [localStorage, sessionStorage]) {
    for (const key of ['authToken', 'tempAuthToken', 'refreshToken']) {
      store.setItem(key, 'stale-token');
    }
  }
  credentials.setSessionMetadata(null);
  for (const store of [localStorage, sessionStorage]) {
    for (const key of ['authToken', 'tempAuthToken', 'refreshToken']) {
      assert.equal(store.getItem(key), null);
    }
  }
});

test('a new document discards legacy credentials rather than restoring them', async () => {
  for (const store of [localStorage, sessionStorage]) {
    store.setItem('authToken', 'synthetic-old-access');
    store.setItem('tempAuthToken', 'synthetic-old-temporary');
    store.setItem('refreshToken', 'synthetic-old-refresh');
  }
  const fresh = await import('../lib/auth-token.mjs?fresh-session-test');
  assert.equal(fresh.getSessionMetadata(), null);
  assert.equal(fresh.readSessionKey(), null);
  for (const store of [localStorage, sessionStorage]) {
    assert.equal(store.getItem('authToken'), null);
    assert.equal(store.getItem('tempAuthToken'), null);
    assert.equal(store.getItem('refreshToken'), null);
  }
});

test('metadata validation: invalid state, malformed sessionTag, non-finite expiresAt fail closed to null', () => {
  const validTag = 'A'.repeat(22);
  const future = Date.now() + 3600000;

  // Invalid state
  credentials.setSessionMetadata({ state: 'invalid', sessionTag: validTag, expiresAt: future });
  assert.equal(credentials.getSessionMetadata(), null);

  // Invalid tag length / chars
  credentials.setSessionMetadata({ state: 'full', sessionTag: 'too-short', expiresAt: future });
  assert.equal(credentials.getSessionMetadata(), null);
  credentials.setSessionMetadata({ state: 'full', sessionTag: '!'.repeat(22), expiresAt: future });
  assert.equal(credentials.getSessionMetadata(), null);

  // Non-finite expiresAt
  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: Infinity });
  assert.equal(credentials.getSessionMetadata(), null);
  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: 'not-a-number' });
  assert.equal(credentials.getSessionMetadata(), null);

  // Valid full metadata
  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: future });
  assert.deepEqual(credentials.getSessionMetadata(), { state: 'full', sessionTag: validTag, expiresAt: future, user: null });
  credentials.clearSessionMetadata();
});

test('user metadata allowlists only safe profile attributes and strips unexpected fields', () => {
  const validTag = 'B'.repeat(22);
  const future = Date.now() + 3600000;
  const rawUser = {
    id: 'user-123',
    role: 'officer',
    full_name: 'Officer Jane',
    email: 'jane@example.gov',
    avatar_url: 'https://example.gov/avatar.png',
    barangay_id: 42,
    lgu_id: 10,
    secret_token: 'secret-do-not-leak',
    password_hash: 'hashed',
    nested: { evil: true }
  };

  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: future, user: rawUser });
  const meta = credentials.getSessionMetadata();
  assert.ok(meta);
  assert.equal(meta.user.id, 'user-123');
  assert.equal(meta.user.role, 'officer');
  assert.equal(meta.user.full_name, 'Officer Jane');
  assert.equal(meta.user.email, 'jane@example.gov');
  assert.equal(meta.user.avatar_url, 'https://example.gov/avatar.png');
  assert.equal(meta.user.barangay_id, 42);
  assert.equal(meta.user.lgu_id, 10);
  assert.equal(meta.user.secret_token, undefined);
  assert.equal(meta.user.password_hash, undefined);
  assert.equal(meta.user.nested, undefined);
  credentials.clearSessionMetadata();
});

test('readSessionKey returns sessionTag only for full sessions, and null for temporary or empty sessions', () => {
  const validTag = 'C'.repeat(22);
  const future = Date.now() + 3600000;

  credentials.setSessionMetadata({ state: 'temporary', sessionTag: validTag, expiresAt: future });
  assert.equal(credentials.readSessionKey(), null);

  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: future });
  assert.equal(credentials.readSessionKey(), validTag);

  credentials.clearSessionMetadata();
  assert.equal(credentials.readSessionKey(), null);
});

test('setSessionMetadata and clearSessionMetadata notify session subscribers', () => {
  let notifications = 0;
  const unsubscribe = credentials.subscribeSession(() => notifications++);
  const validTag = 'D'.repeat(22);

  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: Date.now() + 3600000 });
  assert.equal(notifications, 1);

  credentials.clearSessionMetadata();
  assert.equal(notifications, 2);

  unsubscribe();
  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: Date.now() + 3600000 });
  assert.equal(notifications, 2);
  credentials.clearSessionMetadata();
});

test('triggerSessionExpired dispatches window session-expired event', () => {
  let expired = 0;
  const listener = () => expired++;
  window.addEventListener('session-expired', listener);
  credentials.triggerSessionExpired();
  assert.equal(expired, 1);
  window.removeEventListener('session-expired', listener);
});

test('loadSessionMetadata queries /api/session with same-origin credentials and updates metadata', async t => {
  const calls = [];
  const validTag = 'E'.repeat(22);
  const future = Date.now() + 3600000;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ state: 'full', sessionTag: validTag, expiresAt: future, user: { id: 'u1', role: 'admin' } });
  });

  const data = await credentials.loadSessionMetadata();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/session');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(data.state, 'full');
  assert.equal(data.sessionTag, validTag);
  assert.equal(credentials.readSessionKey(), validTag);
  credentials.clearSessionMetadata();
});

test('stale loadSessionMetadata response cannot overwrite newer session state', async t => {
  const validTag1 = '1'.repeat(22);
  const validTag2 = '2'.repeat(22);
  const future = Date.now() + 3600000;

  let resolveFetch;
  t.mock.method(globalThis, 'fetch', async () => {
    return new Promise(resolve => {
      resolveFetch = () => resolve(Response.json({ state: 'full', sessionTag: validTag1, expiresAt: future }));
    });
  });

  const pending = credentials.loadSessionMetadata();
  // While fetch is pending, a newer login occurs
  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag2, expiresAt: future });
  assert.equal(credentials.readSessionKey(), validTag2);

  // Now older fetch completes
  resolveFetch();
  await pending;

  // Stale fetch result must NOT overwrite the newer session
  assert.equal(credentials.readSessionKey(), validTag2);
  credentials.clearSessionMetadata();
});

test('temporary session-check failures preserve an unexpired session without extending it', async t => {
  const session = { state: 'full', sessionTag: 'L'.repeat(22), expiresAt: Date.now() + 3600000 };
  credentials.setSessionMetadata(session);
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  assert.equal((await credentials.loadSessionMetadata()).expiresAt, session.expiresAt);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Offline'); });
  assert.equal((await credentials.loadSessionMetadata()).sessionTag, session.sessionTag);
  credentials.clearSessionMetadata();
});

test('session checks still clear expired or explicitly rejected sessions', async t => {
  for (const status of [401, 403]) {
    credentials.setSessionMetadata({ state: 'full', sessionTag: 'M'.repeat(22), expiresAt: Date.now() + 3600000 });
    t.mock.method(globalThis, 'fetch', async () => new Response(null, { status }));
    assert.equal(await credentials.loadSessionMetadata(), null);
  }
  credentials.setSessionMetadata({ state: 'full', sessionTag: 'M'.repeat(22), expiresAt: Date.now() - 1 });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Offline'); });
  assert.equal(await credentials.loadSessionMetadata(), null);
});

test('login issues same-origin POST to /api/session/login and records validated metadata', async t => {
  const calls = [];
  const validTag = 'F'.repeat(22);
  const future = Date.now() + 3600000;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ state: 'full', sessionTag: validTag, expiresAt: future, user: { id: 'officer-1', role: 'officer' } });
  });

  const result = await api.login('officer@pasig.gov', 'correct-password');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/session/login');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(JSON.parse(calls[0].options.body).email, 'officer@pasig.gov');
  assert.equal(credentials.readSessionKey(), validTag);
  assert.equal(result.sessionTag, validTag);
  credentials.clearSessionMetadata();
});

test('logout clears metadata before and after calling /api/session/logout', async t => {
  const calls = [];
  const validTag = 'G'.repeat(22);
  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: Date.now() + 3600000 });
  assert.equal(credentials.readSessionKey(), validTag);

  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    // Verify metadata was already cleared before network call
    assert.equal(credentials.readSessionKey(), null);
    return Response.json({ success: true });
  });

  await api.logout();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/session/logout');
  assert.equal(credentials.readSessionKey(), null);
});

test('logout clears metadata even if server request fails', async t => {
  const validTag = 'H'.repeat(22);
  credentials.setSessionMetadata({ state: 'full', sessionTag: validTag, expiresAt: Date.now() + 3600000 });

  t.mock.method(globalThis, 'fetch', async () => {
    return new Response(JSON.stringify({ error: 'Server down' }), { status: 503 });
  });

  await assert.rejects(api.logout(), /Server down/);
  assert.equal(credentials.readSessionKey(), null);
});

test('validateSession returns true only when session state is full', async t => {
  const validTag = 'I'.repeat(22);
  const future = Date.now() + 3600000;

  t.mock.method(globalThis, 'fetch', async () => {
    return Response.json({ state: 'full', sessionTag: validTag, expiresAt: future });
  });
  assert.equal((await api.validateSession()).valid, true);

  t.mock.method(globalThis, 'fetch', async () => {
    return Response.json({ state: 'temporary', sessionTag: validTag, expiresAt: future });
  });
  credentials.clearSessionMetadata();
  assert.equal((await api.validateSession()).valid, false);

  t.mock.method(globalThis, 'fetch', async () => {
    return new Response(null, { status: 401 });
  });
  credentials.clearSessionMetadata();
  assert.equal((await api.validateSession()).valid, false);
});

test('refreshAuthToken updates metadata and returns new sessionTag', async t => {
  const validTag = 'J'.repeat(22);
  const future = Date.now() + 3600000;
  t.mock.method(globalThis, 'fetch', async () => {
    return Response.json({ state: 'full', sessionTag: validTag, expiresAt: future });
  });

  const tag = await api.refreshAuthToken();
  assert.equal(tag, validTag);
  assert.equal(credentials.readSessionKey(), validTag);
  credentials.clearSessionMetadata();
});

test('forceChangePassword calls /api/session/password and clears metadata requiring fresh sign-in', async t => {
  const calls = [];
  const validTag = 'K'.repeat(22);
  credentials.setSessionMetadata({ state: 'temporary', sessionTag: validTag, expiresAt: Date.now() + 300000 });

  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ success: true });
  });

  await api.forceChangePassword('NewSecurePassword123!');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/session/password');
  assert.equal(JSON.parse(calls[0].options.body).new_password, 'NewSecurePassword123!');
  assert.equal(credentials.getSessionMetadata(), null);
  assert.equal(credentials.readSessionKey(), null);
});

test('no credentials ever enter browser localStorage or sessionStorage', () => {
  for (const store of [localStorage, sessionStorage]) {
    assert.equal(store.getItem('authToken'), null);
    assert.equal(store.getItem('tempAuthToken'), null);
    assert.equal(store.getItem('refreshToken'), null);
  }
});
