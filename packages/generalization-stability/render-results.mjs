import{readFile,writeFile}from'node:fs/promises'
import{curvesChart,fitChart,biasChart,clippingChart}from'./charts.mjs'
const data=JSON.parse(await readFile(new URL('comparison.json',import.meta.url))),run=data.runs.find(r=>r.id==='baseline-7')
for(const[file,svg]of Object.entries({'overfit-curves.svg':curvesChart(run),'overfit-functions.svg':fitChart(data,run,'last'),'bias-variance.svg':biasChart(data),'clipping-curves.svg':clippingChart(data)}))await writeFile(new URL(file,import.meta.url),svg+'\n')
