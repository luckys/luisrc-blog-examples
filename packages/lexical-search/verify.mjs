import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {inputs} from './exercise.mjs';
import {experiment} from './experiments.mjs';
const reference=JSON.parse(await readFile('results/observations.json'));
assert.deepEqual(reference,JSON.parse(await readFile('comparison.json')));
const {sourceHashes,json}=await inputs();assert.deepEqual(sourceHashes,reference.sourceHashes);
assert.deepEqual(json['protocol.json'],reference.protocol);
assert.deepEqual(json['corpus.json'],reference.corpus);assert.deepEqual(json['queries.json'],reference.queries);
assert.deepEqual(json['lexicon.json'],reference.lexicon);
const actual=experiment(reference.corpus,reference.queries,reference.lexicon,reference.protocol);
function compare(a,b,path='') {
 if(typeof a==='number'){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=1e-12,`${path}: ${a} != ${b}`);return;}
 if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),path);for(const k of Object.keys(a))compare(a[k],b[k],path+'.'+k);return;}
 assert.equal(a,b,path);
}
for(const key of Object.keys(actual))compare(actual[key],reference[key],key);
console.log('Recomputed 120 rankings, metrics, score explanations, normalization and subword traces; nine source hashes verified.');
