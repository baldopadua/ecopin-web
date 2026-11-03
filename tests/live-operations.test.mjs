import test from 'node:test';
import assert from 'node:assert/strict';
import {liveFeedStatus,validateLiveOperations,LIVE_POLL_MS} from '../lib/live-operations.mjs';
const now=Date.parse('2026-10-30T04:00:00Z');
const snapshot=()=>({version:'live-operations-v1',generated_at:new Date(now).toISOString(),presence_window_seconds:90,events:[],has_more:false,next_cursor:null,latest_event_id:null,crew_count:1,recent_members:0,quiet_members:0,unknown_members:1,crews:[{crew_id:'20000000-0000-0000-0000-000000000001',name:'Crew 1',member_count:1,recent_members:0,quiet_members:0,unknown_members:1,last_seen_at:null}]});
test('feed refresh interval leaves room for an eight-second request within thirty seconds',()=>{assert.equal(LIVE_POLL_MS,20000);assert.ok(LIVE_POLL_MS+8000<=30000)});
test('freshness distinguishes local offline, server failure, stale snapshots and a live feed',()=>{
 const p={data:snapshot(),now,receivedAt:now,online:true,error:false};assert.equal(liveFeedStatus(p).state,'live');
 assert.equal(liveFeedStatus({...p,now:now+30001}).state,'stale');
 assert.equal(liveFeedStatus({...p,online:false}).state,'offline');assert.equal(liveFeedStatus({...p,error:true}).state,'unavailable');
 assert.equal(liveFeedStatus({...p,data:null}).state,'loading');
 p.data.generated_at=new Date(now-60000).toISOString();assert.equal(liveFeedStatus(p).state,'stale');
});
test('missing crew presence is explicit, malformed counts and unsafe event cursors fail closed',()=>{
 assert.ok(validateLiveOperations(snapshot()));
 for(const mutate of [d=>d.crew_count=2,d=>d.crews[0].recent_members=1,d=>d.has_more=true,d=>d.latest_event_id='900719925474099300000',d=>d.generated_at='bad']){
  const d=snapshot();mutate(d);assert.throws(()=>validateLiveOperations(d),/incomplete/);
 }
});

test('new task transitions remain readable by the existing audit and case-record contracts',async()=>{
 const {validateOperationalPage}=await import('../lib/operational-events.mjs');
 const {validateCaseRecord}=await import('../lib/incident-case-record.mjs');
 const event={id:'9007199254740993',event_type:'task_transition',occurred_at:new Date(now).toISOString(),recorded_at:new Date(now).toISOString(),time_basis:'server'};
 assert.ok(validateOperationalPage({events:[event],has_more:false,next_cursor:null}));
 const id='10000000-0000-0000-0000-000000000001';assert.ok(validateCaseRecord({version:'case-record-v1',snapshot_at:new Date(now).toISOString(),report:{id},events:[{...event,scope:'task_context'}],activity:[],proof:null},id));
});
