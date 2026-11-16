import test from 'node:test';
import assert from 'node:assert/strict';
import {cosine,denseRanking,reciprocalRankFusion,filterTopK,guardedRewrite} from '../ranking.mjs';
test('dense cosine orders exact neighbors,keeps negative scores and deterministic ties',()=>{
 assert.equal(cosine([1,0],[3,0]),1);assert.equal(cosine([1,0],[0,1]),0);
 assert.deepEqual(denseRanking([1,0],[{id:'c',vector:[-1,0]},{id:'b',vector:[0,1]},{id:'a',vector:[0,2]}]).map(r=>r.id),['a','b','c']);
 assert.throws(()=>cosine([0,0],[1,0]));assert.throws(()=>cosine([1],[1,2]));
});
test('RRF ignores score scale but records1based ranks,window and missing contribution',()=>{
 const lists=[[{id:'a',score:1000},{id:'b',score:2}],[{id:'b',score:.8},{id:'c',score:.7}]],result=reciprocalRankFusion(lists,{constant:60,window:2});
 assert.equal(result[0].id,'b');assert.equal(result[0].score,1/62+1/61);assert.deepEqual(result[0].contributions.map(c=>c.rank),[2,1]);
 assert.deepEqual(reciprocalRankFusion(lists.map(list=>list.map(r=>({...r,score:1}))),{window:2}),result);
 assert.deepEqual(reciprocalRankFusion(lists,{window:1}).map(r=>r.id),['a','b']);assert.throws(()=>reciprocalRankFusion([[{id:'a'},{id:'a'}]]));
});
test('filtering before topk can fill from deeper candidates,after topk never refills',()=>{
 const ranks=['a','b','c','d'].map((id,i)=>({id,score:4-i})),metadata=ranks.map((r,i)=>({...r,documentId:i%2?'B':'A'})),filter={field:'documentId',value:'B'};
 assert.deepEqual(filterTopK(ranks,metadata,filter,2,'before').map(r=>r.id),['b','d']);assert.deepEqual(filterTopK(ranks,metadata,filter,2,'after').map(r=>r.id),['b']);
 assert.deepEqual(filterTopK(ranks,metadata,{field:'documentId',value:'missing'},2),[]);
});
test('protected literal tokens catch deletion but cannot prove preserved intention',()=>{
 const rejected=guardedRewrite('checksum no coincide','checksum coincide',['checksum','no']);assert.equal(rejected.accepted,false);assert.deepEqual(rejected.missing,['no']);assert.equal(rejected.text,'checksum no coincide');
 assert.equal(guardedRewrite('¿Se guarda un error del origen?','origen error guardar siempre',['origen','error']).accepted,true);
 assert.equal(guardedRewrite('TTL inicial','ttl inicial',['TTL']).accepted,true);
});
