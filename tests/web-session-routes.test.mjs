import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { registerHooks } from 'node:module';

const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true };
  return next(specifier, context);
} });
const route = await import('../app/api/session/[[...action]]/route.js');
const proxy = await import('../app/api/backend/[...path]/route.js');
hooks.deregister();

const envKeys = ['SESSION_REDIS_REST_URL', 'SESSION_REDIS_REST_TOKEN', 'SESSION_ENCRYPTION_KEY', 'FRONTEND_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'BACKEND_API_URL'];
const saved = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
Object.assign(process.env, {
  SESSION_REDIS_REST_URL: 'https://sessions.example.invalid',
  SESSION_REDIS_REST_TOKEN: 'synthetic-session-store',
  SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString('base64url'),
  FRONTEND_URL: 'https://web.example.invalid',
  UPSTASH_REDIS_REST_URL: 'https://quota.example.invalid',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-quota-store',
  BACKEND_API_URL: 'https://backend.example.invalid',
});
after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

function fakeServices(t, { loginFailure = false, temporary = false } = {}) {
  const sessions = new Map();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const target = new URL(String(url));
    const body = JSON.parse(options.body instanceof Uint8Array ? new TextDecoder().decode(options.body) : options.body || 'null');
    calls.push({ target: target.href, options, body });
    if (target.hostname === 'quota.example.invalid') return Response.json({ result: [1, 0] });
    if (target.hostname === 'sessions.example.invalid') {
      let result;
      if (body[0] === 'SET') { result = sessions.has(body[1]) ? null : 'OK'; if (result) sessions.set(body[1], body[2]); }
      if (body[0] === 'GET') result = sessions.get(body[1]) ?? null;
      if (body[0] === 'DEL') result = Number(sessions.delete(body[1]));
      if (body[0] === 'EVAL') { result = Number(sessions.get(body[3]) === body[4]); if (result) sessions.set(body[3], body[5]); }
      return Response.json({ result });
    }
    if (target.hostname === 'backend.example.invalid') {
      if (target.pathname === '/api/cleanup-tasks/custom') return Response.json({ message: 'synthetic private backend detail', status: 'conflict', reason: 'stale_or_blocked_report' }, { status: 409 });
      if (target.pathname === '/api/optimization/blocks') return Response.json([]);
      if (target.pathname === '/api/auth/login') {
        if (loginFailure) return Response.json({ error: 'synthetic upstream secret detail', stack: 'synthetic stack' }, { status: 500 });
        return Response.json({ token: 'synthetic-access-token', session: { refresh_token: 'synthetic-refresh-token' }, requirePasswordChange: temporary });
      }
      if (target.pathname === '/api/auth/me') return Response.json({ user: { id: 'user-1', role: 'officer', email: 'person@example.invalid' } });
      if (target.pathname === '/api/admin/timeout') return Response.json({ session_timeout_minutes: 15 });
      if (target.pathname === '/api/auth/logout') return Response.json({ success: true });
      return Response.json({ error: 'unexpected request' }, { status: 404 });
    }
    throw new Error('Unexpected synthetic service URL');
  });
  return { sessions, calls };
}

