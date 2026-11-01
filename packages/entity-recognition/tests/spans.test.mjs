import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {tokensOf,validateRecord,toBio,fromBio} from '../spans.mjs';
const corpus=JSON.parse(await readFile(new URL('../corpus.json',import.meta.url)));
test('32 original documents validate and round trip through strict BIO',()=>{
 assert.equal(corpus.length,32);
 for(const r of corpus){validateRecord(r);assert.deepEqual(fromBio(tokensOf(r.text),toBio(r)),r.spans.map(({text,...s})=>s));}
 assert.deepEqual(['train','dev','test'].map(s=>corpus.filter(r=>r.split===s).length),[16,8,8]);
});
test('offsets count code points, not UTF-16 units or graphemes',()=>{
 const r={text:'😀 Ana',spans:[{start:2,end:5,label:'PER',text:'Ana'}]};validateRecord(r);
 assert.equal(r.text.slice(2,5),' An');assert.equal(Array.from(r.text).slice(2,5).join(''),'Ana');
 const t=tokensOf('👩🏽‍💻 Jose\u0301');assert.equal(t.at(-1).text,'Jose\u0301');assert.equal(t.at(-1).end-t.at(-1).start,5);
});
test('reject stale text, overlap, bad bounds, partial tokens and bad labels',()=>{
 for(const spans of [[{start:0,end:3,label:'PER',text:'Eva'}],[{start:0,end:2,label:'PER',text:'An'}],[{start:0,end:3,label:'LOC',text:'Ana'}],[{start:-1,end:3,label:'PER',text:'Ana'}],[{start:0,end:3,label:'PER',text:'Ana'},{start:0,end:3,label:'ORG',text:'Ana'}]])assert.throws(()=>validateRecord({text:'Ana',spans}));
 assert.throws(()=>validateRecord({text:'\ud800',spans:[]}));
});
test('adjacent same-type names start with B each, not one merged mention',()=>{
 const r={text:'Ana Eva',spans:[{start:0,end:3,label:'PER',text:'Ana'},{start:4,end:7,label:'PER',text:'Eva'}]};
 assert.deepEqual(toBio(r),['B-PER','B-PER']);assert.equal(fromBio(tokensOf(r.text),toBio(r)).length,2);
});
test('strict decoder rejects illegal I, mixed types and missing labels',()=>{
 const t=tokensOf('Ana Ruiz');for(const labels of [['I-PER','O'],['B-PER','I-ORG'],['O'],['B-LOC','O']])assert.throws(()=>fromBio(t,labels));
 assert.deepEqual(fromBio(t,['O','O']),[]);
});
test('negative records stay entirely O; split text is unique',()=>{
 assert.equal(new Set(corpus.map(r=>r.text)).size,32);
 for(const split of ['train','dev','test']){
 const rows=corpus.filter(r=>r.split===split && !r.spans.length);assert.equal(rows.length,2);
 for(const r of rows)assert.ok(toBio(r).every(x=>x==='O'));
 }
});
