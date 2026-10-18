import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { registerHooks } from 'node:module';

const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true };
  return next(specifier, context);
} });
const store = await import('../lib/server/web-session.mjs');
hooks.deregister();
const saved = Object.fromEntries(['SESSION_REDIS_REST_URL', 'SESSION_REDIS_REST_TOKEN', 'SESSION_ENCRYPTION_KEY', 'FRONTEND_URL'].map(key => [key, process.env[key]]));
Object.assign(process.env, { SESSION_REDIS_REST_URL: 'https://sessions.example.invalid', SESSION_REDIS_REST_TOKEN: 'synthetic-store-secret', SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64url'), FRONTEND_URL: 'https://web.example.invalid' });
after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

function redis(t) {
  const records = new Map(), commands = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), 'https://sessions.example.invalid/');
    assert.equal(options.redirect, 'error');
    const command = JSON.parse(options.body); commands.push(command);
    let result;
    if (command[0] === 'SET') { result = records.has(command[1]) ? null : 'OK'; if (result) records.set(command[1], command[2]); }
    if (command[0] === 'GET') result = records.get(command[1]) ?? null;
    if (command[0] === 'DEL') result = Number(records.delete(command[1]));
    if (command[0] === 'EVAL') { result = Number(records.get(command[3]) === command[4]); if (result) records.set(command[3], command[5]); }
    return Response.json({ result });
  });
  return { records, commands };
}
const request = id => new Request('https://web.example.invalid/api/session', { headers: id ? { Cookie: `${store.SESSION_COOKIE}=${id}` } : {} });

test('sessions use opaque cookies and encrypted server-side credentials', async t => {
  const { records, commands } = redis(t);
  const session = await store.issueWebSession({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', kind: 'full' });
  assert.match(session.id, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify([...records]).includes('synthetic-access'), false);
  assert.equal(JSON.stringify([...records]).includes('synthetic-refresh'), false);
  const cookie = store.sessionCookie(session.id, session.expiresAt);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(flag));
  assert.equal(cookie.includes('Domain='), false);
  assert.equal(cookie.includes('synthetic-access'), false);
  assert.equal((await store.readWebSession(request(session.id))).accessToken, 'synthetic-access');
  assert.ok(commands[0].includes('EX') && commands[0].includes('NX'));
});

test('missing, malformed and duplicate session cookies cannot select a session', async t => {
  const { commands } = redis(t);
  assert.equal(await store.readWebSession(request()), null);
  assert.equal(await store.readWebSession(request('../bad')), null);
  const req = new Request('https://web.example.invalid', { headers: { Cookie: `${store.SESSION_COOKIE}=${'a'.repeat(43)}; ${store.SESSION_COOKIE}=${'b'.repeat(43)}` } });
  assert.equal(await store.readWebSession(req), null);
  assert.equal(commands.length, 0);
});

test('a full session expires exactly 30 days after sign-in, even after reads and token refresh', async t => {
  const { commands } = redis(t);
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const session = await store.issueWebSession({ accessToken: 'synthetic-old', kind: 'full' });
  assert.equal(session.expiresAt, now + 30 * 24 * 60 * 60 * 1000);
  assert.equal(commands[0][4], 30 * 24 * 60 * 60);
  now += 29 * 24 * 60 * 60 * 1000;
  const current = await store.readWebSession(request(session.id));
  assert.equal(current.expiresAt, session.expiresAt);
  const refreshed = await store.rotateWebSession(current, { accessToken: 'synthetic-new' });
  assert.equal(refreshed.expiresAt, session.expiresAt);
  now = session.expiresAt - 1;
  assert.ok(await store.readWebSession(request(session.id)));
  now++;
  assert.equal(await store.readWebSession(request(session.id)), null);
  assert.equal(await store.rotateWebSession(refreshed, { accessToken: 'synthetic-too-late' }), null);
});

test('logout prevents delayed refresh from recreating the revoked session', async t => {
  redis(t);
  const session = await store.issueWebSession({ accessToken: 'synthetic-old', kind: 'full' });
  const pending = await store.readWebSession(request(session.id));
  await store.revokeWebSession(session);
  assert.equal(await store.rotateWebSession(pending, { accessToken: 'synthetic-new' }), null);
  assert.equal(await store.readWebSession(request(session.id)), null);
});

test('concurrent refreshes cannot overwrite a newer credential version', async t => {
  redis(t);
  const session = await store.issueWebSession({ accessToken: 'synthetic-old', kind: 'full' });
  const first = await store.readWebSession(request(session.id));
  const second = await store.readWebSession(request(session.id));
  assert.ok(await store.rotateWebSession(first, { accessToken: 'synthetic-first' }));
  assert.equal(await store.rotateWebSession(second, { accessToken: 'synthetic-second' }), null);
  assert.equal((await store.readWebSession(request(session.id))).accessToken, 'synthetic-first');
});

test('mutations require the exact configured origin', () => {
  for (const origin of [undefined, 'null', 'https://evil.example.invalid', 'https://web.example.invalid.evil']) {
    const req = new Request('https://web.example.invalid/api/session/logout', { method: 'POST', headers: origin ? { Origin: origin } : {} });
    assert.equal(store.hasTrustedOrigin(req), false);
  }
  assert.equal(store.hasTrustedOrigin(new Request('https://web.example.invalid/api/session/logout', { method: 'POST', headers: { Origin: 'https://web.example.invalid' } })), true);
});

test('missing store configuration never falls back to browser credentials', async t => {
  redis(t);
  const token = process.env.SESSION_REDIS_REST_TOKEN;
  delete process.env.SESSION_REDIS_REST_TOKEN;
  try { await assert.rejects(store.issueWebSession({ accessToken: 'synthetic-access', kind: 'full' }), /Session unavailable/); }
  finally { process.env.SESSION_REDIS_REST_TOKEN = token; }
});
