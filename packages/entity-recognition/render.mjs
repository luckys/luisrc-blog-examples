import {readFile,writeFile} from 'node:fs/promises';import {lossChart,f1Chart} from './charts.mjs';
const load=async f=>JSON.parse(await readFile(new URL(f,import.meta.url))),initial=await load('results/training.json'),additional=await load('results/convergence.json');
const variants=[{...initial.variants[0],id:'gazetteer'},...initial.variants.slice(1).map(v=>({...v,id:'80-'+v.model.seed})),...additional.runs.flatMap(r=>r.variants.filter(v=>v.model).map(v=>({...v,id:r.epochs+'-'+v.model.seed})))];
const pack={kind:'saved_predictions_not_live_inference',capturedAt:additional.capturedAt,caveat:additional.protocol.evaluationCaveat,sourceHashes:additional.sourceHashes,variants:variants.map(v=>({id:v.id,seed:v.model?.seed??null,epochs:v.model?.epochs??null,loss:v.model?.loss??null,metrics:v.metrics,predictions:v.predictions.map(({id,spans,labels})=>({id,spans,...(labels?{labels}: {})})),reviews:v.reviews??null}))};
await writeFile(new URL('observations.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');
await writeFile(new URL('loss.svg',import.meta.url),lossChart(pack.variants.find(v=>v.id==='1600-7').loss));
await writeFile(new URL('f1.svg',import.meta.url),f1Chart(['80-7','800-7','1600-7'].map(id=>pack.variants.find(v=>v.id===id))));
console.log('Saved prediction pack and two measured SVG charts rendered');
