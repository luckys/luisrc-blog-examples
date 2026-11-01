import {readFile,writeFile} from 'node:fs/promises';import {supportChart,tailChart,latencyChart} from './charts.mjs';
const json=async f=>JSON.parse(await readFile(new URL(f,import.meta.url))),d=await json('results/observations.json'),stream=await json('results/streaming.json');
const labels={greedy:'greedy',sample:'sampling T1','temperature-half':'T 0,5','temperature-high':'T 1,5','top-k-2':'top-k 2','top-p-08':'top-p 0,8'};
const support=d.rollouts.filter(r=>r.prompt==='el equipo'&&r.samplingSeed===11).map(r=>({label:labels[r.strategyId],count:r.steps[0].kept.length}));
const event=d.rollouts.find(r=>r.prompt==='el equipo'&&r.strategyId==='temperature-high'&&r.samplingSeed===47).steps[2];
const tail=[4,1,14,13].map(id=>({token:d.vocabulary[id],base:event.modelProbabilities[id],high:event.temperatureProbabilities[id]}));
const pack={kind:'saved_generation_and_streaming_replay',vocabulary:d.vocabulary,protocol:d.protocol,rollouts:d.rollouts,controls:d.controls,qualityCapturedAt:d.capturedAt,qualityHashes:d.sourceHashes,streaming:stream,support,tail};
await writeFile(new URL('viewer-data.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');for(const[file,svg]of [['support.svg',supportChart(support)],['tail.svg',tailChart(tail)],['latency.svg',latencyChart(stream.requests)]])await writeFile(new URL(file,import.meta.url),svg);console.log('Generation replay and three figures rendered from saved traces');
