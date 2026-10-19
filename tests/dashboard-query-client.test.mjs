import assert from 'node:assert/strict';
import test from 'node:test';
import { createDashboardQueryClient, dashboardSessionScope, DASHBOARD_QUERY_KEY } from '../lib/dashboard-query-client.mjs';

test('dashboard reads share an in-flight request, reuse fresh results and refresh after invalidation', async () => {
  const client = createDashboardQueryClient();
  let requests = 0;
  const options = { queryKey: [...DASHBOARD_QUERY_KEY, 'reports'], queryFn: async () => ++requests };
  try {
    assert.deepEqual(await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]), [1, 1]);
    assert.equal(await client.fetchQuery(options), 1);
    await client.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    assert.equal(await client.fetchQuery(options), 2);
    client.setQueryData(options.queryKey, 2, { updatedAt: Date.now() - 31_000 });
    assert.equal(await client.fetchQuery(options), 3, 'data older than 30 seconds refreshes');
  } finally { client.clear(); }
});

test('session scope changes for identity, permissions and tenant, but not a routine expiry refresh', () => {
  const session = { sessionTag: 'a'.repeat(22), user: { id: 'one', role: 'officer', lgu_id: 'one', barangay_id: 'one' } };
  const original = dashboardSessionScope(session);
  assert.equal(dashboardSessionScope({ ...session, expiresAt: Date.now() }), original);
  assert.notEqual(dashboardSessionScope({ ...session, sessionTag: 'b'.repeat(22) }), original);
  for (const field of ['id', 'role', 'lgu_id', 'barangay_id']) {
    assert.notEqual(dashboardSessionScope({ ...session, user: { ...session.user, [field]: 'changed' } }), original);
  }
  assert.notEqual(dashboardSessionScope(null), original);
});

test('a failed refresh keeps the last good data and stays eligible for retry', async () => {
  const client = createDashboardQueryClient();
  const key = [...DASHBOARD_QUERY_KEY, 'reports'];
  try {
    client.setQueryData(key, ['old']);
    await client.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    await assert.rejects(client.fetchQuery({ queryKey: key, queryFn: async () => { throw new Error('offline'); } }), /offline/);
    assert.deepEqual(client.getQueryData(key), ['old']);
    assert.deepEqual(await client.fetchQuery({ queryKey: key, queryFn: async () => ['new'] }), ['new']);
  } finally { client.clear(); }
});

test('successful protected writes announce fresh data; reads and failed writes do not', async t => {
  const previousWindow = globalThis.window;
  globalThis.window = new EventTarget();
  t.after(() => { if (previousWindow) globalThis.window = previousWindow; else delete globalThis.window; });
  const { backendFetch } = await import('../lib/backend-fetch.mjs');
  let changes = 0;
  window.addEventListener('ecopin-dashboard-data-changed', () => changes++);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true }));
  await backendFetch('/api/backend/api/reports', { method: 'GET' });
  await backendFetch('/api/backend/api/reports/batch-evidence', { method: 'POST' });
  await backendFetch('/api/tasks/auto-generate/preview', { method: 'POST' });
  assert.equal(changes, 0);
  await backendFetch('/api/backend/api/reports', { method: 'PATCH' });
  assert.equal(changes, 1);
  t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 503 }));
  await backendFetch('/api/backend/api/reports', { method: 'POST' });
  assert.equal(changes, 1);
});
