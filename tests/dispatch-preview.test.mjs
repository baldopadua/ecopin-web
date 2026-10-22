import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { registerHooks } from 'node:module';
import { getPreviewReportIds } from '../lib/cleanup-task-dispatch.mjs';

const originalBackend = process.env.NEXT_PUBLIC_BACKEND_API_URL;
process.env.NEXT_PUBLIC_BACKEND_API_URL = 'http://127.0.0.1:4002';
after(() => { if (originalBackend === undefined) delete process.env.NEXT_PUBLIC_BACKEND_API_URL; else process.env.NEXT_PUBLIC_BACKEND_API_URL = originalBackend; });
const databaseModule = 'data:text/javascript,export const supabase={from(){}};';
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true };
  if (specifier === '@/lib/supabase') return { url: databaseModule, shortCircuit: true };
  if (specifier === '@/lib/server/web-session.mjs') return { url: 'data:text/javascript,export const hasTrustedOrigin=()=>true;export const readWebSession=async()=>({kind:"full",accessToken:"server-session-token"});', shortCircuit: true };
  if (specifier === '@/lib/server/preview-quota.mjs') return { url: 'data:text/javascript,export const checkPreviewQuota=async()=>({status:200});', shortCircuit: true };
  if (specifier.startsWith('@/')) return { url: new URL(specifier.replace(/^@\//, '../'), import.meta.url).href, shortCircuit: true };
  return next(specifier === 'next/server' ? 'next/server.js' : specifier, context);
} });
const { supabase } = await import(databaseModule);
const { POST, validateAndSanitizeTasks } = await import('../app/api/tasks/auto-generate/preview/route.js');
hooks.deregister();

test('cluster dispatch uses only previewed reports, never the cluster UUID', () => {
  assert.deepEqual(getPreviewReportIds({ primary_target_is_cluster: true, primary_target_id: 'cluster-1', included_reports: [{ report_id: 'eligible-1' }, { report_id: 'detour-1' }, { report_id: 'eligible-1' }] }), ['eligible-1', 'detour-1']);
  assert.throws(() => getPreviewReportIds({ primary_target_is_cluster: true, primary_target_id: 'cluster-1', included_reports: [] }), /preview/i);
  assert.deepEqual(getPreviewReportIds({ primary_target_is_cluster: false, primary_target_id: 'primary-1', included_reports: [{ report_id: 'detour-1' }] }), ['primary-1', 'detour-1']);
});

test('server preview includes the eligible primary cluster members even when the solver lists only detours', () => {
  const result = validateAndSanitizeTasks([{ primary_target_id: 'cluster-1', primary_target_is_cluster: true,
    primary_priority: 10, target_lat: 14.56, target_lon: 121.07, cumulative_detour_minutes: 0,
    included_reports: [{ report_id: 'detour-1' }] }],
  new Map([['cluster-1', { is_cluster: true, report_ids: ['eligible-1'] }]]), new Set(['eligible-1', 'detour-1']));
  assert.deepEqual(new Set(result[0].included_reports.map(report => report.report_id)), new Set(['eligible-1', 'detour-1']));
});

function setup(t, { tasks = [], blocks = [], lookupStatus = 200 } = {}) {
  t.mock.method(supabase, 'from', table => ({
    select() { return this; }, eq() { return this; }, abortSignal() { return this; },
    async single() { return { data: null }; },
    async range() { return { data: [{ id: 'report-1', cluster_id: 'cluster-1', status: 'unresolved', validation_status: 'approved', latitude: 14.56, longitude: 121.07, created_at: '2026-10-20T00:00:00Z', severity_score: 2 }], error: null }; }
  }));
  const lookups = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).endsWith('/api/auth/me')) return Response.json({ user: { id: 'officer-1', role: 'officer' } });
    if (/\/api\/(cleanup-tasks|optimization\/blocks)$/.test(String(url))) {
      lookups.push({ url: String(url), options });
      return Response.json(String(url).endsWith('/cleanup-tasks') ? tasks : blocks, { status: lookupStatus });
    }
    return new Response(null, { status: 503 });
  });
  return lookups;
}
async function preview() {
  return POST(new Request('http://localhost/api/tasks/auto-generate/preview', { method: 'POST', headers: { Origin: 'http://localhost', Authorization: 'Bearer untrusted-browser-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ config: {} }) }));
}

for (const [label, state] of [['claimed', { tasks: [{ status: 'pending', report_ids: ['report-1'] }] }], ['blocked', { blocks: [{ cluster_id: 'cluster-1' }] }]]) {
  test(`preview excludes ${label} reports using the server session`, async t => {
    const lookups = setup(t, state);
    const response = await preview();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).tasks, []);
    assert.equal(lookups.length, 2);
    assert.ok(lookups.every(call => call.options.headers.Authorization === 'Bearer server-session-token'));
  });
}
test('unavailable eligibility checks stop preview rather than treating every report as free', async t => {
  setup(t, { lookupStatus: 401 });
  const response = await preview();
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /availability/i);
});
