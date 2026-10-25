import{readFile,writeFile}from'node:fs/promises'
import{errorChart,gradientChart}from'./charts.mjs'
const d=JSON.parse(await readFile('comparison.json'))
await writeFile('error-sweep.svg',errorChart(d)+'\n')
await writeFile('gradient-vector.svg',gradientChart(d)+'\n')
