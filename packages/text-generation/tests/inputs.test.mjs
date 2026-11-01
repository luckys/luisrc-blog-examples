import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {encodePrefix} from '../../language-models/tokenizer.mjs';
const load=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url))),p=await load('protocol.json'),inputs=await load('inputs.json');
test('generation: predeclared 36 contrasts and upstream tokenizer, distinct sampling/model seeds',()=>{
 assert.equal(p.source.modelSeed,7);assert.deepEqual(p.samplingSeeds,[11,23,47]);assert.equal(p.prompts.length*p.strategies.length*p.samplingSeeds.length,36);assert.deepEqual(inputs.prompts,p.prompts.map(text=>({text,ids:encodePrefix(text,inputs.vocabulary)})));assert.equal(inputs.longPrompt.ids.length,21);assert.equal(p.streaming.warmupRequests,2);assert.equal(p.streaming.measuredRequests,5);
});
