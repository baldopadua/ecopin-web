import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test, { after } from 'node:test';

const originalBackend = process.env.NEXT_PUBLIC_BACKEND_API_URL;
process.env.NEXT_PUBLIC_BACKEND_API_URL = 'http://127.0.0.1:4002';
after(() => {
  if (originalBackend === undefined) delete process.env.NEXT_PUBLIC_BACKEND_API_URL;
  else process.env.NEXT_PUBLIC_BACKEND_API_URL = originalBackend;
});

// Load the real Next handler, replacing only its database boundary.
const databaseModule = 'data:text/javascript,export const supabase = {}';
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase') return { url: databaseModule, shortCircuit: true };
    return nextResolve(specifier === 'next/server' ? 'next/server.js' : specifier, context);
  },
});
const { supabase } = await import(databaseModule);
const { POST } = await import('../app/api/tasks/auto-generate/preview/route.js');
hooks.deregister();

function setup(t, { authorization = 'Bearer synthetic-token', session = { user: { id: 'synthetic-officer', role: 'officer' } }, status = 200, failure } = {}) {
  const calls = { database: [], session: [], solver: [], body: 0 };
  supabase.from = (table) => {
    calls.database.push(table);
    return {
      select() { return this; },
      eq() { return this; },
      async single() { return { data: null }; },
      async range() { return { data: [], error: null }; },
    };
  };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).endsWith('/api/auth/me')) {
      calls.session.push({ url: String(url), options });
      if (failure) throw failure;
      return new Response(typeof session === 'string' ? session : JSON.stringify(session), { status });
    }
    calls.solver.push({ url, options });
    return Response.json({ tasks: [] });
  });
  const request = {
    headers: new Headers(authorization === null ? {} : { Authorization: authorization }),
    async json() {
      calls.body++;
      return { config: {}, user: { role: 'officer' }, role: 'officer' };
    },
  };
  return { calls, request };
}

function assertNoPreviewWork(calls) {
  assert.deepEqual(calls.database, [], 'denial must precede database access');
  assert.deepEqual(calls.solver, [], 'denial must precede solver access');
  assert.equal(calls.body, 0, 'denial must precede body parsing');
}

for (const authorization of [null, 'Basic synthetic', 'Bearer', 'Bearer one two', 'Bearer one,two']) {
  test(`missing/malformed authorization is rejected: ${authorization}`, async (t) => {
    const { calls, request } = setup(t, { authorization });
    const response = await POST(request);
    assert.equal(response.status, 401);
    assertNoPreviewWork(calls);
    assert.equal(calls.session.length, 0);
  });
}

for (const status of [401, 403, 500]) {
  test(`session service ${status} denies preview without doing work`, async (t) => {
    const { calls, request } = setup(t, { status });
    const response = await POST(request);
    assert.equal(response.status, status === 500 ? 503 : status);
    assertNoPreviewWork(calls);
  });
}

for (const role of ['citizen', 'field_crew', 'admin', 'sysadmin', 'unknown']) {
  test(`verified ${role} cannot preview even with an officer role in the body`, async (t) => {
    const { calls, request } = setup(t, { session: { user: { id: 'synthetic-user', role } } });
    const response = await POST(request);
    assert.equal(response.status, 403);
    assert.equal(calls.session.length, 1);
    assertNoPreviewWork(calls);
  });
}

for (const session of ['not JSON', {}, { user: null }, { user: { role: 'officer' } }, { user: { id: 'synthetic-user' } }]) {
  test(`malformed session response fails closed: ${JSON.stringify(session)}`, async (t) => {
    const { calls, request } = setup(t, { session });
    const response = await POST(request);
    assert.equal(response.status, 503);
    assertNoPreviewWork(calls);
    assert.deepEqual(await response.json(), { error: 'Unable to verify session' });
  });
}

for (const failure of [new TypeError('synthetic network failure'), new DOMException('synthetic timeout', 'TimeoutError')]) {
  test(`session ${failure.name} fails closed`, async (t) => {
    const { calls, request } = setup(t, { failure });
    const response = await POST(request);
    assert.equal(response.status, 503);
    assertNoPreviewWork(calls);
  });
}

test('verified officer can preview; session verification uses a fixed trusted origin without caching or redirects', async (t) => {
  const { calls, request } = setup(t);
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { tasks: [] });
  assert.deepEqual(calls.database, ['optimization_settings', 'public_reports']);
  assert.equal(calls.solver.length, 1);
  assert.equal(calls.body, 1);
  assert.equal(calls.session.length, 1);
  const { url, options } = calls.session[0];
  assert.equal(url, 'http://127.0.0.1:4002/api/auth/me');
  assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('a prior officer request never authorizes a later lower-role session', async (t) => {
  const first = setup(t);
  assert.equal((await POST(first.request)).status, 200);
  const second = setup(t, { session: { user: { id: 'synthetic-citizen', role: 'citizen' } } });
  assert.equal((await POST(second.request)).status, 403);
  assertNoPreviewWork(second.calls);
});
