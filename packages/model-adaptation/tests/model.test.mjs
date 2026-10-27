import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{selectRun,loraBudget,predictionCounts}from'../model.mjs';
const data=JSON.parse(await readFile(new URL('../comparison.json',import.meta.url)));
test('archived predictions reproduce accuracies and confusion counts',()=>{
 for(const run of data.adaptations){assert.equal(selectRun(data,run.mode,run.seed),run);const matrix=predictionCounts(run);assert.equal(matrix.flat().reduce((a,b)=>a+b,0),256);assert.equal((matrix[0][0]+matrix[1][1])/256,run.test.accuracy);}
 assert.throws(()=>selectRun(data,'missing',7));
});
test('LoRA counts include the task head but not the frozen backbone',()=>{assert.deepEqual(loraBudget(16,8,2),{base:128,factors:48,trainable:66});assert.equal(loraBudget(8,8,1).factors,16);assert.throws(()=>loraBudget(16,8,0));});
test('no invalid source retention proxy for scratch and linear baselines',()=>{for(const run of data.adaptations){if(['scratch','linear'].includes(run.mode)){assert.equal(run.sourceMSE,null);assert.equal(run.sourceBeforeMSE,null);}else if(run.mode==='head'){assert.equal(run.sourceDeltaMSE,0);}}});
