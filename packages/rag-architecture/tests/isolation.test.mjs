import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {eligible,evaluateRetrieval} from '../core.mjs';
const root=new URL('../',import.meta.url);
const corpus=JSON.parse(await readFile(new URL('corpus.json',root)));
const cases=JSON.parse(await readFile(new URL('cases.json',root)));
const reader=corpus.principals.find(p=>p.role==='alpha_reader');
const manager=corpus.principals.find(p=>p.role==='alpha_manager');
test('tenant isolation holds even for a manager',()=>{
 assert.equal(eligible(corpus.documents.find(d=>d.id==='beta-retention-v1'),manager),false);
});
test('same tenant does not imply access to restricted documents',()=>{
 const secret=corpus.documents.find(d=>d.id==='alpha-rotation-v1');
 assert.equal(eligible(secret,reader),false); assert.equal(eligible(secret,manager),true);
});
test('gold is explicit, nonempty only for eligible documents and includes negatives',()=>{
 assert.equal(cases.length,28);
 for(const entry of cases){
  const principal=corpus.principals.find(p=>p.role===entry.role);
  for(const id of entry.goldIds) assert.equal(eligible(corpus.documents.find(d=>d.id===id),principal),true);
 }
 assert.equal(cases.filter(c=>c.query==='telescopio').every(c=>c.goldIds.length===0),true);
 assert.equal(cases.find(c=>c.role==='alpha_manager'&&c.query==='orquidea').goldIds.length,0);
});
test('relevance success never cancels an exposure',()=>{
 const result=evaluateRetrieval([{id:'alpha-retention-v1'},{id:'beta-retention-v1'}],['alpha-retention-v1'],corpus.documents,reader);
 assert.equal(result.eligibleRecallAt3,1); assert.deepEqual(result.exposedIds,['beta-retention-v1']);
});
test('empty gold has no recall denominator; an unknown returned ID is exposed',()=>{
 const result=evaluateRetrieval([{id:'invented'}],[],corpus.documents,reader);
 assert.equal(result.eligibleRecallAt3,null); assert.deepEqual(result.exposedIds,['invented']);
});
test('duplicate rows do not inflate recall',()=>{
 assert.throws(()=>evaluateRetrieval([{id:'alpha-cache-v1'},{id:'alpha-cache-v1'}],['alpha-cache-v1'],corpus.documents,reader),/Duplicate/);
});
