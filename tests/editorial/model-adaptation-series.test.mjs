import test from'node:test';
import assert from'node:assert/strict';
import{readFile,access,readdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import YAML from'yaml';
import{blogPath}from'../../scripts/blog-path.mjs';
import{editorialPath}from'../../scripts/editorial-path.mjs';
const root='packages/model-adaptation/',json=async f=>JSON.parse(await readFile(f));
const manifest=await json(editorialPath('model-adaptation-series.json')),data=await json(root+'comparison.json');
const posts=await Promise.all(manifest.articles.map(async a=>({a,s:await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')})));
const compact=s=>s.replace(/\s/g,'').replaceAll('"',"'");
test('adaptation: nine focused drafts in dependency order with human byline',async()=>{
 assert.equal(posts.length,9);assert.equal(new Set(posts.map(p=>p.a.question)).size,9);
 const known=new Set(),local=new Set(manifest.articles.map(a=>a.id)),seen=new Set();let previous=-Infinity;
 for(const file of await readdir(blogPath('src/content/posts/es'))){if(!/\.mdx?$/.test(file))continue;const s=await readFile(blogPath('src/content/posts/es/'+file),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id);}
 for(const{a,s}of posts){const meta=YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const k of ['id','title','slug','prerequisites'])assert.deepEqual(meta[k],a[k]);
  assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,manifest.name);assert.equal(a.roadmapId,'P104');
  assert.ok(+new Date(meta.published)>previous);previous=+new Date(meta.published);
  for(const id of a.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id));}seen.add(a.id);
  assert.equal(a.objectives.length,3);assert.equal(a.commonErrors.length,3);
  for(const h of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias'])assert.ok(s.includes(h),a.id);
  assert.doesNotMatch(s,/<!-- diagram -->|—|\{\{/);
  for(const file of a.files)await access(root+file);
 }
});
test('adaptation: each Python excerpt comes from executed sources',async()=>{
 const code=compact((await Promise.all(['models.py','objectives.py','training.py'].map(f=>readFile(root+f,'utf8')))).join('\n'));let count=0;
 for(const{a,s}of posts)for(const[,v]of s.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(code.includes(compact(v)),a.id);count++;}
 assert.equal(count,9);
});
test('adaptation: nine diagrams and four figures use actual dimensions',async()=>{
 let figures=0;
 for(const{a,s}of posts){await access(blogPath('assets/model-adaptation/'+a.id+'.d2'));
  for(const[,path,alt,w,h,cap]of s.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]+max-width:(\d+)px/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),v=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
   assert.equal(+w,v[2]);assert.equal(+h,v[3]);assert.ok(+cap<=380);assert.ok(alt.length>80);figures++;
  }
 }
 assert.equal(figures,13);
});
test('adaptation: exact protocol and all source hashes identify the numerical experiment',async()=>{
 assert.equal(data.kind,'model_adaptation_observations');assert.deepEqual(data.protocol,await json(root+'protocol.json'));assert.deepEqual(data,await json(root+'results/observations.json'));
 assert.equal(data.pretraining.length,3);assert.equal(data.adaptations.length,21);assert.equal(Object.keys(data.sourceHashes).length,11);
 for(const[f,hash]of Object.entries(data.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),hash,f);
 assert.equal(data.protocol.limits.gpu,false);assert.match(data.protocol.testPolicy,/only after all training/);
});
test('adaptation: six disjoint splits, baselines and every holdout prediction are conserved',()=>{
 const ids=new Set();
 for(const[domain,splits]of Object.entries(data.splits))for(const[split,record]of Object.entries(splits)){
  assert.equal(record.count,data.protocol[domain][split]);assert.equal(record.ids.length,record.count);assert.equal(record.classCounts.reduce((a,b)=>a+b,0),record.count);
  for(const id of record.ids){assert.ok(!ids.has(id));ids.add(id);}
 }
 for(const run of data.adaptations){assert.equal(run.test.labels.length,256);assert.equal(run.test.predictions.length,256);assert.equal(run.test.predictions.filter((v,i)=>v===run.test.labels[i]).length/256,run.test.accuracy);}
 const labels=data.adaptations[0].test.labels;assert.equal(labels.filter(v=>v===data.majority.classId).length/256,data.majority.accuracy);
 const trainCounts=data.splits.target.train.classCounts;assert.equal(data.majority.classId,trainCounts.indexOf(Math.max(...trainCounts)));
});
test('adaptation: frozen tensors, optimizer schedule and active retention are distinguished',()=>{
 const counts={linear:18,scratch:298,head:18,gradual:298,full:298,lora:66,adapter:60};
 for(const r of data.adaptations){assert.equal(r.finalParameters.trainable,counts[r.mode]);assert.equal(r.curve.length,8);
  if(r.mode==='gradual'){assert.equal(r.initialParameters.trainable,18);assert.ok(r.curve.slice(0,4).every(v=>v.trainable===18));assert.ok(r.curve.slice(4).every(v=>v.trainable===298));assert.ok(Object.keys(r.changedParameters).some(k=>k.startsWith('encoder.')));}
  if(['head','adapter','lora'].includes(r.mode))assert.ok(!Object.keys(r.changedParameters).some(k=>k==='encoder.first.weight'||k.startsWith('encoder.last.base.')));
  if(r.mode==='head')assert.equal(r.sourceDeltaMSE,0);
  if(['linear','scratch'].includes(r.mode)){assert.equal(r.sourceMSE,null);assert.equal(r.sourceBeforeMSE,null);}
 }
});
test('adaptation: unhelpful pretraining and contrastive negative controls remain visible',()=>{
 for(const seed of data.protocol.seeds){const runs=data.adaptations.filter(r=>r.seed===seed);assert.ok(runs.find(r=>r.mode==='scratch').test.accuracy>=runs.find(r=>r.mode==='full').test.accuracy);}
 assert.equal(data.contrastive.training,false);assert.ok(data.contrastive.swappedLoss>data.contrastive.loss);assert.ok(Math.abs(data.contrastive.collapsedLoss-Math.log(3))<1e-6);
 for(const{s}of posts)assert.match(s,/visor interactivo/);
});
test('adaptation: nine static exports match the canonical lab and all source links exist',async()=>{
 const exports=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(exports.length,9);
 for(const e of exports)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)));
 for(const{s}of posts){assert.match(s,/https:\/\/github.com\/luckys\/luisrc-blog-examples.git/);assert.match(s,/blob\/main\/packages\/model-adaptation\//);}
});

test('adaptation: Markdown links contain no accidental whitespace and source loss claims match the archive',()=>{
 for(const{s}of posts)for(const[,url]of s.matchAll(/\]\((https?:[^)]+)\)/g))assert.doesNotMatch(url,/\s/);
 const full=data.adaptations.find(r=>r.mode==='full'&&r.seed===7),post=posts.find(p=>p.a.id==='DL-FULL-TUNING').s;
 assert.ok(post.includes(full.sourceBeforeMSE.toFixed(4).replace('.',',')));
 assert.ok(post.includes(full.sourceMSE.toFixed(4).replace('.',',')));
});
