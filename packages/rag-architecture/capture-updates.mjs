import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {withDatabaseFixture} from './database-fixture.mjs';
import {RetrievalCache,retrievalCacheKey} from './retrieval-cache.mjs';
import {generationTable,contentFingerprint,validateGeneration,sourceQuery,citationQuery} from './updates-core.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f));
for(const file of ['results/updates.json','results/updates-failed.json']){try{await access(new URL(file,root));throw Error('Preserve existing capture '+file);}catch(error){if(error.code!=='ENOENT')throw error;}}
const files=['updates-protocol.json','updates-cases.json','updates-schema.sql','updates-core.mjs','updates-v2-corpus.json','capture-updates.mjs','retrieval-cache.mjs','database-fixture.mjs','schema.sql','runtime.json','corpus.json','dependency-lock.capture.json'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await read(f)).digest('hex')])));
const protocol=await json('updates-protocol.json'),cases=await json('updates-cases.json'),v1=(await json('corpus.json')).documents,v2=await json('updates-v2-corpus.json');
const revisions={v1:contentFingerprint(v1),v2:contentFingerprint(v2)};assert.notEqual(revisions.v1,revisions.v2);
const events=[],reads=[],citations=[],activations=[],probes=[],relations=[];
const event=(kind,details={})=>{const entry={sequence:events.length+1,kind,...details};events.push(entry);return entry;};
const native=await withDatabaseFixture(async({admin,connect,corpus})=>{
 await admin.query((await read('updates-schema.sql')).toString());
 for(const d of v1)await admin.query('INSERT INTO document_acl(tenant,document_key,access_level) VALUES($1,$2,$3)',[d.tenant,d.key,d.accessLevel]);
 await admin.query('INSERT INTO index_state VALUES(true,$1,$2,1)',['v1',revisions.v1]);
 for(const p of corpus.principals)await admin.query('GRANT SELECT ON document_acl,index_state,documents_v2 TO '+p.role);
 const insert=async d=>admin.query('INSERT INTO documents_v2(id,tenant,document_key,revision,access_level,body) VALUES($1,$2,$3,$4,$5,$6)',[d.id,d.tenant,d.key,d.revision,d.accessLevel,d.body]);
 const missingId='beta-restoration-v1';for(const d of v2.filter(d=>d.id!==missingId))await insert(d);
 event('candidate-built-partial',{generation:'v2',loaded:11,omittedId:missingId});
 const active=async client=>(await client.query('SELECT generation,index_revision AS "indexRevision",access_revision AS "accessRevision" FROM index_state WHERE singleton')).rows[0];
 const snapshot=async(client,generation)=>(await client.query(`SELECT id,tenant,document_key AS key,revision,access_level AS "accessLevel",body FROM ${generationTable(generation)} ORDER BY id`)).rows;
 async function activate(id,expectedActiveRevision){
  const before=await active(admin);await admin.query('BEGIN');
  try{
   await admin.query('SET LOCAL lock_timeout=\'2s\'');await admin.query('LOCK TABLE documents_v2 IN SHARE MODE');
   const actual=await snapshot(admin,'v2'),validation=validateGeneration(v2,actual);
   if(!validation.accepted){await admin.query('ROLLBACK');const after=await active(admin);const result={id,accepted:false,reason:'invalid_candidate',before,after,validation,changedRows:0};activations.push(result);event('activation-rejected',result);return result;}
   const update=await admin.query('UPDATE index_state SET generation=$1,index_revision=$2 WHERE singleton AND index_revision=$3 RETURNING generation,index_revision AS "indexRevision",access_revision AS "accessRevision"',['v2',validation.actualHash,expectedActiveRevision]);
   if(update.rowCount!==1){await admin.query('ROLLBACK');const after=await active(admin);const result={id,accepted:false,reason:'stale_pointer',before,after,validation,changedRows:update.rowCount};activations.push(result);event('activation-rejected',result);return result;}
   await admin.query('COMMIT');const result={id,accepted:true,reason:'validated_and_activated',before,after:await active(admin),validation,changedRows:1};activations.push(result);event('activation-committed',result);return result;
  }catch(error){await admin.query('ROLLBACK');throw error;}
 }
 const cache=new RetrievalCache({ttlMs:60000,maxEntries:128});
 async function bind(entry){
  const client=await connect(entry.role);await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const principal=(await client.query('SELECT role_name::text AS role,tenant,max_level AS "maxLevel",authorization_revision AS "authorizationRevision" FROM principals WHERE role_name=session_user')).rows[0];
  const state=await active(client),identity=(await client.query('SELECT session_user,current_user,pg_current_snapshot()::text AS snapshot')).rows[0];
  assert.equal(identity.session_user,entry.role);assert.equal(identity.current_user,entry.role);
  const bound={client,principal,state,identity,entry};event('request-bound',{caseId:entry.id,role:entry.role,state,snapshot:identity.snapshot});return bound;
 }
 async function retrieve(bound){
  const{client,principal,state,identity,entry}=bound,queries=[];
  const configuration={analyzer:'simple',rankNormalization:0,k:entry.k},key=retrievalCacheKey({principal,state,configuration,query:'cache'});
  const result=await cache.getOrLoad(key,async()=>{const sql=sourceQuery(state.generation),params=['cache',entry.k],rows=(await client.query(sql,params)).rows;queries.push({sql,params,rows});return rows;});
  assert.equal(state.generation,entry.generation);assert.equal(state.accessRevision,entry.accessRevision);assert.equal(result.lookup.status,entry.lookup);assert.deepEqual(result.rows.map(d=>d.id),entry.ids);
  for(const d of result.rows){assert.equal(d.tenant,principal.tenant);assert.ok(d.access_level<=principal.maxLevel);}
  const row={caseId:entry.id,role:entry.role,principal,state,identity,key,queries,result};reads.push(row);event('retrieval-completed',{caseId:entry.id,generation:state.generation,lookup:result.lookup.status,ids:result.rows.map(d=>d.id)});await client.query('COMMIT');event('request-committed',{caseId:entry.id});return row;
 }
 const byId=id=>cases.reads.find(c=>c.id===id);
 await retrieve(await bind(byId('v1-first')));await retrieve(await bind(byId('v1-hit')));
 const partial=await activate('incomplete',revisions.v1);assert.equal(partial.accepted,false);assert.equal(partial.after.generation,'v1');assert.deepEqual(partial.validation.missing,[missingId]);
 await insert(v2.find(d=>d.id===missingId));event('candidate-completed',{generation:'v2',loaded:12});
 const old=await bind(byId('old-overlap'));
 const accepted=await activate('complete',revisions.v1);assert.equal(accepted.accepted,true);
 const fresh=await bind(byId('new-overlap'));await retrieve(fresh);
 const oldState=await active(old.client),oldSnapshot=(await old.client.query('SELECT pg_current_snapshot()::text AS snapshot')).rows[0].snapshot;assert.deepEqual(oldState,old.state);assert.equal(oldSnapshot,old.identity.snapshot);
 event('old-snapshot-reread',{caseId:'old-overlap',state:oldState,snapshot:oldSnapshot});await retrieve(old);
 await retrieve(await bind(byId('v2-hit')));await retrieve(await bind(byId('v2-k1')));await retrieve(await bind(byId('v2-k1-hit')));
 const stale=await activate('stale-expected-pointer',revisions.v1);assert.equal(stale.accepted,false);assert.equal(stale.reason,'stale_pointer');assert.equal(stale.after.generation,'v2');
 async function resolve(entry){
  const bound=await bind(entry),{client,principal,state,identity}=bound,queries=[];let rows=[],reason='not_available';
  try{const sql=citationQuery(entry.reference.generation),params=[entry.reference.id,entry.reference.revision];rows=(await client.query(sql,params)).rows;queries.push({sql,params,rows});reason=rows.length?'resolved':'not_available';}catch(error){if(error.message!=='Unknown generation')throw error;reason='unknown_generation';}
  const resolved=rows.length===1;assert.equal(resolved,entry.resolved,entry.id);assert.equal(state.accessRevision,entry.accessRevision);for(const d of rows){assert.equal(d.tenant,principal.tenant);assert.ok(d.access_level<=principal.maxLevel);}
  citations.push({caseId:entry.id,role:entry.role,principal,state,identity,reference:entry.reference,queries,rows,resolved,reason});event('citation-resolved',{caseId:entry.id,resolved,reason,generation:entry.reference.generation});await client.query('COMMIT');event('request-committed',{caseId:entry.id});
 }
 for(const entry of cases.citations.filter(c=>c.accessRevision===1))await resolve(entry);
 await admin.query('BEGIN');const acl=(await admin.query("UPDATE document_acl SET access_level=1 WHERE tenant='alpha' AND document_key='cache' RETURNING tenant,document_key,access_level")).rows[0];const epoch=(await admin.query('UPDATE index_state SET access_revision=access_revision+1 WHERE singleton RETURNING generation,index_revision,access_revision')).rows[0];await admin.query('COMMIT');event('acl-and-epoch-committed',{acl,state:epoch});
 for(const entry of cases.reads.filter(c=>c.accessRevision===2))await retrieve(await bind(entry));
 for(const entry of cases.citations.filter(c=>c.accessRevision===2))await resolve(entry);
 const probe=await connect('alpha_reader');try{await probe.query("UPDATE index_state SET generation='v1'");throw Error('Application promoted index');}catch(error){assert.equal(error.code,'42501');probes.push({role:'alpha_reader',sql:"UPDATE index_state SET generation='v1'",code:error.code,message:error.message});}
 for(const generation of ['v1','v2']){
  const table=generationTable(generation),objects=(await admin.query(`SELECT c.relname,c.relkind,pg_relation_filepath(c.oid) AS file,pg_relation_size(c.oid)::int AS bytes,
    c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner,
    CASE WHEN c.relkind='i' THEN pg_get_indexdef(c.oid) ELSE NULL END AS definition
    FROM pg_class c WHERE c.oid=$1::regclass OR c.oid IN(SELECT indexrelid FROM pg_index WHERE indrelid=$1::regclass) ORDER BY c.relname`,[table])).rows;
  const finalDocuments=await snapshot(admin,generation);assert.equal(contentFingerprint(finalDocuments),revisions[generation]);relations.push({generation,table,objects,finalDocuments,contentHash:contentFingerprint(finalDocuments)});
 }
 return{events,reads,citations,activations,probes,relations};
});
const artifact={capturedAt:new Date().toISOString(),kind:'real_postgresql_validated_generation_activation',sourceHashes,protocol,cases,revisions,...native,events,reads,citations,activations,probes,relations};
await writeFile(new URL(native.failure?'results/updates-failed.json':'results/updates.json',root),JSON.stringify(artifact,null,2)+'\n');if(native.failure)throw Error(native.failure.message);
console.log(JSON.stringify({activations:activations.map(a=>({id:a.id,accepted:a.accepted,reason:a.reason,active:a.after.generation})),reads:reads.length,hits:reads.filter(r=>r.result.lookup.status==='hit').length,sourceReads:reads.reduce((n,r)=>n+r.queries.length,0),citations:citations.length,resolved:citations.filter(c=>c.resolved).length,events:events.length,containerRemoved:native.containerRemoved},null,2));
