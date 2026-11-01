import test from 'node:test';import assert from 'node:assert/strict';import {readFile,access} from 'node:fs/promises';import {createHash} from 'node:crypto';import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';import {rankDistribution} from '../../packages/language-models/analysis.mjs';import {distributionChart,lossChart,nllChart} from '../../packages/language-models/charts.mjs';
const root='packages/language-models/',json=async p=>JSON.parse(await readFile(p));const m=await json('docs/editorial/language-models-series.json'),d=await json(root+'results/observations.json');
test('LM: six focused Spanish drafts, source excerpts and complete laboratory links',async()=>{
 assert.equal(m.articles.length,6);assert.equal(m.status,'draft');assert.equal(new Set(m.articles.map(a=>a.question)).size,6);let previous=-Infinity;
 const code=(await Promise.all(['analysis.mjs','tokenizer.mjs'].map(f=>readFile(root+f,'utf8')))).join('\n');
 for(const a of m.articles){const text=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8'),meta=YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
 for(const k of ['id','title','slug','prerequisites'])assert.deepEqual(meta[k],a[k]);assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,m.name);assert.ok(+new Date(meta.published)>previous);previous=+new Date(meta.published);
 assert.ok(text.split(/\s+/).length>900);assert.doesNotMatch(text,/—|\[\[/);for(const h of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias'])assert.ok(text.includes(h));
 for(const[,snippet]of text.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.includes(snippet),a.id);for(const f of a.files)await access(root+f);
 assert.ok(text.includes('https://github.com/luckys/luisrc-blog-examples.git'));assert.ok(text.includes('packages/language-models/results/observations.json'));
 }
});
test('LM: six native diagrams, three numerical figures and eight byte-exact exports',async()=>{
 let images=0;for(const a of m.articles){await access(blogPath('assets/language-models/'+a.id+'.svg'));const text=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8');for(const[,p,w,h]of text.matchAll(/<img src="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"/g)){const svg=await readFile(blogPath('public'+p),'utf8');assert.ok(svg.includes(`viewBox="0 0 ${w} ${h}"`));images++;}}
 assert.equal(images,9);const entries=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(entries.length,8);for(const e of entries)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)));
 assert.equal(await readFile(root+'loss.svg','utf8'),lossChart(d.runs));assert.equal(await readFile(root+'test-nll.svg','utf8'),nllChart(d.baseline,d.runs));const p=d.runs[0].probes.find(p=>p.text==='la ingeniera consulta los');assert.equal(await readFile(root+'probabilities.svg','utf8'),distributionChart(rankDistribution(d.vocabulary,p.logits)));
});
test('LM: browser pack exactly preserves recorded probabilities and omits model weights',async()=>{
 const p=await json(root+'viewer-data.json'),data=await json(root+'tokenized.json');assert.equal(p.kind,'saved_tiny_lm_predictions_not_live_inference');assert.deepEqual(p.records,data.records);assert.deepEqual(p.baseline,d.baseline);assert.deepEqual(p.vocabulary,d.vocabulary);assert.deepEqual(p.sourceHashes,d.sourceHashes);assert.equal(p.runs.length,3);
 for(let i=0;i<3;i++){const {state,...expected}=d.runs[i];assert.deepEqual(p.runs[i],expected);assert.ok(!('state' in p.runs[i]));assert.equal(p.runs[i].probes.length,7);assert.equal(p.runs[i].predictions.length,72);}
 for(const[file,hash]of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+file)).digest('hex'),hash);
});
test('LM: text retains split bias and distinguishes masked-LM illustration from training',async()=>{
 const post=async slug=>readFile(blogPath('src/content/posts/es/'+slug+'.md'),'utf8');
 assert.ok((await post(m.articles[0].slug)).includes('0,00255'));assert.ok((await post(m.articles[3].slug)).includes('2,673023'));assert.ok((await post(m.articles[4].slug)).includes('no añade un token MASK entrenado al vocabulario'));assert.ok((await post(m.articles[5].slug)).includes('3205'));
});
