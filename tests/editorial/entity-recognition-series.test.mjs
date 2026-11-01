import test from 'node:test';import assert from 'node:assert/strict';import {readFile,access} from 'node:fs/promises';import {createHash} from 'node:crypto';import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';import {experiment} from '../../packages/entity-recognition/experiment.mjs';
const root='packages/entity-recognition/',json=async p=>JSON.parse(await readFile(p));
const m=await json('docs/editorial/entity-recognition-series.json');
test('NER: seven focused Spanish drafts, complete local scope, actual code and linked lab',async()=>{
 assert.equal(m.status,'draft');assert.equal(m.articles.length,7);assert.equal(m.remaining.length,0);
 const code=(await Promise.all(['spans.mjs','model.mjs','diagnostics.mjs'].map(f=>readFile(root+f,'utf8')))).join('\n');
 for(const a of m.articles){const text=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8'),meta=YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],a[key]);assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,m.name);
  assert.doesNotMatch(text,/—|\[\[/);for(const heading of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias'])assert.ok(text.includes(heading));
  for(const [,snippet] of text.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.includes(snippet));
  for(const file of a.files)await access(root+file);
  assert.ok(text.includes('https://github.com/luckys/luisrc-blog-examples/blob/main/packages/entity-recognition/'));
 }
});
test('NER: local SVGs use exact dimensions; ten exported files match their sources',async()=>{
 for(const a of m.articles){const text=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8');for(const[,path,w,h]of text.matchAll(/<img src="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"/g)){const svg=await readFile(blogPath('public'+path),'utf8');assert.ok(svg.includes(`viewBox="0 0 ${w} ${h}"`));}}
 const entries=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(entries.length,10);for(const e of entries)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)));
});
test('NER: initial fitting capture hashes and all numerical values recompute exactly',async()=>{
 const d=await json(root+'results/training.json');for(const[file,hash]of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+file)).digest('hex'),hash);
 const result=experiment(await json(root+'corpus.json'),await json(root+'protocol.json'));assert.deepEqual(result.variants,d.variants);assert.deepEqual(result.rules,d.rules);
 assert.deepEqual(d.variants.slice(1).map(v=>v.model.seed),[7,19,31]);
 for(const v of d.variants.slice(1)){assert.equal(v.model.features.length,646);assert.equal(v.model.trainTokens,138);assert.equal(v.model.epochs,80);assert.ok(v.model.loss.at(-1)<v.model.loss[0]);assert.equal(v.metrics.test.exact.f1,0);assert.equal(v.metrics.test.tokenAccuracy.value,49/67);assert.ok(v.predictions.every(p=>p.labels.every(t=>t==='O')));}
});
test('NER: six fixed convergence runs recompute, preserve all-O baseline and weak generalization',async()=>{
 const {convergence}=await import('../../packages/entity-recognition/convergence.mjs');
 const corpus=await json(root+'corpus.json'),base=await json(root+'protocol.json'),p=await json(root+'convergence-protocol.json'),d=await json(root+'results/convergence.json');
 assert.deepEqual(p.epochs,[800,1600]);assert.deepEqual(p.seeds,[7,19,31]);
 for(const[file,hash]of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+file)).digest('hex'),hash);
 assert.deepEqual(convergence(corpus,base,p).runs,d.runs);
 const initial=await json(root+'results/training.json');
 for(const run of d.runs)for(const v of run.variants.filter(v=>v.model)){
  assert.deepEqual(v.model.loss.slice(0,81),initial.variants.find(i=>i.model?.seed===v.model.seed).model.loss);
  assert.equal(v.metrics.train.exact.f1,1);assert.equal(v.metrics.dev.exact.f1,4/17);assert.equal(v.metrics.test.exact.f1,4/21);assert.deepEqual([v.metrics.test.exact.tp,v.metrics.test.exact.fp,v.metrics.test.exact.fn],[2,10,7]);
  assert.deepEqual(v.predictions.map(({id,spans,labels})=>({id,spans,labels})),d.runs[0].variants.find(i=>i.model?.seed===v.model.seed).predictions.map(({id,spans,labels})=>({id,spans,labels})));
  assert.equal(v.reviews.find(r=>r.id==='N29').errors[0].kind,'boundary');assert.equal(v.reviews.find(r=>r.id==='N32').errors[0].kind,'spurious');
 }
});
test('NER: browser pack derives saved predictions, never claims live or Transformer inference',async()=>{
 const pack=await json(root+'observations.json'),initial=await json(root+'results/training.json'),extra=await json(root+'results/convergence.json');assert.equal(pack.kind,'saved_predictions_not_live_inference');assert.equal(pack.variants.length,10);
 const originals=[initial.variants[0],...initial.variants.slice(1),...extra.runs.flatMap(r=>r.variants.filter(v=>v.model))];
 for(let i=0;i<originals.length;i++){const v=pack.variants[i],o=originals[i];assert.deepEqual(v.metrics,o.metrics);assert.deepEqual(v.loss,o.model?.loss??null);assert.deepEqual(v.predictions,o.predictions.map(({id,spans,labels})=>({id,spans,...(labels?{labels}:{})})));}
 const html=await readFile(root+'explorer.html','utf8');assert.ok(html.includes('No hay inferencia en directo'));assert.ok(html.includes('no tokenizer real'));
 const post=await readFile(blogPath('src/content/posts/es/ner-transformers-subwords-alinear-etiquetas.md'),'utf8');assert.ok(post.includes('No hemos entrenado un Transformer NER'));
});
