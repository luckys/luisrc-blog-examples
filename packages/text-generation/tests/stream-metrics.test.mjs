import test from 'node:test';import assert from 'node:assert/strict';import {summarize,median} from '../stream-metrics.mjs';
test('timing: TTFT, inter-token and total use their declared denominators',()=>{
 assert.deepEqual(summarize([5,8,12],14),{tokens:3,ttftMs:5,totalMs:14,meanInterTokenMs:3.5});
 assert.equal(summarize([5],8).meanInterTokenMs,null);assert.equal(median([9,1,3]),3);assert.equal(median([2,8]),5);
 assert.throws(()=>summarize([5,4],6));assert.throws(()=>summarize([5],4));assert.throws(()=>summarize([],4));
 assert.equal(summarize([5,5,5],6).meanInterTokenMs,0); // coalesced stdout chunk
});
