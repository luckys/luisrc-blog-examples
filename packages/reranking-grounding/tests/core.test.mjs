import test from 'node:test';
import assert from 'node:assert/strict';
import {rerankCandidates,selectEvidence,parseAnswer,citationFor,sourceLink,resolveSource} from '../core.mjs';
import {createRepresentation} from '../../document-ingestion/ledger.mjs';
test('reranking cannot add a candidate beyond its incoming budget',()=>{
 const original=[{id:'a'},{id:'b'},{id:'c'}],scores=new Map([['Q:a',1],['Q:b',2],['Q:c',100]]);assert.deepEqual(rerankCandidates(original,'Q',scores,2).map(r=>r.id),['b','a']);assert.deepEqual(rerankCandidates([], 'Q',scores,2),[]);assert.throws(()=>rerankCandidates(original,'Q',new Map(),1));
});
test('whole chunk selection respects rendered context and can skip an oversized candidate',()=>{
 const registry=[{id:'a',alias:'S01',text:'larga'.repeat(20)},{id:'b',alias:'S02',text:'breve'},{id:'c',alias:'S03',text:'otra'}],selected=selectEvidence(registry,registry,{maxChunks:1,tokenBudget:15},text=>text.length);assert.deepEqual(selected.selected.map(c=>c.id),['b']);assert.equal(selected.skipped[0].reason,'token_budget');assert.equal(selected.skipped[1].reason,'chunk_limit');assert.ok(selected.tokens<=15);
});
test('parser only accepts its declared envelopes and keeps format failure separate from abstention',()=>{
 const answer='{"estado":"sin_respuesta","afirmaciones":[]}';assert.equal(parseAnswer(answer).value.estado,'sin_respuesta');assert.equal(parseAnswer('```json\n'+answer+'\n```').envelope,'fenced_json');assert.equal(parseAnswer('Texto '+answer).ok,false);assert.equal(parseAnswer('{"estado":"respuesta","afirmaciones":[]}').ok,false);assert.equal(parseAnswer('{"estado":"sin_respuesta","afirmaciones":[],"extra":1}').ok,false);
});
test('citation existence,context eligibility,versions and exact ranges are separate checks',()=>{
 const document=createRepresentation({id:'D',file:'x.txt',kind:'text',role:'corpus',selection:'all',documentVersion:'a'.repeat(64)},[{text:'año',origin:{kind:'text'}},{text:'🧭',origin:{kind:'text'}}]),chunk={id:'c',alias:'S01',documentId:'D',documentVersion:document.documentVersion,representationId:document.representationId,start:0,end:document.text.length,text:document.text};
 assert.equal(citationFor('S99',[chunk],[chunk]).valid,false);assert.equal(citationFor('S01',[],[chunk]).reason,'outside_provided_context');const citation=citationFor('S01',[chunk],[chunk]),params=new URLSearchParams(sourceLink(citation).split('#')[1]);assert.equal(resolveSource(params,[document],[chunk]).quote.text,'año 🧭');params.set('version','stale');assert.throws(()=>resolveSource(params,[document],[chunk]));params.set('version',chunk.documentVersion);params.set('end','5');assert.throws(()=>resolveSource(params,[document],[chunk]));
});
