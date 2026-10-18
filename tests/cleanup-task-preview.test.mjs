import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { autoAssignCrewsToRoutes } from '../lib/crewAssignment.mjs';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) return {
      url: 'data:text/javascript,export const supabase={};export const checkPreviewQuota=()=>{};export const readBoundedJson=()=>{};export const readWebSession=()=>{};export const hasTrustedOrigin=()=>{}', shortCircuit: true,
    };
    return nextResolve(specifier === 'next/server' ? 'next/server.js' : specifier, context);
  },
});
const { validateAndSanitizeTasks } = await import('../app/api/tasks/auto-generate/preview/route.js');
hooks.deregister();

test('proposals use cleanup task titles with or without available crews', () => {
  const tasks = [{ primary_target_is_cluster: true }, { primary_target_is_cluster: false }];
  for (const crews of [[], [{ id: 'crew-1' }]]) {
    const proposals = autoAssignCrewsToRoutes(tasks, crews);
    assert.equal(proposals[0].title, 'Proposed Cleanup Task #1 (Cluster)');
    assert.equal(proposals[1].title, 'Proposed Cleanup Task #2 (Report)');
  }
});

test('preview preserves valid distance estimates without inventing missing distances', () => {
  const task = { primary_target_id: 'report-1', primary_target_is_cluster: false,
    primary_priority: 10, target_lat: 14.56, target_lon: 121.07,
    included_reports: [], cumulative_detour_minutes: 4 };
  const sanitize = distance => validateAndSanitizeTasks([{ ...task, estimated_distance_km: distance }],
    new Map([['report-1', { is_cluster: false }]]), new Set(['report-1']));
  for (const distance of [0, 12.5]) assert.equal(sanitize(distance)[0].estimated_distance_km, distance);
  for (const distance of [undefined, null, -1, NaN, Infinity, '12']) {
    assert.equal(sanitize(distance)[0].estimated_distance_km, undefined);
  }
});
