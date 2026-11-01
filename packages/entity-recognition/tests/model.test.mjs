import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {metrics,decode,fit,predict,rulesFrom,matchRules} from '../model.mjs';
import {tokensOf,fromBio} from '../spans.mjs';
const corpus=JSON.parse(await readFile(new URL('../corpus.json',import.meta.url)));
test('exact entity evaluation counts wrong boundary as FP and FN',()=>{
 const rows=[{id:'X',spans:[{start:0,end:9,label:'PER'}]}];
 const r=metrics(rows,[{id:'X',spans:[{start:0,end:3,label:'PER'}]}]);
 assert.deepEqual([r.tp,r.fp,r.fn,r.precision,r.recall,r.f1],[0,1,1,0,0,0]);
 assert.equal(metrics([{id:'X',spans:[]}],[{id:'X',spans:[]}]).f1,null);
});
test('same span wrong type is not a match; documents never share entities',()=>{
 const gold=[{id:'A',spans:[{start:0,end:3,label:'PER'}]},{id:'B',spans:[]}];
 assert.equal(metrics(gold,[{id:'A',spans:[{start:0,end:3,label:'ORG'}]},{id:'B',spans:[{start:0,end:3,label:'PER'}]}]).tp,0);
 assert.throws(()=>metrics(gold,[{id:'A',spans:[]}]));
});
test('constrained decoder globally chooses best legal BIO path',()=>{
 const labels=decode([[1,0,10,0,0],[0,0,9,0,0]]);
 assert.deepEqual(labels,['B-PER','I-PER']);
 assert.doesNotThrow(()=>fromBio(tokensOf('Ana Ruiz'),labels));
});
test('fit and rules only use train; no vocabulary contamination from test',()=>{
 const model=fit(corpus,{seed:7,epochs:2,learningRate:.05});
 const changed=corpus.map(r=>r.split==='train'?r:{...r,text:'UNSEENTESTTOKEN',spans:[]});
 assert.deepEqual(fit(changed,{seed:7,epochs:2,learningRate:.05}),model);
 assert.deepEqual(rulesFrom(changed),rulesFrom(corpus));
 assert.ok(!model.features.some(x=>x.includes('unseentesttoken')));
 assert.deepEqual(predict(model,corpus.at(-1).text),predict(model,corpus.at(-1).text));
});
test('actual fitting reduces train cross entropy, deterministic by seed',()=>{
 const model=fit(corpus,{seed:7,epochs:80,learningRate:.05});
 assert.ok(model.loss.at(-1)<model.loss[0]);
 assert.deepEqual(fit(corpus,{seed:7,epochs:80,learningRate:.05}),model);
 for(const r of corpus)assert.doesNotThrow(()=>fromBio(tokensOf(r.text),predict(model,r.text).labels));
});
test('gazetteer uses full-token mentions and train labels, preserving Alba ambiguity',()=>{
 const rules=rulesFrom(corpus);
 assert.deepEqual(matchRules(rules,'Alba trabaja'),[{start:0,end:4,label:'ORG'}]);
 assert.deepEqual(matchRules(rules,'Albarrán trabaja'),[]);
 assert.deepEqual(matchRules(rules,'Ana Torres llamó'),[{start:0,end:10,label:'PER'}]);
});
