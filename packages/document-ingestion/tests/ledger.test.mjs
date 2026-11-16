import test from 'node:test';
import assert from 'node:assert/strict';
import {createRepresentation,duplicateGroups,nearSimilarity,wordWindows} from '../ledger.mjs';
import {resolveRange} from '../ranges.mjs';
const input={id:'A',file:'a.txt',kind:'text',role:'corpus',selection:'decoded-text',documentVersion:'0'.repeat(64)};
const parts=[{text:'año',origin:{kind:'text',start:0,end:4}},{text:'🧭',origin:{kind:'text',start:5,end:7}},{text:'fin',origin:{kind:'text',start:8,end:11}}];
test('canonical UTF16 spans survive NFC length change and do not split surrogate pairs',()=>{
 const doc=createRepresentation(input,parts);
 assert.equal(doc.text,'año 🧭 fin');assert.deepEqual(doc.units.map(u=>[u.start,u.end]),[[0,3],[4,6],[7,10]]);
 const quote=resolveRange(doc,4,6);assert.equal(quote.text,'🧭');assert.deepEqual(quote.references[0].origin,{kind:'text',start:5,end:7});
 assert.throws(()=>resolveRange(doc,5,6));assert.throws(()=>resolveRange(doc,3,3));assert.throws(()=>resolveRange(doc,-1,4));
});
test('stable ID,input version,representation version and normalized content are separate',()=>{
 const a=createRepresentation(input,parts),again=createRepresentation(input,parts),b=createRepresentation({...input,documentVersion:'1'.repeat(64)},parts),copy=createRepresentation({...input,id:'COPY'},parts);
 assert.equal(a.representationId,again.representationId);assert.notEqual(a.representationId,b.representationId);assert.equal(a.contentHash,b.contentHash);assert.notEqual(a.representationId,copy.representationId);
 const groups=duplicateGroups([a,copy],'contentHash');assert.equal(groups.length,1);assert.equal(groups[0].aliases.length,2);assert.equal(groups[0].representativeId,'A');
 assert.equal(duplicateGroups([a,{...copy,role:'other'}],'contentHash').length,2);
});
test('near similarity preserves a high-overlap numeric or negation counterexample for review',()=>{
 assert.ok(nearSimilarity('TTL300 No almacenar errores','TTL301 No almacenar errores')>=.5);
 assert.ok(nearSimilarity('No almacenar errores','Sí almacenar errores')>=.5);
 assert.equal(nearSimilarity('🧭','😀'),null);
});
test('size windows cover every unit once,keep tail and change IDs with source version',()=>{
 const a=createRepresentation(input,parts),windows=wordWindows(a,2);
 assert.deepEqual(windows.map(w=>[w.first,w.last,w.start,w.end,w.text]),[[0,2,0,6,'año 🧭'],[2,3,7,10,'fin']]);
 assert.equal(windows[0].id,wordWindows(a,2)[0].id);
 assert.notEqual(windows[0].id,wordWindows(createRepresentation({...input,documentVersion:'2'.repeat(64)},parts),2)[0].id);
 assert.throws(()=>wordWindows(a,0));assert.throws(()=>wordWindows(a,1.5));
});
