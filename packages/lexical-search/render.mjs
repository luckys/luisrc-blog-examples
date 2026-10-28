import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {bars} from './charts.mjs';
process.chdir(fileURLToPath(new URL('.',import.meta.url)));
const d=JSON.parse(await readFile('comparison.json'));
await writeFile('test-recall.svg',bars('Recall@3 · nueve queries test',d.variants.map(v=>({label:v.id,value:v.summary.test.recall})),{maximum:1}));
await writeFile('vocabulary.svg',bars('Términos distintos del corpus',d.variants.filter(v=>v.method==='bm25').map(v=>({label:v.id,value:v.vocabulary})),{maximum:600,digits:0}));
await writeFile('saturation.svg',bars('BM25 · longitud 40 · DF 2 de 20',d.curves.saturation.map(r=>({label:'TF '+r.tf,value:r.score})),{maximum:5}));
await writeFile('length.svg',bars('BM25 · TF 2 · media 40 · DF 2/20',d.curves.length.map(r=>({label:'Longitud '+r.length,value:r.score})),{maximum:5}));
