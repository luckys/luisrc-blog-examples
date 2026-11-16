import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f));
const capture=await json('results/conversation.json'),corpus=await json('corpus.json');
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha,file);
assert.equal(capture.failure,undefined);assert.equal(capture.containerRemoved,true);assert.match(capture.postgres,/PostgreSQL 17\./);
assert.deepEqual(capture.value,{events:capture.events,cases:capture.cases});assert.equal(capture.cases.length,21);
for(const role of capture.roles){assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,false);}
for(const rule of capture.protocol.cases){const cases=capture.cases.filter(c=>c.kind===rule.kind);assert.equal(cases.length,rule.count);for(const c of cases)assert.equal(c.outcome.status,rule.expected.split(' ')[0]);}
for(const c of capture.cases){
 assert.equal(c.identity.session_user,c.role);assert.equal(c.identity.current_user,c.role);assert.equal(c.principal.role,c.role);
 if(c.outcome.status==='ready')assert.ok(c.outcome.evidence.length>0);else assert.deepEqual(c.outcome.evidence,[]);
 for(const doc of c.outcome.evidence){assert.equal(doc.tenant,c.principal.tenant);assert.ok(doc.access_level<=c.principal.maxLevel);const original=corpus.documents.find(d=>d.id===doc.id);assert.equal(doc.body,original.body);assert.equal(doc.revision,original.revision);}
 for(const load of c.loads){assert.ok(load.rows.length<=1);for(const row of load.rows){assert.equal(row.id,load.reference.id);assert.equal(row.revision,load.reference.revision);assert.equal(row.tenant,c.principal.tenant);assert.ok(row.access_level<=c.principal.maxLevel);}}
 if(['forbidden','not_found','no_evidence'].includes(c.outcome.status))assert.equal(c.loads.length,0);
 if(c.kind==='revoked-manager'){assert.equal(c.principal.maxLevel,0);assert.equal(c.principal.authorizationRevision,2);assert.deepEqual(c.loads[0].rows,[]);const event=capture.events.find(e=>e.kind==='permission-revoked'&&e.updated.role_name===c.role);assert.equal(event.updated.authorization_revision,2);}
 if(c.kind==='question-requests-other-identity'){assert.deepEqual(c.outcome.evidence.map(d=>d.id),['alpha-cache-v1']);assert.ok(c.question.includes('beta_manager'));}
}
const counts=Object.fromEntries([...new Set(capture.cases.map(c=>c.outcome.status))].map(status=>[status,capture.cases.filter(c=>c.outcome.status===status).length]));
assert.deepEqual(counts,{ready:7,forbidden:8,unavailable_reference:4,not_found:1,no_evidence:1});
console.log(JSON.stringify({verified:true,cases:capture.cases.length,counts},null,2));
