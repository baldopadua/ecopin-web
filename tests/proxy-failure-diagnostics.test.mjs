import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { registerHooks } from 'node:module';

const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true };
  return next(specifier, context);
} });
const route = await import('../app/api/session/[[...action]]/route.js');
const proxy = await import('../app/api/backend/[...path]/route.js');
const { webFailure } = await import('../lib/server/session-http.mjs');
const { reportDiagnostic } = await import('../lib/diagnostics.mjs');
hooks.deregister();

const envKeys = ['SESSION_REDIS_REST_URL', 'SESSION_REDIS_REST_TOKEN', 'SESSION_ENCRYPTION_KEY', 'FRONTEND_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'BACKEND_API_URL'];
const saved = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
Object.assign(process.env, {
  SESSION_REDIS_REST_URL: 'https://sessions.example.invalid', SESSION_REDIS_REST_TOKEN: 'synthetic-session-store',
  SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 12).toString('base64url'), FRONTEND_URL: 'https://web.example.invalid',
  UPSTASH_REDIS_REST_URL: 'https://quota.example.invalid', UPSTASH_REDIS_REST_TOKEN: 'synthetic-quota-store', BACKEND_API_URL: 'https://backend.example.invalid',
});
after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

// `upstream` decides what the synthetic backend answers for the staff report path; everything else is session plumbing.
function fakeServices(t, upstream) {
  const sessions = new Map(); const hits = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const target = new URL(String(url));
    const body = JSON.parse(options.body instanceof Uint8Array ? new TextDecoder().decode(options.body) : options.body || 'null');
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
      if (target.pathname === '/api/auth/login') return Response.json({ token: 'synthetic-access-token', session: { refresh_token: 'synthetic-refresh-token' } });
      if (target.pathname === '/api/auth/me') return Response.json({ user: { id: 'user-1', role: 'officer', email: 'person@example.invalid' } });
      if (target.pathname === '/api/admin/timeout') return Response.json({ session_timeout_minutes: 15 });
      if (target.pathname === '/api/sweeper/operations-summary') { hits.push(options); return upstream(options); }
      return Response.json({ error: 'unexpected request' }, { status: 404 });
    }
    throw new Error('Unexpected synthetic service URL');
  });
  return { hits };
}
async function signIn() {
  const login = await route.POST(new Request('https://web.example.invalid/api/session/login', { method: 'POST',
    headers: { Origin: 'https://web.example.invalid', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'person@example.invalid', password: 'synthetic-password' }) }), { params: Promise.resolve({ action: ['login'] }) });
  return login.headers.get('set-cookie').split(';', 1)[0];
}
const staffGet = (cookie, signal) => proxy.GET(new Request('https://web.example.invalid/api/backend/api/sweeper/operations-summary?from=2026-11-01', { headers: { Cookie: cookie }, ...(signal ? { signal } : {}) }));
function captureLogs(t) {
  const lines = [];
  t.mock.method(console, 'error', (...args) => lines.push(args));
  t.mock.method(console, 'warn', (...args) => lines.push(args));
  return lines;
}
const json = async response => response.json();

test('a backend that answers with a missing-route code is reported as a missing feature, not a missing record', async t => {
  const logs = captureLogs(t);
  fakeServices(t, () => Response.json({ error: 'Route not found', code: 'route_not_found' }, { status: 404 }));
  const response = await staffGet(await signIn());
  assert.equal(response.status, 404);
  assert.deepEqual(await json(response), { error: 'This feature is not available on the server yet.', code: 'route_not_found', retryable: false });
  assert.ok(logs.some(([record]) => record?.category === 'route_not_found' && record.status === 404 && record.area === 'analytics'));
});

test('an ordinary not-found keeps its plain answer without a category', async t => {
  fakeServices(t, () => Response.json({ error: 'nothing here' }, { status: 404 }));
  const response = await staffGet(await signIn());
  assert.equal(response.status, 404);
  assert.deepEqual(await json(response), { error: 'Not found' });
});

test('denied access is distinct from outages and is not retryable', async t => {
  const logs = captureLogs(t);
  fakeServices(t, () => Response.json({ error: 'Access denied.', code: 'denied', retryable: false }, { status: 403 }));
  const response = await staffGet(await signIn());
  assert.equal(response.status, 403);
  assert.deepEqual(await json(response), { error: 'Access denied', code: 'denied', retryable: false });
  assert.ok(logs.some(([record]) => record?.category === 'denied' && record.status === 403));
});

