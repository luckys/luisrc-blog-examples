import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {experiment} from './experiment.mjs';import {reviewErrors} from './diagnostics.mjs';
export function convergence(corpus,base,protocol){
 const runs=protocol.epochs.map(epochs=>({epochs,...experiment(corpus,{...base,plannedTraining:{...base.plannedTraining,epochs,learningRate:protocol.learningRate,seeds:protocol.seeds}})}));
 for(const run of runs)for(const v of run.variants){v.reviews=corpus.map(r=>({id:r.id,errors:reviewErrors(r.spans.map(({text,...s})=>s),v.predictions.find(p=>p.id===r.id).spans)}));}
 return {runs};
}
export async function capture(){
 const json=async f=>JSON.parse(await readFile(new URL(f,import.meta.url))),corpus=await json('corpus.json'),base=await json('protocol.json'),protocol=await json('convergence-protocol.json');
 const files=['corpus.json','protocol.json','convergence-protocol.json','spans.mjs','model.mjs','experiment.mjs','diagnostics.mjs','convergence.mjs'];
 const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,import.meta.url))).digest('hex')])));
 const data={kind:'known_synthetic_ner_convergence_contrasts',capturedAt:new Date().toISOString(),runtime:{node:process.version,icu:process.versions.icu,unicode:process.versions.unicode},protocol,sourceHashes,...convergence(corpus,base,protocol)};
 await writeFile(new URL('results/convergence.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
 for(const run of data.runs)for(const v of run.variants.filter(v=>v.model))console.log(JSON.stringify({epochs:run.epochs,seed:v.model.seed,loss:v.model.loss.at(-1),train:v.metrics.train.exact.f1,dev:v.metrics.dev.exact.f1,test:v.metrics.test.exact,accuracy:v.metrics.test.tokenAccuracy.value}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))await capture();
