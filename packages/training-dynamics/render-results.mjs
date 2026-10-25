import {readFile,writeFile} from 'node:fs/promises'
import {curveChart} from './charts.mjs'
const data=JSON.parse(await readFile(new URL('comparison.json',import.meta.url)))
for(const [file,options] of Object.entries({'optimizer-curves.svg':{},'batch-curves.svg':{group:'batch',axis:'epoch'},'learning-rates.svg':{group:'schedule',metric:'lrLast'}}))await writeFile(new URL(file,import.meta.url),curveChart(data,options)+'\n')
