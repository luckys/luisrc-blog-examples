import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';
import {supportChart,tailChart,latencyChart} from '../../packages/text-generation/charts.mjs';
const root='packages/text-generation/',json=async p=>JSON.parse(await readFile(p));
const manifest=await json('docs/editorial/text-generation-series.json');
const saved=await json(root+'results/observations.json'),stream=await json(root+'results/streaming.json');
test('GEN: seven focused Spanish drafts, exact laboratory excerpts and existing links',async()=>{
 assert.equal(manifest.status,'draft');assert.equal(manifest.articles.length,7);
 assert.equal(new Set(manifest.articles.map(a=>a.question)).size,7);
 const source=(await Promise.all(['sampling.mjs','generation.py','stream-metrics.mjs'].map(f=>readFile(root+f,'utf8')))).join('\n');let previous=-Infinity;
 for(const a of manifest.articles){const text=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8'),meta=YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],a[key]);
  assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,manifest.name);assert.ok(+new Date(meta.published)>previous);previous=+new Date(meta.published);
  assert.ok(text.split(/\s+/).length>900,a.id);assert.doesNotMatch(text,/—|\[\[/);
  for(const heading of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias'])assert.ok(text.includes(heading));
  for(const[,snippet]of text.matchAll(/```(?:javascript|python)\n([\s\S]*?)\n```/g))assert.ok(source.replace(/\s+/g,'').includes(snippet.replace(/\s+/g,'')),a.id+' source excerpt');
  for(const file of a.files)await access(root+file);
  for(const[,slug]of text.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
  assert.ok(text.includes('pnpm --filter @luisrc-examples/text-generation verify'));
 }
});
test('GEN: ten diagrams/figures and eight byte-exact public exports',async()=>{
 let images=0;for(const a of manifest.articles){await access(blogPath('assets/text-generation/'+a.id+'.svg'));const text=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8');for(const[,p,w,h]of text.matchAll(/<img src="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"/g)){const svg=await readFile(blogPath('public'+p),'utf8');assert.ok(svg.includes(`viewBox="0 0 ${w} ${h}"`));images++;}}
 assert.equal(images,10);const entries=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(entries.length,8);
 for(const e of entries)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)));
 const pack=await json(root+'viewer-data.json');
 assert.equal(await readFile(root+'support.svg','utf8'),supportChart(pack.support));assert.equal(await readFile(root+'tail.svg','utf8'),tailChart(pack.tail));assert.equal(await readFile(root+'latency.svg','utf8'),latencyChart(stream.requests));
});
test('GEN: browser pack preserves all 36 rollouts, 144 token decisions and source hashes',async()=>{
 const pack=await json(root+'viewer-data.json');assert.equal(pack.kind,'saved_generation_and_streaming_replay');
 assert.deepEqual(pack.rollouts,saved.rollouts);assert.deepEqual(pack.controls,saved.controls);assert.deepEqual(pack.protocol,saved.protocol);assert.deepEqual(pack.vocabulary,saved.vocabulary);assert.deepEqual(pack.streaming,stream);assert.deepEqual(pack.qualityHashes,saved.sourceHashes);assert.equal(pack.qualityCapturedAt,saved.capturedAt);
 assert.equal(saved.rollouts.length,36);assert.equal(saved.rollouts.reduce((n,r)=>n+r.steps.length,0),144);
 for(const capture of [saved,stream])for(const[file,hash]of Object.entries(capture.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+file)).digest('hex'),hash,file);
});
test('GEN: drafts retain negative results and distinguish live measurement from replay',async()=>{
 const posts=await Promise.all(manifest.articles.map(a=>readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')));
 assert.ok(posts[1].includes('0,00161399'));assert.ok(posts[1].includes('No suprimimos tokens especiales'));assert.ok(posts[2].includes('0,669889'));assert.ok(posts[3].includes('p igual a uno'));assert.ok(posts[4].includes('siete posiciones'));assert.ok(posts[5].includes('1,125774'));assert.ok(posts[5].includes('No calculamos un p95'));assert.ok(posts[6].includes('Tres seeds son ejemplos'));
 for(const text of posts)assert.ok(text.includes('logits')||text.includes('logit'));
});
