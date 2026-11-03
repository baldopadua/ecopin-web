import test from 'node:test';import assert from 'node:assert/strict';
import {validateExecutiveSnapshot,executiveFresh,executiveHotspots,previousExecutiveMonth} from '../lib/barangay-executive.mjs';
import {executiveFixture} from './fixtures/barangay-executive.mjs';
import {isAllowedBackendRequest,isPublicBackendRequest} from '../lib/server/backend-policy.mjs';
test('executive snapshot preserves monthly scope and requires the same comparison snapshot',async()=>{
 const d=await executiveFixture(),month=d.monthly.start_month;assert.equal(validateExecutiveSnapshot(d,month),d);
 for(const mutate of [x=>x.monthly.end_month='2000-01',x=>x.comparison.generated_at='2020-01-01T00:00:00Z',x=>x.comparison.groups[0].backlog_total++,x=>x.monthly.groups[0].monthly[0].month='2000-01',x=>x.comparison.groups.pop()]){const bad=structuredClone(d);mutate(bad);assert.throws(()=>validateExecutiveSnapshot(bad,month));}
 assert.equal(previousExecutiveMonth('2026-01'),'2025-12');assert.equal(previousExecutiveMonth('2000-01'),'2000-01');
});
test('stale and future snapshots cannot be printed as current evidence',()=>{
 const now=Date.parse('2026-10-29T00:00:00Z');assert.equal(executiveFresh('2026-10-28T23:00:00Z',now),true);
 for(const stamp of ['2026-10-27T00:00:00Z','2026-10-29T01:00:00Z','invalid'])assert.equal(executiveFresh(stamp,now),false);
});
test('unavailable hotspots are distinct from zero observed concentrations',()=>{
 assert.equal(executiveHotspots(null).status,'unavailable');
 const now=Date.now(),data={generated_at:new Date(now).toISOString(),history_start:new Date(now-90*86400000).toISOString(),patterns:[],params:{eps_meters:50,min_samples:3},quality:{included_reports_90:0,eligible_reports_90:0,excluded_unreconciled_90:0,excluded_invalid_location_90:0}};
 assert.equal(executiveHotspots(data,now).status,'ready');data.generated_at='2020-01-01T00:00:00Z';assert.equal(executiveHotspots(data,now).status,'unavailable');
});
test('executive endpoint is private read-only',()=>{const path='/api/analytics/barangay/executive';assert.equal(isAllowedBackendRequest('GET',path),true);assert.equal(isPublicBackendRequest('GET',path),false);assert.equal(isAllowedBackendRequest('POST',path),false);});
