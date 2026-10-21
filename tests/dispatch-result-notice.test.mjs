import test from 'node:test';import assert from 'node:assert/strict';
import {dispatchResultNotice} from '../lib/dispatch-result-notice.mjs';
test('route failure outranks the empty tasks array and exposes the actual cause',()=>{
 assert.deepEqual(dispatchResultNotice({routing_status:'failed',tasks:[],warning:'Physical load estimate unavailable'}),{type:'error',message:'Physical load estimate unavailable'});
});
test('unknown failure does not invent shift-hours or rollback claims',()=>{
 const result=dispatchResultNotice({routing_status:'needs_replan',tasks:[]});assert.equal(result.type,'error');assert.doesNotMatch(result.message,/shift|returned/i);
});
test('routing without tasks remains pending, not empty',()=>{assert.equal(dispatchResultNotice({routing_status:'routing',tasks:[]}).type,'info');});
test('only a published nonempty dispatch is successful',()=>{
 assert.equal(dispatchResultNotice({routing_status:'empty',tasks:[]}).type,'warning');
 assert.equal(dispatchResultNotice({routing_status:'ready',tasks:[{id:'task'}]}),null);
});
