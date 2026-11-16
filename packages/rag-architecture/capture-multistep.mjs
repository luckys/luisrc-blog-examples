import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {withDatabaseFixture} from './database-fixture.mjs';
import {retrieveInSteps} from './multistep.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root));
for(const file of ['results/multistep.json','results/multistep-failed.json']){try{await access(new URL(file,root));throw Error('Preserve existing capture '+file);}catch(error){if(error.code!=='ENOENT')throw error;}}
const files=['multistep-protocol.json','multistep-cases.json','multistep.mjs','capture-multistep.mjs','database-fixture.mjs','schema.sql','search.sql','runtime.json','corpus.json','dependency-lock.capture.json'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await read(f)).digest('hex')])));
const protocol=JSON.parse(await read('multistep-protocol.json')),cases=JSON.parse(await read('multistep-cases.json')),searchSql=(await read('search.sql')).toString();
const rows=[];
const native=await withDatabaseFixture(async({connect,corpus})=>{
 const clients=new Map();for(const p of corpus.principals)clients.set(p.role,await connect(p.role));
 for(const entry of cases){
  const client=clients.get(entry.role);await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try{
   const principal=(await client.query('SELECT role_name::text AS role,tenant,max_level AS "maxLevel" FROM principals WHERE role_name=session_user')).rows[0];
   const identity=(await client.query('SELECT session_user,current_user')).rows[0];assert.equal(identity.session_user,entry.role);assert.equal(identity.current_user,entry.role);
   const queries=[];
   const result=await retrieveInSteps({...entry,principal,
    search:async(query,k)=>{const result=await client.query(searchSql,[query,k]);queries.push({kind:'search',sql:searchSql,params:[query,k],rows:result.rows});return result.rows;},
    loadReference:async id=>{const sql='SELECT id,tenant,document_key,revision,access_level,body FROM documents WHERE id=$1';const result=await client.query(sql,[id]);assert.ok(result.rows.length<=1);queries.push({kind:'reference',sql,params:[id],rows:result.rows});return result.rows[0]??null;},
   });
   assert.equal(result.stop,entry.expectedStop,entry.id);assert.equal(result.calls,queries.length);assert.ok(result.calls<=entry.maxCalls);assert.ok(result.documents.length<=entry.maxSources);
   const ids=new Set(result.documents.map(d=>d.id)),found=entry.goldAuthorizedIds.filter(id=>ids.has(id));
   const coverage=entry.goldAuthorizedIds.length?found.length/entry.goldAuthorizedIds.length:null;
   const exposedIds=result.documents.filter(d=>d.tenant!==principal.tenant||d.access_level>principal.maxLevel).map(d=>d.id);assert.deepEqual(exposedIds,[]);
   rows.push({caseId:entry.id,kind:entry.kind,role:entry.role,identity,principal,result,queries,coverage,exposedIds});await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
 }
 return{rows};
});
const artifact={capturedAt:new Date().toISOString(),kind:'real_postgresql_bounded_reference_workflows',sourceHashes,protocol,...native,rows};
await writeFile(new URL(native.failure?'results/multistep-failed.json':'results/multistep.json',root),JSON.stringify(artifact,null,2)+'\n');if(native.failure)throw Error(native.failure.message);
console.log(JSON.stringify({rows:rows.length,stops:Object.fromEntries([...new Set(rows.map(r=>r.result.stop))].map(stop=>[stop,rows.filter(r=>r.result.stop===stop).length])),sourceCalls:rows.reduce((n,r)=>n+r.result.calls,0),containerRemoved:native.containerRemoved},null,2));
