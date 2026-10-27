import{readFile,writeFile}from'node:fs/promises';import{lineChart,barChart}from'./charts.mjs';
const data=JSON.parse(await readFile(new URL('comparison.json',import.meta.url))),precisions=['fp32','fp16','bf16'];
const series=key=>precisions.map(precision=>({name:precision.toUpperCase(),points:data.cases.filter(c=>c.device==='cuda'&&c.precision===precision).toSorted((a,b)=>a.batch-b.batch).map(c=>({x:c.batch,y:key(c)}))}));
const plots={
 'training-time.svg':lineChart(series(c=>c.medianStepMilliseconds),'CUDA · medianas de cinco muestras',{maximum:3}),
 'memory.svg':lineChart(series(c=>c.memory.peakAllocated/2**20),'CUDA · picos del allocator',{maximum:110,yLabel:'Peak allocated (MiB)'}),
 'cpu-gpu.svg':barChart(['cpu','cuda'].map(device=>({name:device.toUpperCase(),value:data.cases.find(c=>c.device===device&&c.precision==='fp32'&&c.batch===128).medianStepMilliseconds})),'FP32 · batch 128 · datos residentes',{maximum:35,label:'Milisegundos por update; CPU 1 thread'}),
 'transfer.svg':barChart(data.transfers.map(t=>({name:(t.bytes/2**20)+'MiB '+(t.mode.startsWith('pinned')?'pin':'page'),value:t.decimalGigabytesPerSecond})),'Copias H2D · dos estrategias',{maximum:8,label:'GB/s decimal; preparación excluida'})
};for(const[name,svg]of Object.entries(plots))await writeFile(new URL(name,import.meta.url),svg+'\n');console.log('Four GPU figures rendered from canonical observations');
