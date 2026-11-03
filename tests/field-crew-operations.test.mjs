import test from 'node:test';
import assert from 'node:assert/strict';
import {operationsToday,validOperationsPeriod,operationsFresh,validateOperationsSummary} from '../lib/field-crew-operations.mjs';
const now=new Date('2026-11-03T02:00:00Z');
const base=(over={})=>({version:'crew-operations-v1',timezone:'Asia/Manila',start_day:'2026-11-02',end_day:'2026-11-02',generated_at:'2026-11-03T02:00:00Z',tasks:[],assignments:[],waypoints:[],verified:[],obstacles:[],...over});
test('today follows the Manila calendar day',()=>{assert.equal(operationsToday(new Date('2026-11-02T17:00:00Z')),'2026-11-03');assert.equal(operationsToday(new Date('2026-11-02T15:59:00Z')),'2026-11-02');});
test('periods are inclusive, valid, not in the future and at most 366 days',()=>{
 assert.ok(validOperationsPeriod('2026-11-03','2026-11-03',now));assert.ok(validOperationsPeriod('2025-11-03','2026-11-03',now));
 for(const [a,b] of [['2026-11-04','2026-11-04'],['2026-11-03','2026-11-02'],['2025-11-02','2026-11-03'],['2026-02-30','2026-03-01'],['x','y'],[undefined,'2026-11-03']])assert.equal(validOperationsPeriod(a,b,now),false);
});
test('a snapshot is fresh for 24 hours and cannot be from the future',()=>{
 const t=Date.parse('2026-11-03T02:00:00Z');assert.ok(operationsFresh('2026-11-03T02:00:00Z',t+3600000));assert.equal(operationsFresh('2026-11-03T02:00:00Z',t+90000000),false);
 assert.equal(operationsFresh('2026-11-03T03:00:00Z',t),false);assert.equal(operationsFresh('bad',t),false);assert.equal(operationsFresh(undefined,t),false);
});
test('a complete matching snapshot validates',()=>{
 const data=base({tasks:[{task_id:'t',current_accounts:[null]}],assignments:[{event_ref:'journal:1',receipt_accounts:[]}],waypoints:[{waypoint_id:'w',completion_ref:'task:t'}],verified:[{source_matches:true}],obstacles:[{source:'access_block'}]});
 assert.equal(validateOperationsSummary(data,'2026-11-02','2026-11-02'),data);
});
test('snapshots for another period or with malformed rows are refused instead of printed',()=>{
 for(const bad of [null,base({version:'x'}),base({timezone:'UTC'}),base({start_day:'2026-11-01'}),base({end_day:'2026-11-03'}),base({generated_at:'bad'}),base({tasks:{}}),base({tasks:[null]}),
  base({tasks:[{task_id:1,current_accounts:[]}]}),base({assignments:[{event_ref:'x'}]}),base({waypoints:[{waypoint_id:'w'}]}),base({verified:[{source_matches:'yes'}]}),base({obstacles:[{source:'other'}]}),base({tasks:Array(1001).fill({task_id:'t',current_accounts:[]})})])
  assert.throws(()=>validateOperationsSummary(bad,'2026-11-02','2026-11-02'),/incomplete data/);
});
