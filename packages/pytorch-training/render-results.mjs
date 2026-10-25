import{readFile,writeFile}from'node:fs/promises'
import{curveChart,resumeErrors}from'./charts.mjs'
const data=JSON.parse(await readFile(new URL('comparison.json',import.meta.url)))
await writeFile(new URL('training-curves.svg',import.meta.url),curveChart(data)+'\n')
await writeFile(new URL('resume-errors.svg',import.meta.url),resumeErrors(data)+'\n')
