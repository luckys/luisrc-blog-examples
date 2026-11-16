import {semanticChart,overlapChart,retrievalChart} from './chunk-charts.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {extractionChart,confidenceChart,layoutChart,dedupChart,budgetChart} from './charts.mjs';
const root=new URL('.',import.meta.url),capture=JSON.parse(await readFile(new URL('results/extraction.json',root))),derived=JSON.parse(await readFile(new URL('results/ocr-words.json',root))),ledger=JSON.parse(await readFile(new URL('results/ledger.json',root))),preflight=JSON.parse(await readFile(new URL('results/token-preflight.json',root)));
for(const [file,svg]of [['extraction-counts.svg',extractionChart(capture)],['ocr-confidence.svg',confidenceChart(derived.words)],['layout-order.svg',layoutChart(capture)],['dedup-groups.svg',dedupChart(ledger)],['window-budgets.svg',budgetChart(preflight)]])await writeFile(new URL(file,root),svg);
console.log('Five deterministic figures from saved extraction outputs.');

const chunking=JSON.parse(await readFile(new URL('results/chunking.json',root))),retrieval=JSON.parse(await readFile(new URL('results/retrieval.json',root)));
for(const [file,svg]of [['semantic-boundaries.svg',semanticChart(chunking)],['overlap-cost.svg',overlapChart(chunking)],['retrieval-evidence.svg',retrievalChart(retrieval)]])await writeFile(new URL(file,root),svg);
console.log('Three additional figures from all saved chunking/retrieval outcomes.');
