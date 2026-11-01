import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {experiment} from './experiment.mjs';
const load=async f=>JSON.parse(await readFile(new URL(f,import.meta.url)));
const corpus=await load('corpus.json'),protocol=await load('protocol.json');
const files=['corpus.json','protocol.json','spans.mjs','model.mjs','experiment.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,import.meta.url))).digest('hex')])));
const result={kind:'synthetic_span_ner_training',capturedAt:new Date().toISOString(),runtime:{node:process.version,icu:process.versions.icu,unicode:process.versions.unicode},sourceHashes,protocol,...experiment(corpus,protocol)};
await mkdir(new URL('./results/',import.meta.url),{recursive:true});await writeFile(new URL('results/training.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.variants.map(v=>({id:v.id,initialLoss:v.model?.loss[0],finalLoss:v.model?.loss.at(-1),test:v.metrics.test})),null,2));
