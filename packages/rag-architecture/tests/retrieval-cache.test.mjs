import test from 'node:test';
import assert from 'node:assert/strict';
import {RetrievalCache,retrievalCacheKey} from '../retrieval-cache.mjs';
const input={principal:{role:'alpha_reader',tenant:'alpha',maxLevel:0,authorizationRevision:1},state:{accessRevision:1,indexRevision:'v1'},configuration:{analyzer:'simple',rankNormalization:0,k:3},query:'cache'};
test('identity,scope,ACL,index,config and exact query are distinct cache dimensions',()=>{
 const original=retrievalCacheKey(input);
 for(const change of [{principal:{...input.principal,role:'alpha_manager'}},{principal:{...input.principal,tenant:'beta'}},{principal:{...input.principal,maxLevel:1}},{principal:{...input.principal,authorizationRevision:2}},{state:{...input.state,accessRevision:2}},{state:{...input.state,indexRevision:'v2'}},{configuration:{...input.configuration,k:1}},{query:'cache '}])assert.notEqual(retrievalCacheKey({...input,...change}),original);
});
test('missing trusted scope fails before a key can be used',()=>{assert.throws(()=>retrievalCacheKey({...input,principal:null}),/Trusted principal/);assert.throws(()=>retrievalCacheKey({...input,state:{...input.state,accessRevision:0}}),/accessRevision/);});
test('empty successful result is a cache hit,not an error or a miss',async()=>{
 const cache=new RetrievalCache({ttlMs:3000}),first=await cache.getOrLoad('A',async()=>[]),second=await cache.getOrLoad('A',async()=>{throw Error('Should hit');});assert.equal(first.lookup.status,'miss');assert.equal(second.lookup.status,'hit');assert.deepEqual(second.rows,[]);
});
test('fake-clock unit control expires exactly at TTL boundary',async()=>{
 let now=0,calls=0;const cache=new RetrievalCache({ttlMs:3000,clock:()=>now}),load=async()=>[{id:String(++calls)}];await cache.getOrLoad('A',load);now=2999;assert.equal((await cache.getOrLoad('A',load)).lookup.status,'hit');now=3000;assert.equal((await cache.getOrLoad('A',load)).lookup.status,'expired');assert.equal(calls,2);
});
test('failed loads are never inserted',async()=>{
 const cache=new RetrievalCache({ttlMs:3000});let calls=0;for(let i=0;i<2;i++)await assert.rejects(cache.getOrLoad('A',async()=>{calls++;throw Error('Origin failed');}),/Origin failed/);assert.equal(calls,2);assert.equal((await cache.getOrLoad('A',async()=>[])).lookup.status,'miss');
});
test('callers cannot mutate the cached source or a future result',async()=>{
 const cache=new RetrievalCache({ttlMs:3000}),origin=[{id:'A'}],first=await cache.getOrLoad('A',async()=>origin);origin[0].id='B';first.rows[0].id='C';const second=await cache.getOrLoad('A',async()=>[]);assert.equal(second.rows[0].id,'A');second.rows[0].id='D';assert.equal((await cache.getOrLoad('A',async()=>[])).rows[0].id,'A');
});
test('entry quota uses FIFO;hits do not pretend to be LRU',async()=>{
 const cache=new RetrievalCache({ttlMs:3000,maxEntries:2}),load=async()=>[];await cache.getOrLoad('A',load);await cache.getOrLoad('B',load);await cache.getOrLoad('A',load);await cache.getOrLoad('C',load);assert.equal((await cache.getOrLoad('A',load)).lookup.status,'miss');
});
