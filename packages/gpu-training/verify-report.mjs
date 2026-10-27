import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createHash}from'node:crypto';
const root=new URL('.',import.meta.url),read=async file=>JSON.parse(await readFile(new URL(file,root)));
const d=await read('comparison.json');assert.deepEqual(d,await read('results/observations.json'));assert.deepEqual(d.protocol,await read('protocol.json'));
for(const[name,hash]of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(new URL(name,root))).digest('hex'),hash,name);
const median=a=>a.toSorted((x,y)=>x-y)[Math.floor(a.length/2)];
const seen=new Set();
for(const c of d.cases){const id=[c.device,c.precision,c.batch].join(':');assert.ok(!seen.has(id));seen.add(id);assert.equal(c.sampleSeconds.length,d.protocol.samples);assert.ok(c.sampleSeconds.every(v=>v>0&&Number.isFinite(v)));const med=median(c.sampleSeconds);assert.equal(c.medianStepMilliseconds,med/c.stepsPerSample*1000);assert.equal(c.examplesPerSecond,c.batch*c.stepsPerSample/med);assert.ok(Number.isFinite(c.finalLoss));if(c.device==='cuda'){assert.ok(c.memory.peakAllocated>0);assert.ok(c.memory.peakReserved>=c.memory.peakAllocated);}}
assert.equal(seen.size,12);
for(const t of d.transfers){assert.equal(t.destinationMatches,true);const med=median(t.sampleSeconds);assert.equal(t.medianCopyMilliseconds,med/t.copiesPerSample*1000);assert.equal(t.decimalGigabytesPerSecond,t.bytes*t.copiesPerSample/med/1e9);}
assert.ok(d.controls.accumulation.weightedUpdateError<1e-6);assert.ok(d.controls.accumulation.unweightedUpdateError>1e-6);
assert.equal(d.controls.determinism.sameLosses,true);assert.equal(d.controls.determinism.maximumWeightDifference,0);
assert.ok(d.controls.precision.every(p=>p.finite));
const trace=await read('results/profiler-trace.json'),kernels=trace.traceEvents.filter(e=>e.cat==='kernel');assert.equal(kernels.length,d.profiler.kernelEvents);assert.equal(kernels.reduce((sum,e)=>sum+e.dur,0),d.profiler.kernelMicroseconds);assert.ok(kernels.length>0);
console.log('12 real CPU/CUDA cases, samples, memory, transfers, controls, profiler and source hashes verified; timings are observations, not deterministic constants');
