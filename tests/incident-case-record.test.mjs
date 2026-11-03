import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCaseRecord,caseCoordinates,caseTime,caseProofUrl} from '../lib/incident-case-record.mjs';
const id='a0400000-0000-4000-8000-000000000003',proof='b0400000-0000-4000-8000-000000000001',snap='2026-11-03T08:00:00.000Z';
const base=(over={})=>({version:'case-record-v1',snapshot_at:snap,report:{id},events:[],activity:[],proof:null,...over});
const event={event_type:'completion',scope:'incident',time_basis:'server'};
test('a complete snapshot validates and keeps its history',()=>{
 const data=base({events:[event],activity:[{action_type:'status_change'}]});assert.equal(validateCaseRecord(data,id.toUpperCase()),data);
});
test('incomplete, mismatched or unknown snapshots are refused instead of printed',()=>{
 for(const bad of [null,base({version:'x'}),base({snapshot_at:'nope'}),base({report:{id:'other'}}),base({events:{}}),base({activity:null}),
  base({events:[{...event,event_type:'invented'}]}),base({events:[{...event,scope:'global'}]}),base({events:[{...event,time_basis:'guess'}]}),
  base({activity:[{}]}),base({proof:{id:'x'}}),base({proof:{id:proof,verified_at:snap,completed_at:'bad'}}),base({events:Array(10001).fill(event)})])
  assert.throws(()=>validateCaseRecord(bad,id),/incomplete snapshot/);
});
test('a published proof needs identity and both timestamps',()=>{
 assert.ok(validateCaseRecord(base({proof:{id:proof,verified_at:snap,completed_at:snap}}),id));
});
test('coordinates are shown only when real, never invented',()=>{
 assert.equal(caseCoordinates({latitude:14.5731234,longitude:121.0801}),'14.573123, 121.080100');
 for(const r of [{},{latitude:null,longitude:null},{latitude:'14.5',longitude:'121'},{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:NaN,longitude:1}])
  assert.equal(caseCoordinates(r),'Pin coordinates not recorded');
});
test('times are Manila time and invalid values are labelled',()=>{
 assert.match(caseTime('2026-11-03T00:00:00Z'),/08:00:00/);
 for(const v of [null,undefined,'',  'bad',5])assert.equal(caseTime(v),'Not recorded / invalid source time');
});
test('proof image URLs are built only from valid ids and slots',()=>{
 assert.equal(caseProofUrl(id,{id:proof},'before'),`/api/backend/api/reports/${id}/cleanup-proof/public/${proof}/before`);
 for(const [i,p,s] of [['x',{id:proof},'before'],[id,{id:'x'},'before'],[id,{id:proof},'original'],[id,null,'after'],[`${id}/../x`,{id:proof},'after']])assert.equal(caseProofUrl(i,p,s),null);
});
