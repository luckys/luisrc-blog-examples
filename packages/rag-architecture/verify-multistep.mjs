import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {retrieveInSteps} from './multistep.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f));
const capture=await json('results/multistep.json'),cases=await json('multistep-cases.json'),corpus=await json('corpus.json');
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha,file);
assert.equal(capture.failure,undefined);assert.equal(capture.containerRemoved,true);assert.equal(cases.length,44);assert.deepEqual(capture.value,{rows:capture.rows});assert.equal(capture.rows.length,cases.length);
for(const role of capture.roles){assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,false);}
const unique=new Set();
for(const entry of cases){
 const row=capture.rows.find(r=>r.caseId===entry.id);assert.ok(row);assert.ok(!unique.has(row.caseId));unique.add(row.caseId);
 const principal=corpus.principals.find(p=>p.role===entry.role);assert.deepEqual(row.principal,principal);assert.equal(row.identity.session_user,entry.role);assert.equal(row.identity.current_user,entry.role);
 let cursor=0;
 const replay=await retrieveInSteps({...entry,principal,
  search:async(query,k)=>{const saved=row.queries[cursor++];assert.equal(saved.kind,'search');assert.deepEqual(saved.params,[query,k]);assert.equal(saved.sql,(await read('search.sql')).toString());return saved.rows;},
  loadReference:async id=>{const saved=row.queries[cursor++];assert.equal(saved.kind,'reference');assert.deepEqual(saved.params,[id]);assert.equal(saved.sql,'SELECT id,tenant,document_key,revision,access_level,body FROM documents WHERE id=$1');return saved.rows[0]??null;},
 });
 assert.equal(cursor,row.queries.length);assert.deepEqual(replay,row.result);assert.equal(row.result.stop,entry.expectedStop);assert.equal(row.result.calls,row.queries.length);assert.ok(row.result.calls<=entry.maxCalls);assert.ok(row.result.documents.length<=entry.maxSources);
 for(const query of row.queries)for(const document of query.rows){const original=corpus.documents.find(d=>d.id===document.id);assert.ok(original);assert.equal(document.tenant,principal.tenant);assert.ok(document.access_level<=principal.maxLevel);assert.equal(document.body,original.body);assert.equal(document.revision,original.revision);}
 const gold=corpus.documents.filter(d=>d.tenant===principal.tenant&&d.accessLevel<=principal.maxLevel&&entry.requiredKeys.includes(d.key)).map(d=>d.id);assert.deepEqual(entry.goldAuthorizedIds,gold);
 const ids=new Set(row.result.documents.map(d=>d.id));assert.equal(row.coverage,gold.length?gold.filter(id=>ids.has(id)).length/gold.length:null);assert.deepEqual(row.exposedIds,[]);
 if(entry.kind==='cycle')assert.ok(row.result.trace.some(t=>t.reason==='already_seen'));
 if(entry.kind==='foreign-reference')assert.equal(row.queries[1].rows.length,0);
}
const stops=Object.fromEntries([...new Set(capture.rows.map(r=>r.result.stop))].map(stop=>[stop,capture.rows.filter(r=>r.result.stop===stop).length]));
assert.deepEqual(stops,{call_budget:12,requirements_met:10,no_progress:14,no_results:4,source_budget:4});
console.log(JSON.stringify({verified:true,workflows:capture.rows.length,sourceCalls:capture.rows.reduce((n,r)=>n+r.result.calls,0),stops},null,2));
