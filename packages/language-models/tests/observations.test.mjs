import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {fitVocabulary,encode,teacherForce,encodePrefix} from '../tokenizer.mjs';
const json=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url)));
const d=await json('results/observations.json'),data=await json('tokenized.json'),corpus=await json('corpus.json'),protocol=await json('protocol.json');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b)),a+' vs '+b);
test('training sources frozen and tokenized data derives train-only vocabulary',async()=>{
 for(const [file,hash] of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex'),hash);
 assert.deepEqual(data.vocabulary,fitVocabulary(corpus));assert.deepEqual(d.vocabulary,data.vocabulary);assert.deepEqual(d.protocol,protocol);
 for(const [i,r] of corpus.entries()){assert.deepEqual(data.records[i].ids,encode(r.text,data.vocabulary));assert.deepEqual(data.records[i].input,teacherForce(data.records[i].ids).input);assert.deepEqual(data.records[i].target,teacherForce(data.records[i].ids).target);}
 assert.deepEqual(data.probes,protocol.probes.map(text=>({text,ids:encodePrefix(text,data.vocabulary)})));
});
test('all three trained models retain complete probabilities and next-token losses',()=>{
 assert.deepEqual(d.runs.map(r=>r.seed),[7,19,31]);
 for(const run of d.runs){assert.equal(run.parameterCount,3205);assert.equal(run.parameters.reduce((s,p)=>s+p.count,0),3205);assert.equal(run.loss.length,301);assert.ok(run.loss.at(-1)<run.loss[0]);assert.equal(run.predictions.length,72);
 for(const row of run.predictions){const record=data.records.find(r=>r.id===row.id);assert.deepEqual(row.target,record.target);assert.equal(row.logits.length,7);
  for(let t=0;t<row.logits.length;t++){const logits=row.logits[t],p=row.probabilities[t],max=Math.max(...logits),sum=logits.reduce((s,z)=>s+Math.exp(z-max),0);assert.equal(p.length,21);close(p.reduce((s,z)=>s+z,0),1);for(let k=0;k<21;k++)close(p[k],Math.exp(logits[k]-max)/sum);close(row.tokenNll[t],max+Math.log(sum)-logits[row.target[t]]);}
 }
 for(const split of ['train','dev','test']){const rows=run.predictions.filter(r=>r.split===split),nll=rows.flatMap(r=>r.tokenNll),correct=rows.flatMap(r=>r.correct),m=run.metrics[split];assert.equal(m.tokens,split==='train'?308:98);close(m.nll,nll.reduce((s,x)=>s+x,0)/nll.length);close(m.perplexity,Math.exp(m.nll));close(m.accuracy,correct.filter(Boolean).length/correct.length);}
 for(const probe of run.probes){close(probe.probabilities.reduce((s,p)=>s+p,0),1);assert.equal(probe.logits.length,21);}
 assert.equal(run.causality.causalPrefixMaxDifference,0);assert.ok(run.causality.unmaskedPrefixMaxDifference>1e-8);
 }
});
