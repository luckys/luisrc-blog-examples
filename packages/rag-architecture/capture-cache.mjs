import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';import assert from 'node:assert/strict';
import {withDatabaseFixture} from './database-fixture.mjs';import {RetrievalCache,retrievalCacheKey} from './retrieval-cache.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root));
for(const file of ['results/cache.json','results/cache-failed.json']){try{await access(new URL(file,root));throw Error('Preserve existing capture '+file);}catch(error){if(error.code!=='ENOENT')throw error;}}
const files=['cache-protocol.json','cache-cases.json','retrieval-cache.mjs','capture-cache.mjs','database-fixture.mjs','schema.sql','search.sql','runtime.json','corpus.json','dependency-lock.capture.json'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await read(f)).digest('hex')])));
const protocol=JSON.parse(await read('cache-protocol.json')),cases=JSON.parse(await read('cache-cases.json')),searchSql=(await read('search.sql')).toString();
const indexRevision=createHash('sha256').update(await read('corpus.json')).update('\0').update(await read('schema.sql')).digest('hex');
const rows=[],events=[];const ttlMs=3000;
const native=await withDatabaseFixture(async({admin,connect,corpus})=>{
 await admin.query('CREATE TABLE cache_state(singleton boolean PRIMARY KEY CHECK(singleton),index_revision text NOT NULL,access_revision integer NOT NULL CHECK(access_revision>0))');
 await admin.query('INSERT INTO cache_state VALUES(true,$1,1)',[indexRevision]);
 for(const p of corpus.principals)await admin.query('GRANT SELECT ON cache_state TO '+p.role);
 const connections=new Map();for(const p of corpus.principals)connections.set(p.role,await connect(p.role));
 const cache=new RetrievalCache({ttlMs,maxEntries:128});
 for(const entry of cases){
  if(['revoke','restore'].includes(entry.before)){
   const updated=(await admin.query('UPDATE principals SET max_level=$1,authorization_revision=authorization_revision+1 WHERE role_name=$2 RETURNING role_name,max_level,authorization_revision',[entry.before==='revoke'?0:1,'alpha_manager'])).rows[0];events.push({beforeCase:entry.id,kind:entry.before,updated});
  }
  if(entry.before==='restrict-document'){
   await admin.query('BEGIN');
   const document=(await admin.query("UPDATE documents SET access_level=1 WHERE id='alpha-cache-v1' RETURNING id,access_level")).rows[0];
   const state=(await admin.query('UPDATE cache_state SET access_revision=access_revision+1 RETURNING index_revision,access_revision')).rows[0];
   await admin.query('COMMIT');events.push({beforeCase:entry.id,kind:'document-acl-and-epoch-committed',document,state});
  }
  if(entry.before==='wait-ttl'){const startedAtMs=performance.now();await new Promise(resolve=>setTimeout(resolve,ttlMs+100));events.push({beforeCase:entry.id,kind:'native-ttl-wait',startedAtMs,endedAtMs:performance.now(),requestedWaitMs:ttlMs+100});}
  const client=connections.get(entry.role),queries=[];let lookup,key,principal,state,identity,result,error;
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try{
   principal=(await client.query('SELECT role_name::text AS role,tenant,max_level AS "maxLevel",authorization_revision AS "authorizationRevision" FROM principals WHERE role_name=session_user')).rows[0];
   state=(await client.query('SELECT index_revision AS "indexRevision",access_revision AS "accessRevision" FROM cache_state WHERE singleton')).rows[0];
   identity=(await client.query('SELECT session_user,current_user')).rows[0];assert.equal(identity.session_user,entry.role);assert.equal(identity.current_user,entry.role);
   const configuration={analyzer:'simple',rankNormalization:0,k:entry.k};key=retrievalCacheKey({principal,state,configuration,query:entry.query});
   result=await cache.getOrLoad(key,async()=>{
    if(entry.before==='sql-error'){try{await client.query('SELECT 1/0');}catch(failure){queries.push({sql:'SELECT 1/0',params:[],code:failure.code});throw failure;}}
    const result=await client.query(searchSql,[entry.query,entry.k]);queries.push({sql:searchSql,params:[entry.query,entry.k],rows:result.rows});return result.rows;
   },observed=>{lookup=observed;});
   await client.query('COMMIT');
  }catch(failure){await client.query('ROLLBACK');error={code:failure.code,message:failure.message};if(entry.before!=='sql-error')throw failure;assert.equal(error.code,'22012');}
  assert.equal(lookup.status,entry.expectedLookup,entry.id);if(entry.expectedRows!==null)assert.equal(result.rows.length,entry.expectedRows,entry.id);
  if(entry.before==='sql-error')assert.equal(error.code,'22012');else assert.equal(error,undefined);
  const item={caseId:entry.id,role:entry.role,principal,state,identity,key,lookup,queries,result:result??null,error:error??null};
  if(result)for(const row of result.rows){assert.equal(row.tenant,principal.tenant);assert.ok(row.access_level<=principal.maxLevel);if(state.accessRevision===2&&row.id==='alpha-cache-v1')assert.equal(row.access_level,1);}
  rows.push(item);
 }
 return{rows,events};
});
const artifact={capturedAt:new Date().toISOString(),kind:'real_postgresql_retrieval_cache_scope_and_expiry',sourceHashes,protocol,indexRevision,ttlMs,...native,rows,events};
await writeFile(new URL(native.failure?'results/cache-failed.json':'results/cache.json',root),JSON.stringify(artifact,null,2)+'\n');if(native.failure)throw Error(native.failure.message);
console.log(JSON.stringify({requests:rows.length,lookups:Object.fromEntries(['hit','miss','expired'].map(status=>[status,rows.filter(r=>r.lookup.status===status).length])),sourceCalls:rows.reduce((n,r)=>n+r.queries.length,0),sourceErrors:rows.filter(r=>r.error).length,ttlWait:events.find(e=>e.kind==='native-ttl-wait'),containerRemoved:native.containerRemoved},null,2));
