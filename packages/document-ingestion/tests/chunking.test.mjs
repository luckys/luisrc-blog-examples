import test from 'node:test';
import assert from 'node:assert/strict';
import {sentencePieces,semanticWindows,overlapWindows,evidenceMetrics,resolveGold} from '../chunking.mjs';
import {createRepresentation} from '../ledger.mjs';
const doc=text=>createRepresentation({id:'D',file:'d.txt',kind:'text',role:'corpus',selection:'all',documentVersion:'0'.repeat(64)},text.split(' ').map((text,i)=>({text,origin:{kind:'unit',i}})));
test('sentence ends align to units and oversized pieces preserve complete coverage',()=>{
 const d=doc('Uno dos tres. Cuatro cinco.');const result=sentencePieces(d,2);
 assert.deepEqual(result.pieces.map(p=>[p.first,p.last]),[[0,2],[2,3],[3,5]]);
 assert.equal(result.pieces.map(p=>p.text).join(' '),d.text);assert.ok(result.pieces.every(p=>p.last-p.first<=2));
});
test('semantic boundaries use actual distance and budget independently',()=>{
 const d=doc('a b c d e f');const pieces=[{first:0,last:2,id:'a'},{first:2,last:4,id:'b'},{first:4,last:6,id:'c'}];
 const result=semanticWindows(d,pieces,[[1,0],[1,0],[0,1]],{budget:4,threshold:.35,profile:'test'});
 assert.deepEqual(result.chunks.map(c=>[c.first,c.last]),[[0,4],[4,6]]);
 assert.equal(result.boundaries[0].cut,false);assert.equal(result.boundaries[1].semantic,true);assert.equal(result.boundaries[1].budget,true);
});
test('overlap stops at source end,never creates a contained tail and preserves zero-overlap baseline',()=>{
 const d=doc('a b c d e f g h');assert.deepEqual(overlapWindows(d,4,2).map(c=>[c.first,c.last]),[[0,4],[2,6],[4,8]]);
 assert.deepEqual(overlapWindows(d,4,0).map(c=>[c.first,c.last]),[[0,4],[4,8]]);
 assert.throws(()=>overlapWindows(d,4,4));assert.throws(()=>overlapWindows(d,4,-1));
});
test('alternative fact evidence is not required twice and repeated context is not extra evidence',()=>{
 const a=doc('a b c d e f'),b={...a,documentId:'B',representationId:'B'};
 const queries=[{id:'Q',facts:[[{documentId:'D',quote:'a b'},{documentId:'B',quote:'a b'}],[{documentId:'D',quote:'e f'}]]}];
 const gold=resolveGold(queries,[a,b])[0];
 const chunks=[{id:'1',documentId:'D',representationId:a.representationId,first:0,last:4},{id:'2',documentId:'D',representationId:a.representationId,first:2,last:6}];
 const m=evidenceMetrics(chunks,gold,3);assert.equal(m.coverage,1);assert.equal(m.complete,true);assert.equal(m.contextRedundancy,.25);
 const stale=evidenceMetrics([{...chunks[0],representationId:'other-version'}],gold,3);assert.equal(stale.coverage,0);
 const partial=evidenceMetrics([chunks[0]],gold,3);assert.equal(partial.coverage,.5);assert.equal(partial.complete,false);
 const negative=evidenceMetrics([], {facts:[]},3);assert.equal(negative.coverage,null);assert.equal(negative.complete,null);assert.equal(negative.returned,0);
});
