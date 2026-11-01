import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';
import {verifyCapture} from '../../packages/structured-extraction/verify.mjs';
import {effectiveCounts} from '../../packages/structured-extraction/explorer.mjs';
import {stagesChart,entitiesChart,contextChart} from '../../packages/structured-extraction/charts.mjs';
const root='packages/structured-extraction/',json=async p=>JSON.parse(await readFile(p));
const manifest=await json('docs/editorial/structured-extraction-series.json'), pack=await json(root+'viewer-data.json');
test('P110: seven focused Spanish drafts, exact excerpts and existing links',async()=>{
 assert.equal(manifest.articles.length,7);assert.equal(manifest.status,'draft');assert.equal(new Set(manifest.articles.map(a=>a.question)).size,7);
 const source=(await Promise.all(['prompts.mjs','contract.py','tool-gate.mjs'].map(f=>readFile(root+f,'utf8')))).join('\n');
 let previous=-Infinity;
 for(const a of manifest.articles){const text=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8'),meta=YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],a[key]);
  assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.locale,'es');assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.series,manifest.name);assert.ok(+new Date(meta.published)>previous);previous=+new Date(meta.published);
  assert.ok(text.split(/\s+/).length>900,a.id);assert.doesNotMatch(text,/—|\[\[/);
  for(const heading of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias','## Recorrido interactivo'])assert.ok(text.includes(heading),a.id+' '+heading);
  for(const[,snippet]of text.matchAll(/```(?:javascript|python)\n([\s\S]*?)\n```/g))assert.ok(source.replace(/\s+/g,'').includes(snippet.replace(/\s+/g,'')),a.id+' exact excerpt');
  for(const file of a.files)await access(root+file);
  for(const[,slug]of text.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
 }
});
test('P110: ten visual resources and seven byte-exact site exports',async()=>{
 let images=0;
 for(const a of manifest.articles){assert.deepEqual(await readFile(blogPath('assets/structured-extraction/'+a.id+'.svg')),await readFile(blogPath('public/assets/visuals/structured-extraction/'+a.id+'.svg')));const text=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8');for(const[,p,w,h]of text.matchAll(/<img src="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"/g)){const svg=await readFile(blogPath('public'+p),'utf8');assert.ok(svg.includes(`viewBox="0 0 ${w} ${h}"`));images++;}}
 assert.equal(images,10);
 const exports=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(exports.length,7);
 for(const e of exports)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)));
 assert.equal(await readFile(root+'stages.svg','utf8'),stagesChart(pack.validation.summaries));assert.equal(await readFile(root+'entities.svg','utf8'),entitiesChart(pack.validation.summaries));assert.equal(await readFile(root+'context.svg','utf8'),contextChart(pack.capture.runs));
});
test('P110: viewer contains exact originals, manually authored controls stay separate',async()=>{
 const actual=await verifyCapture();assert.equal(pack.kind,'saved_extraction_replay_not_live_inference');
 for(const key of ['capture','validation','fixtures'])assert.deepEqual(pack[key],actual[key]);
 assert.deepEqual(pack.documents,await json(root+'documents.json'));assert.equal(pack.capture.runs.length,24);assert.equal(pack.fixtures.rows.length,18);
 const wrong=pack.validation.rows.find(r=>r.variant==='few-shot'&&r.documentId==='E04');assert.equal(wrong.accepted,true);assert.deepEqual(wrong.counts,{tp:0,fp:2,fn:2});
 for(const id of ['C04','C05','C06']){const row=pack.fixtures.rows.find(r=>r.id===id);assert.equal(row.result.accepted,true);assert.equal(row.expectedSemanticCorrect,false);}
});
test('P110: all 256 document subsets preserve effective TP/FP/FN and null denominators',()=>{
 for(let mask=0;mask<256;mask++)for(const variant of pack.capture.protocol.variants){const ids=new Set(pack.documents.filter((_,i)=>mask&(1<<i)).map(d=>d.id)),rows=pack.validation.rows.filter(r=>r.variant===variant&&ids.has(r.documentId)),actual=effectiveCounts(rows,pack.documents),sum={tp:0,fp:0,fn:0};for(const r of rows)for(const k of Object.keys(sum))sum[k]+=r.counts[k];
  for(const k of Object.keys(sum))assert.equal(actual[k],sum[k]);
  assert.equal(actual.precision,sum.tp+sum.fp?sum.tp/(sum.tp+sum.fp):null);assert.equal(actual.recall,sum.tp+sum.fn?sum.tp/(sum.tp+sum.fn):null);assert.equal(actual.f1,2*sum.tp+sum.fp+sum.fn?2*sum.tp/(2*sum.tp+sum.fp+sum.fn):null);
 }
});
