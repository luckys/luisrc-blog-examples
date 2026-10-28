import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize, tokenize, pluralStem, lemmaLookup, charNgrams, wordNgrams} from '../analysis.mjs';
import {buildIndex, bm25Contribution, search, cosineScore} from '../retrieval.mjs';
import {metrics, summarize} from '../evaluation.mjs';
import {trainBpe, applyBpe, wordPiece} from '../subwords.mjs';

test('normalization joins canonical equivalents, preserves ñ and original text',()=>{
 assert.equal(normalize('I\u0301NDICE'), 'índice');
 assert.equal(normalize('AÑO, acción, pingüino',{fold:true}), 'año, accion, pinguino');
 assert.notEqual(normalize('año',{fold:true}),normalize('ano',{fold:true}));
 assert.equal(normalize(normalize('Árbol',{fold:true}),{fold:true}),'arbol');
});
test('token boundaries expose code losses and retain negation and positions',()=>{
 assert.deepEqual(tokenize('C++ C# Node.js sin secretos año 2026'),['c','c','node','js','sin','secretos','año','2026']);
 assert.deepEqual(wordNgrams(['logs','sin','secretos'],2),['logs sin','sin secretos']);
 assert.deepEqual(charNgrams('caché',3),['cac','ach','ché']);
 assert.throws(()=>charNgrams('x',0));
});
test('limited morphology does not pretend to disambiguate or implement Snowball',()=>{
 assert.equal(pluralStem('reintentos'),'reintento');
 assert.notEqual(pluralStem('índices'),pluralStem('índice'));
 assert.equal(pluralStem('lunes'),'lun'); // a deliberate counterexample
 assert.equal(lemmaLookup('contraseñas',{'contraseñas':'contraseña'}),'contraseña');
 assert.equal(lemmaLookup('fue',{}),'fue');
});
test('BM25 hand fixture checks df, lengths, repeated query, ties and zero matches',()=>{
 const idx=buildIndex([{id:'A',title:'',body:'gato gato'},{id:'B',title:'',body:'gato perro'},{id:'C',title:'',body:'pez'}]);
 assert.equal(idx.df.get('gato'),2); assert.equal(idx.avgLength,5/3);
 const expected=Math.log(1+1.5/2.5)*2*2.2/(2+1.2*(.25+.75*2/(5/3)));
 assert.ok(Math.abs(bm25Contribution(2,2,3,2,5/3,1.2,.75)-expected)<1e-14);
 const rows=search(idx,'gato'); assert.equal(rows[0].id,'A');
 assert.ok(Math.abs(rows[0].score-expected)<1e-14);
 assert.deepEqual(search(idx,'gato gato'),rows); assert.deepEqual(search(idx,'zorro'),[]);
 assert.deepEqual(search(buildIndex([{id:'B',body:'gato'},{id:'A',body:'gato'}]),'gato').map(r=>r.id),['A','B']);
 assert.throws(()=>search(idx,'gato',{b:2})); assert.throws(()=>buildIndex([]));
 assert.throws(()=>buildIndex([{id:'X',body:'a'},{id:'X',body:'b'}]));
});
test('TF-IDF cosine hand calculation and vocabulary policy',()=>{
 const idx=buildIndex([{id:'A',body:'gato gato'},{id:'B',body:'gato perro'}]);
 assert.ok(Math.abs(cosineScore(idx,'A',['gato'])-1)<1e-14);
 const idf=1+Math.log(3/2);
 assert.ok(Math.abs(cosineScore(idx,'B',['gato'])-1/Math.sqrt(1+idf**2))<1e-14);
 assert.equal(cosineScore(idx,'A',['zorro']),0);
 assert.equal(cosineScore(idx,'A',['gato','zorro']),1);
});
test('retrieval explanations equal totals; inverted OR matches exhaustive reference',()=>{
 const idx=buildIndex([{id:'A',body:'red red datos'},{id:'B',body:'datos'}, {id:'C',body:'red caché'}]);
 const rows=search(idx,'red datos');
 for(const row of rows)assert.ok(Math.abs(row.score-row.terms.reduce((s,t)=>s+t.contribution,0))<1e-14);
 const expected=idx.documents.map(d=>({id:d.id,score:['red','datos'].reduce((s,t)=>{
 const tf=d.counts.get(t)??0,df=idx.documents.filter(x=>x.counts.has(t)).length;
 return s+(tf?Math.log(1+(3-df+.5)/(df+.5))*tf*2.2/(tf+1.2*(.25+.75*d.length/idx.avgLength)):0);
 },0)})).sort((a,b)=>b.score-a.score||(a.id<b.id?-1:1));
 assert.deepEqual(rows.map(({id,score})=>({id,score})),expected);
});
test('metrics fixed P denominator, truncated RR, and unanswerable separated',()=>{
 assert.deepEqual(metrics([{id:'B'},{id:'A'}],['A','C'],3),{precision:1/3,recall:.5,rr:.5,hits:1});
 assert.equal(metrics([],[],3),null);
 assert.equal(metrics([{id:'B'},{id:'C'},{id:'D'},{id:'A'}],['A'],3).rr,0);
 assert.throws(()=>metrics([{id:'A'},{id:'A'}],['A'],3));
 const s=summarize([{metrics:metrics([{id:'A'}],['A'],3)},{metrics:null}]);
 assert.equal(s.answerable,1);assert.equal(s.recall,1);assert.equal(s.precision,1/3);
});
test('BPE learns by frequency, applies rank, and preserves unknown characters explicitly',()=>{
 const m=trainBpe({'ab':5,'ac':2},1);assert.deepEqual(m.merges,[['a','b']]);
 assert.deepEqual(applyBpe('abac',m.merges),['ab','a','c']);
 assert.deepEqual(applyBpe('ñ',m.merges),['ñ']); // demo alphabet fallback, not model token ID
 const m2=trainBpe({'aaa':2,'ab':1},1);assert.deepEqual(m2.merges,[['a','a']]);
 assert.deepEqual(applyBpe('aaa',m2.merges),['aa','a']);
});
test('WordPiece greedy inference is not BPE merging or substring recovery',()=>{
 const v=['bajo','##s','c','##a','##j','##o'];
 assert.deepEqual(wordPiece('bajos',v),['bajo','##s']);
 assert.deepEqual(wordPiece('cajo',v),['c','##a','##j','##o']);
 assert.deepEqual(wordPiece('bajoz',v),['[UNK]']);
 assert.deepEqual(wordPiece('',v),[]);
 assert.deepEqual(wordPiece('abc',['ab','a','##bc']),['[UNK]']); // no backtracking
});
