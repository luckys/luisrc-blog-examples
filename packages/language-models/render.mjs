import {readFile,writeFile} from 'node:fs/promises';import {rankDistribution} from './analysis.mjs';import {distributionChart,lossChart,nllChart} from './charts.mjs';
const load=async f=>JSON.parse(await readFile(new URL(f,import.meta.url))),d=await load('results/observations.json'),tokens=await load('tokenized.json');
const pack={kind:'saved_tiny_lm_predictions_not_live_inference',capturedAt:d.capturedAt,sourceHashes:d.sourceHashes,vocabulary:d.vocabulary,records:tokens.records,baseline:d.baseline,runs:d.runs.map(({seed,parameterCount,parameters,loss,metrics,predictions,probes,causality})=>({seed,parameterCount,parameters,loss,metrics,predictions,probes,causality}))};
await writeFile(new URL('viewer-data.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');
const probe=d.runs[0].probes.find(p=>p.text==='la ingeniera consulta los');
for(const[file,svg]of [['probabilities.svg',distributionChart(rankDistribution(d.vocabulary,probe.logits))],['loss.svg',lossChart(d.runs)],['test-nll.svg',nllChart(d.baseline,d.runs)]])await writeFile(new URL(file,import.meta.url),svg);
console.log('Viewer data and three measured figures rendered from archived runs');
