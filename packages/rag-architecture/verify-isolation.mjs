import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {eligible,evaluateRetrieval} from './core.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f));
const capture=await json('results/isolation.json'),corpus=await json('corpus.json'),cases=await json('cases.json');
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha,file);
assert.equal(capture.containerRemoved,true);assert.match(capture.postgres,/PostgreSQL 17\./);assert.equal(capture.failure,undefined);
assert.equal(capture.requests.length,56);assert.equal(capture.probes.length,69);assert.equal(capture.plans.length,8);
const unique=new Set();
for(const request of capture.requests){
 const key=request.layout+':'+request.caseId;assert.ok(!unique.has(key));unique.add(key);
 const entry=cases.find(c=>c.id===request.caseId),principal=corpus.principals.find(p=>p.role===entry.role);
 assert.equal(request.query,entry.query);assert.deepEqual(request.goldIds,entry.goldIds);
 assert.equal(request.identity.session_user,principal.role);assert.equal(request.identity.current_user,principal.role);
 assert.equal(request.database,request.layout==='global'?'rag_global':'rag_'+principal.tenant);
 const expected=evaluateRetrieval(request.rows,entry.goldIds,corpus.documents,principal);
 for(const key of Object.keys(expected))assert.deepEqual(request[key],expected[key]);
 assert.deepEqual(expected.exposedIds,[]);assert.ok(request.rows.length<=3);
 for(const row of request.rows){const doc=corpus.documents.find(d=>d.id===row.id);assert.equal(row.body,doc.body);assert.equal(row.tenant,doc.tenant);assert.equal(row.revision,doc.revision);assert.equal(row.access_level,doc.accessLevel);}
 for(let i=1;i<request.rows.length;i++)assert.ok(request.rows[i-1].score>=request.rows[i].score);
 const pair=capture.requests.find(r=>r.layout!==request.layout&&r.caseId===request.caseId);
 assert.deepEqual(pair.rows,request.rows,'exact ts_rank in this fixture is equal across layouts');
}
for(const role of capture.roles){assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,false);assert.equal(role.rolcreaterole,false);assert.equal(role.rolcreatedb,false);assert.equal(role.rolinherit,false);}
const paths=[];
for(const db of capture.databases){
 const docs=corpus.documents.filter(d=>db.name==='rag_global'||db.name==='rag_'+d.tenant);
 assert.deepEqual(db.documentIds,docs.map(d=>d.id));assert.equal(db.relations.length,3);
 for(const relation of db.relations){assert.equal(relation.owner,'rag_admin');assert.ok(relation.bytes>0);assert.ok(!paths.includes(relation.file));paths.push(relation.file);}
 const table=db.relations.find(r=>r.relname==='documents');assert.equal(table.relrowsecurity,true);assert.equal(table.relforcerowsecurity,true);
 assert.ok(db.relations.some(r=>r.relname==='documents_terms_gin'&&r.relkind==='i'));
}
const denied=new Set(['switch-role','disable-row-security','insert-document','change-principal','foreign-database-connect']);
for(const principal of corpus.principals)for(const layout of ['global','isolated']){
 const probes=capture.probes.filter(p=>p.role===principal.role&&p.layout===layout);
 const labels=['plain-select','foreign-id','tenant-predicate','fake-tenant-setting','switch-role','disable-row-security','insert-document','change-principal',...(layout==='isolated'?['foreign-database-connect']:[])];
 assert.deepEqual(probes.map(p=>p.label),labels);
 for(const probe of probes){if(denied.has(probe.label))assert.equal(probe.code,'42501');else{assert.equal(probe.code,null);if(['foreign-id','tenant-predicate'].includes(probe.label))assert.deepEqual(probe.rows,[]);else assert.deepEqual(probe.rows.map(r=>r.id),corpus.documents.filter(d=>eligible(d,principal)).map(d=>d.id).sort());}}
}
assert.deepEqual(capture.probes.find(p=>p.label==='missing-principal').rows,[]);
const summary=['global','isolated'].map(layout=>{const rows=capture.requests.filter(r=>r.layout===layout);return{layout,requests:rows.length,nonemptyGold:rows.filter(r=>r.goldIds.length).length,emptyGold:rows.filter(r=>!r.goldIds.length).length,returnedDocuments:rows.reduce((n,r)=>n+r.rows.length,0),unexpected:rows.flatMap(r=>r.unexpectedIds).length,exposures:rows.flatMap(r=>r.exposedIds).length,meanEligibleRecall:rows.filter(r=>r.goldIds.length).reduce((n,r)=>n+r.eligibleRecallAt3,0)/rows.filter(r=>r.goldIds.length).length};});
console.log(JSON.stringify({verified:true,summary,deniedProbes:capture.probes.filter(p=>p.code==='42501').length,plans:capture.plans.map(p=>({layout:p.layout,role:p.role,root:p.plan[0].Plan['Node Type']}))},null,2));
