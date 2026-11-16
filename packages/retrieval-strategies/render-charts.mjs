import {readFile,writeFile} from 'node:fs/promises';
import {lexicalChart,denseChart,fusionChart,filterChart,multiChart,rewriteChart,evaluationChart} from './charts.mjs';
const root=new URL('.',import.meta.url),data=JSON.parse(await readFile(new URL('viewer-data.json',root)));
for(const[file,fn]of [['lexical-terms.svg',lexicalChart],['dense-evidence.svg',denseChart],['rrf-contributions.svg',fusionChart],['filter-counts.svg',filterChart],['multi-coverage.svg',multiChart],['rewrite-acceptance.svg',rewriteChart],['retriever-evidence.svg',evaluationChart]])await writeFile(new URL(file,root),fn(data));
console.log('Seven deterministic SVG figures from preserved outcomes.');
