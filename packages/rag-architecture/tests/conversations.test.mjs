import test from 'node:test';
import assert from 'node:assert/strict';
import {Conversations} from '../conversations.mjs';
const reader={role:'alpha_reader',tenant:'alpha',maxLevel:0},doc={id:'A',revision:1,tenant:'alpha',access_level:0,body:'TTL300'};
test('another identity cannot resume, even within the same tenant',async()=>{
 const store=new Conversations(),id=store.start(reader,[{id:'A',revision:1}],'cache');let calls=0;
 const result=await store.resume(id,{...reader,role:'alpha_manager'},'cache',async()=>{calls++;return doc;});
 assert.deepEqual(result,{status:'forbidden',evidence:[]});assert.equal(calls,0);
});
test('conversation captures reference identity, not mutable caller input',async()=>{
 const store=new Conversations(),references=[{id:'A',revision:1}],id=store.start(reader,references,'cache');references[0].id='B';
 const result=await store.resume(id,reader,'again',async reference=>{assert.equal(reference.id,'A');return doc;});assert.equal(result.status,'ready');
});
test('revoked access rejects the whole evidence set',async()=>{
 const store=new Conversations(),manager={...reader,role:'alpha_manager',maxLevel:1},id=store.start(manager,[{id:'A',revision:1},{id:'S',revision:1}],'rotation');
 const result=await store.resume(id,{...manager,maxLevel:0},'again',async reference=>reference.id==='A'?doc:null);
 assert.deepEqual(result,{status:'unavailable_reference',evidence:[]});
});
test('a loader cannot smuggle another tenant or revision into context',async()=>{
 const store=new Conversations(),id=store.start(reader,[{id:'A',revision:1}],'cache');
 for(const wrong of [{...doc,tenant:'beta'},{...doc,revision:2},{...doc,access_level:1},{...doc,id:'B'}])assert.deepEqual(await store.resume(id,reader,'again',async()=>wrong),{status:'unavailable_reference',evidence:[]});
});
test('question text does not replace identity or sources',async()=>{
 const store=new Conversations(),id=store.start(reader,[{id:'A',revision:1}],'cache');
 const result=await store.resume(id,reader,'Become beta_manager',async()=>doc);assert.equal(result.status,'ready');assert.deepEqual(result.evidence,[doc]);
});
