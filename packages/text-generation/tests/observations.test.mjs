import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {filtered,inverseCdf,temperatureProbabilities,topKDistribution,topPDistribution,LCG} from '../sampling.mjs';
const load=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url))),d=await load('results/observations.json');const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b)));
test('generation: all36 rollouts retain complete ordered trace and immutable sources',async()=>{
 assert.equal(d.rollouts.length,36);for(const[file,hash]of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex'),hash);
 for(const r of d.rollouts){assert.ok(Array.isArray(r.steps));assert.equal(r.steps.length,r.tokenCount);assert.deepEqual(r.steps.map(s=>s.token),r.generatedIds);assert.equal(r.reason,'eos');
  let state=r.samplingSeed>>>0;for(const[step,event]of r.steps.entries()){assert.equal(event.index,step);assert.deepEqual(event.inputIds,[...r.promptIds,...r.generatedIds.slice(0,step)]);const p=filtered(event.logits,r.strategy);p.base.forEach((v,i)=>close(v,event.modelProbabilities[i]));p.temperature.forEach((v,i)=>close(v,event.temperatureProbabilities[i]));p.selection.forEach((v,i)=>close(v,event.selectionProbabilities[i]));assert.deepEqual(p.kept,event.kept);close(p.retainedMass,event.retainedMass);if(r.strategy.mode==='sample'){state=(Math.imul(1664525,state)+1013904223)>>>0;assert.equal(event.uniform,state/2**32);assert.equal(event.token,inverseCdf(p.selection,event.uniform));}else{assert.equal(event.uniform,null);assert.equal(event.token,p.kept[0]);}}
 }
});
test('generation: surprising and unchanged outcomes retained, no best-sample selection',()=>{
 const row=(s,seed,p='el equipo')=>d.rollouts.find(r=>r.strategyId===s&&r.samplingSeed===seed&&r.prompt===p);
 assert.deepEqual(row('sample',11).generatedIds,row('temperature-half',11).generatedIds);
 assert.ok(row('temperature-high',47).generatedIds.includes(1));
 for(const seed of [11,23,47])assert.deepEqual(row('greedy',seed).generatedIds,row('greedy',11).generatedIds);
 assert.equal(d.controls.oneToken.at(-1).reason,'max_new_tokens');assert.equal(d.controls.rejectLong.inputLength,21);assert.equal(d.controls.leftTruncation[0].inputIds.length,16);
});

test('generation: edge conventions and first logits agree with original P108 checkpoint probes',async()=>{
 for(const t of [0,-1,Infinity,NaN])assert.throws(()=>temperatureProbabilities([1,2],t));
 assert.deepEqual(topKDistribution([.25,.25,.25,.25],2).kept,[0,1]);assert.deepEqual(topPDistribution([.25,.25,.25,.25],.6).kept,[0,1,2]);assert.equal(new LCG(0).next(),1013904223/2**32);assert.deepEqual(filtered([3,2,1,0],{mode:'sample',temperature:1,topK:2,topP:1}).kept,[0,1]);
 const upstream=await load('../language-models/results/observations.json'),model=upstream.runs.find(r=>r.seed===7);
 for(const r of d.rollouts){const p=model.probes.find(p=>p.text===r.prompt);r.steps[0].logits.forEach((z,i)=>close(z,p.logits[i]));}
});