const loginRequest = (body, origin = 'https://web.example.invalid') => new Request('https://web.example.invalid/api/session/login', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const context = action => ({ params: Promise.resolve({ action }) });

test('dispatch conflicts remain 409 with safe refresh guidance, not a gateway failure', async t => {
  fakeServices(t);
  const login = await route.POST(loginRequest({ email: 'person@example.invalid', password: 'synthetic-password' }), context(['login']));
  const cookie = login.headers.get('set-cookie').split(';', 1)[0];
  const response = await proxy.POST(new Request('https://web.example.invalid/api/backend/api/cleanup-tasks/custom', {
    method: 'POST', headers: { Cookie: cookie, Origin: 'https://web.example.invalid', 'Content-Type': 'application/json' }, body: JSON.stringify({ report_ids: ['report-1'] }),
  }));
  assert.equal(response.status, 409);
  const text = await response.text();
  assert.match(text, /refresh/i);
  assert.doesNotMatch(text, /synthetic private backend detail|stale_or_blocked_report/);
});

test('dispatch block lookup reaches the authenticated backend', async t => {
  const { calls } = fakeServices(t);
  const login = await route.POST(loginRequest({ email: 'person@example.invalid', password: 'synthetic-password' }), context(['login']));
  const cookie = login.headers.get('set-cookie').split(';', 1)[0];
  const response = await proxy.GET(new Request('https://web.example.invalid/api/backend/api/optimization/blocks', { headers: { Cookie: cookie } }));
  assert.equal(response.status, 200);
  assert.ok(calls.some(call => call.target.endsWith('/api/optimization/blocks') && call.options.headers.Authorization === 'Bearer synthetic-access-token'));
});

test('login returns only public session metadata, never backend tokens', async t => {
  const { calls } = fakeServices(t);
  const response = await route.POST(loginRequest({ email: 'person@example.invalid', password: 'synthetic-password' }), context(['login']));
  const text = await response.text();
  assert.equal(response.status, 200, `${text}; ${JSON.stringify(calls.map(call => [call.target, call.body]))}`);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /Secure/);
  assert.doesNotMatch(text, /synthetic-(?:access|refresh)-token|token|password/i);
  const metadata = JSON.parse(text);
  assert.equal(metadata.user.id, 'user-1');
  const lifetime = 30 * 24 * 60 * 60;
  assert.ok(Math.abs(metadata.expiresAt - Date.now() - lifetime * 1000) < 1000);
  assert.match(response.headers.get('set-cookie'), /Max-Age=2591999|Max-Age=2592000/);
  assert.equal(calls.some(call => call.target.endsWith('/api/admin/timeout')), false);
  assert.ok(calls.some(call => call.target.endsWith('/api/auth/me')));
});

test('untrusted origin is rejected before any quota, store, or upstream request', async t => {
  const { calls } = fakeServices(t);
  const response = await route.POST(loginRequest({ email: 'person@example.invalid', password: 'synthetic-password' }, 'https://evil.example.invalid'), context(['login']));
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});

test('temporary session cannot address an arbitrary backend path', async t => {
  const { calls } = fakeServices(t, { temporary: true });
  const login = await route.POST(loginRequest({ email: 'person@example.invalid', password: 'synthetic-password' }), context(['login']));
  const cookie = login.headers.get('set-cookie').split(';', 1)[0];
  calls.length = 0;
  const response = await route.GET(new Request('https://web.example.invalid/api/session/api/auth/me', { headers: { Cookie: cookie } }), context(['api', 'auth', 'me']));
  assert.equal(response.status, 404);
  assert.equal(calls.some(call => call.target.startsWith('https://backend.example.invalid/')), false);
});

test('upstream failures produce only generic errors', async t => {
  const { calls } = fakeServices(t, { loginFailure: true });
  const response = await route.POST(loginRequest({ email: 'person@example.invalid', password: 'synthetic-password' }), context(['login']));
  const text = await response.text();
  assert.equal(response.status, 503);
  assert.match(text, /Service temporarily unavailable/);
  assert.doesNotMatch(text, /synthetic upstream secret detail|synthetic stack/);
  assert.equal(calls.filter(call => call.target.startsWith('https://backend.example.invalid/')).length, 1);
});

test('logout revokes the opaque store record and clears its cookie', async t => {
  const { sessions, calls } = fakeServices(t);
  const login = await route.POST(loginRequest({ email: 'person@example.invalid', password: 'synthetic-password' }), context(['login']));
  const cookie = login.headers.get('set-cookie').split(';', 1)[0];
  const response = await route.POST(new Request('https://web.example.invalid/api/session/logout', { method: 'POST', headers: { Origin: 'https://web.example.invalid', Cookie: cookie } }), context(['logout']));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal([...sessions.values()].length, 0);
  assert.ok(calls.some(call => call.target.endsWith('/api/auth/logout')));
});
