import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {softmax,nextLoss,rankDistribution,visible} from '../analysis.mjs';
const d=JSON.parse(await readFile(new URL('../results/observations.json',import.meta.url)));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b)));
test('stable softmax and next-token loss, including extreme logits and bad targets',()=>{
 assert.deepEqual(softmax([1000,1000]),[.5,.5]);close(nextLoss([1000,1000],0),Math.log(2));close(nextLoss([1000,-1000],1),2000);
 for(const input of [[],[NaN],[Infinity]])assert.throws(()=>softmax(input));assert.throws(()=>nextLoss([1,2],-1));assert.throws(()=>nextLoss([1,2],2));
});
test('saved distributions and every teacher-forced loss agree with independent JS',()=>{
 for(const run of d.runs){for(const p of run.probes){const actual=softmax(p.logits);actual.forEach((v,i)=>close(v,p.probabilities[i]));const ranked=rankDistribution(d.vocabulary,p.logits);assert.equal(ranked.length,21);assert.equal(new Set(ranked.map(r=>r.id)).size,21);}
 for(const row of run.predictions)row.logits.forEach((z,i)=>close(nextLoss(z,row.target[i]),row.tokenNll[i]));}
});
test('visibility distinguishes causal, bidirectional and cross attention without claiming MLM training',()=>{
 assert.equal(visible('causal',2,3),false);assert.equal(visible('causal',2,2),true);assert.equal(visible('encoder',0,5),true);assert.equal(visible('cross',0,5),true);assert.throws(()=>visible('unknown',0,0));assert.throws(()=>visible('causal',-1,0));
});
