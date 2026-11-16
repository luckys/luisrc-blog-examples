import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {RetrievalCache,retrievalCacheKey} from './retrieval-cache.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f));
const capture=await json('results/cache.json'),cases=await json('cache-cases.json'),corpus=await json('corpus.json');
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha,file);
assert.equal(capture.failure,undefined);assert.equal(capture.containerRemoved,true);assert.deepEqual(capture.value,{rows:capture.rows,events:capture.events});assert.equal(capture.rows.length,22);assert.equal(cases.length,22);
assert.equal(capture.indexRevision,createHash('sha256').update(await read('corpus.json')).update('\0').update(await read('schema.sql')).digest('hex'));
let ticks=[];const cache=new RetrievalCache({ttlMs:capture.ttlMs,maxEntries:128,clock:()=>{assert.ok(ticks.length);return ticks.shift();}});
for(const [index,row]of capture.rows.entries()){
 const entry=cases[index];assert.equal(row.caseId,entry.id);assert.equal(row.role,entry.role);assert.equal(row.identity.session_user,entry.role);assert.equal(row.identity.current_user,entry.role);
 const key=retrievalCacheKey({principal:row.principal,state:row.state,configuration:{analyzer:'simple',rankNormalization:0,k:entry.k},query:entry.query});assert.equal(row.key,key);assert.equal(row.lookup.status,entry.expectedLookup);
 assert.equal(row.state.indexRevision,capture.indexRevision);assert.equal(row.state.accessRevision,index<16?1:2);
 const original=corpus.principals.find(p=>p.role===row.role);assert.equal(row.principal.tenant,original.tenant);assert.equal(row.principal.maxLevel,row.role==='alpha_manager'&&[10,11].includes(index)?0:original.maxLevel);assert.equal(row.principal.authorizationRevision,row.role==='alpha_manager'?(index<10?1:index<12?2:3):1);
 ticks=[row.lookup.checkedAtMs,...(row.result&&row.lookup.status!=='hit'?[row.result.savedAtMs]:[])];let loads=0,observed;
 try{
  const replay=await cache.getOrLoad(key,async()=>{loads++;assert.equal(row.queries.length,1);if(row.error){const failure=Error(row.error.message);failure.code=row.error.code;throw failure;}return row.queries[0].rows;},lookup=>{observed=lookup;});
  assert.equal(row.error,null);assert.deepEqual(replay,row.result);
 }catch(error){assert.ok(row.error);assert.equal(error.code,row.error.code);assert.equal(error.code,'22012');assert.equal(row.result,null);}
 assert.deepEqual(observed,row.lookup);assert.equal(loads,row.queries.length);assert.equal(ticks.length,0);assert.equal(row.queries.length,row.lookup.status==='hit'?0:1);
 if(row.result){assert.equal(row.result.rows.length,entry.expectedRows);assert.deepEqual(row.result.lookup,row.lookup);for(const document of row.result.rows){const source=corpus.documents.find(d=>d.id===document.id);assert.equal(document.body,source.body);assert.equal(document.revision,source.revision);assert.equal(document.tenant,row.principal.tenant);const level=row.state.accessRevision===2&&source.id==='alpha-cache-v1'?1:source.accessLevel;assert.equal(document.access_level,level);assert.ok(level<=row.principal.maxLevel);}}
 if(row.lookup.status==='hit')assert.ok(row.lookup.checkedAtMs<row.lookup.previousExpiresAtMs);
 if(row.lookup.status==='expired')assert.ok(row.lookup.checkedAtMs>=row.lookup.previousExpiresAtMs);
 if(row.result?.savedAtMs!==undefined){assert.ok(row.result.savedAtMs>=row.lookup.checkedAtMs);assert.equal(row.result.expiresAtMs,row.result.savedAtMs+capture.ttlMs);}
 for(const query of row.queries){if(row.error){assert.equal(query.sql,'SELECT 1/0');assert.equal(query.code,'22012');}else{assert.equal(query.sql,(await read('search.sql')).toString());assert.deepEqual(query.params,[entry.query,entry.k]);}}
}
const wait=capture.events.find(e=>e.kind==='native-ttl-wait');assert.ok(wait.endedAtMs-wait.startedAtMs>=capture.ttlMs);assert.equal(wait.beforeCase,'ttl-expired');
const acl=capture.events.find(e=>e.kind==='document-acl-and-epoch-committed');assert.deepEqual(acl.document,{id:'alpha-cache-v1',access_level:1});assert.equal(acl.state.access_revision,2);
const stats=Object.fromEntries(['hit','miss','expired'].map(status=>[status,capture.rows.filter(r=>r.lookup.status===status).length]));assert.deepEqual(stats,{hit:8,miss:13,expired:1});assert.equal(capture.rows.reduce((n,r)=>n+r.queries.length,0),14);
console.log(JSON.stringify({verified:true,requests:22,lookups:stats,sourceCalls:14,sourceErrors:2,observedWaitMs:wait.endedAtMs-wait.startedAtMs},null,2));