test('a backend that never sent a code but denied access is still reported as denied', async t => {
  fakeServices(t, () => new Response('forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } }));
  assert.equal((await json(await staffGet(await signIn()))).code, 'denied');
});

test('a backend timeout answer reaches the user as a retryable 504, not a gateway failure', async t => {
  fakeServices(t, () => Response.json({ error: 'The request took too long. Please retry.', code: 'timeout', retryable: true }, { status: 504 }));
  const response = await staffGet(await signIn());
  assert.equal(response.status, 504);
  assert.deepEqual({ ...(await json(response)), eventId: undefined }, { error: 'Request timed out', code: 'timeout', retryable: true, eventId: undefined });
});

test('a missing migration is not retryable and says the feature is not ready', async t => {
  fakeServices(t, () => Response.json({ error: 'secret schema text', code: 'missing_prerequisite', retryable: false }, { status: 503 }));
  const response = await staffGet(await signIn());
  const body = await json(response);
  assert.equal(response.status, 503);
  assert.equal(body.code, 'missing_prerequisite');assert.equal(body.retryable, false);assert.equal(body.error, 'This feature is not ready on the server.');
  assert.ok(!JSON.stringify(body).includes('secret schema text'));
});

test('unavailable stored files are labelled and retryable', async t => {
  fakeServices(t, () => Response.json({ message: 'Request failed', code: 'storage_unavailable' }, { status: 404 }));
  const response = await staffGet(await signIn());
  assert.equal(response.status, 404);
  assert.deepEqual(await json(response), { error: 'Stored files are temporarily unavailable. Please retry.', code: 'storage_unavailable', retryable: true });
});

test('unknown or hostile codes and upstream detail are never forwarded', async t => {
  const logs = captureLogs(t);
  fakeServices(t, () => Response.json({ error: 'database password=hunter2', code: 'SELECT * FROM profiles', stack: 'secret stack' }, { status: 500 }));
  const response = await staffGet(await signIn());
  const text = JSON.stringify(await json(response));
  assert.equal(response.status, 502);
  for (const secret of ['hunter2', 'SELECT', 'secret stack']) assert.ok(!text.includes(secret));
  assert.ok(!JSON.stringify(logs).includes('hunter2'));assert.ok(!JSON.stringify(logs).includes('SELECT'));
});

test('the proxy deadline turns a stalled upstream into a retryable 504 and keeps the request bounded', async t => {
  const deadlines = [];
  const real = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, 'timeout', ms => { deadlines.push(ms); return real(ms >= 10000 ? 20 : ms); });
  const logs = captureLogs(t);
  fakeServices(t, options => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason))));
  const response = await staffGet(await signIn());
  assert.equal(response.status, 504);
  const body = await json(response);
  assert.equal(body.code, 'timeout');assert.equal(body.retryable, true);assert.equal(body.error, 'Request timed out');assert.ok(body.eventId);
  assert.ok(deadlines.includes(10000));
  assert.ok(logs.some(([record]) => record?.category === 'timeout' && record.status === 504 && record.area === 'analytics'));
});

test('an upstream connection failure is an unavailable 503 with a record, not a timeout', async t => {
  const logs = captureLogs(t);
  fakeServices(t, () => { throw new TypeError('fetch failed: connect ECONNREFUSED 10.0.0.1'); });
  const response = await staffGet(await signIn());
  assert.equal(response.status, 503);
  assert.equal((await json(response)).code, 'unavailable');
  assert.ok(!JSON.stringify(logs).includes('10.0.0.1'));
});

test('a client that goes away mid-request gets no error record or error body', async t => {
  const logs = captureLogs(t);
  const controller = new AbortController();
  fakeServices(t, options => new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => reject(options.signal.reason)); controller.abort(); }));
  const response = await staffGet(await signIn(), controller.signal);
  assert.equal(response.status, 499);
  assert.equal(await response.text(), '');
  assert.equal(logs.filter(([record]) => record?.event === 'web_operation_failed').length, 0);
});

test('webFailure and diagnostics only accept allowlisted categories', () => {
  const body = response => response.json();
  return (async () => {
    assert.deepEqual(await body(webFailure(404, { category: 'not-a-category' })), { error: 'Not found' });
    assert.equal(reportDiagnostic('warn', 'analytics', 500, { category: 'timeout' }) !== undefined, true);
  })();
});
