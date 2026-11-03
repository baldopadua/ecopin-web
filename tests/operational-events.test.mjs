import test from 'node:test';
import assert from 'node:assert/strict';
import {operationalDuration,validateOperationalPage} from '../lib/operational-events.mjs';
import {isAllowedBackendRequest,isPublicBackendRequest} from '../lib/server/backend-policy.mjs';
test('recorded turnaround preserves zero/subsecond values and rejects missing or reversed clocks',()=>{
 assert.equal(operationalDuration(0),'0 s');assert.equal(operationalDuration(.2),'<1 s');assert.equal(operationalDuration(3661),'1 h 1 min 1 s');
 for(const value of [null,undefined,NaN,-1])assert.equal(operationalDuration(value),'Not enough recorded milestones');
});
test('malformed event pages fail instead of inventing timestamps',()=>{
 assert.throws(()=>validateOperationalPage({events:[{id:'1',event_type:'arrival',time_basis:'device_reported'}],has_more:false}));
 assert.throws(()=>validateOperationalPage({events:[],has_more:true,next_cursor:null}));
 assert.deepEqual(validateOperationalPage({events:[],has_more:false,next_cursor:null}),{events:[],has_more:false,next_cursor:null});
});
test('operational audit is a private read-only proxy destination',()=>{
 assert.equal(isAllowedBackendRequest('GET','/api/operational-events'),true);assert.equal(isPublicBackendRequest('GET','/api/operational-events'),false);
 for(const method of ['POST','PATCH','DELETE'])assert.equal(isAllowedBackendRequest(method,'/api/operational-events'),false);
});

test('non-finite and BC timestamp payloads fail closed',()=>{
 for(const stamp of ['-infinity','infinity','0044-03-15 00:00:00+08:00 BC'])for(const field of ['occurred_at','recorded_at']){
  const event={id:'1',event_type:'arrival',time_basis:'device_reported',occurred_at:'2026-10-29T00:00:00Z',recorded_at:'2026-10-29T00:01:00Z',[field]:stamp};
  assert.throws(()=>validateOperationalPage({events:[event],has_more:false}));
 }
});
