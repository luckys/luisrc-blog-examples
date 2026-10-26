import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from'node:test'
import assert from'node:assert/strict'
import{readFile,readdir,access}from'node:fs/promises'
import{createHash}from'node:crypto'
import YAML from'yaml'
import{blogPath}from'../../scripts/blog-path.mjs'
import{lineChart,embeddingChart}from'../../packages/recurrent-sequences/charts.mjs'
const root='packages/recurrent-sequences/',json=async p=>JSON.parse(await readFile(p))
const m=await json(editorialPath('recurrent-sequences-series.json')),d=await json(root+'comparison.json')
const posts=await Promise.all(m.articles.map(async a=>({a,s:await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')})))
const compact=s=>s.replace(/\s/g,'').replaceAll('"',"'")
test('sequences: ocho preguntas P102 con drafts y dependencias ordenadas',async()=>{
 assert.equal(posts.length,8);assert.equal(new Set(m.articles.map(a=>a.question)).size,8)
 const known=new Set(),local=new Set(m.articles.map(a=>a.id)),seen=new Set();let previous=-Infinity
 for(const file of await readdir(blogPath('src/content/posts/es'))){if(!/\.mdx?$/.test(file))continue;const s=await readFile(blogPath('src/content/posts/es/'+file),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const{a,s}of posts){const meta=YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],a[key]);assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,m.name);assert.equal(a.roadmapId,'P102')
  assert.ok(+new Date(meta.published)>previous);previous=+new Date(meta.published)
  for(const id of a.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id))}seen.add(a.id)
  assert.equal(a.objectives.length,3);assert.equal(a.commonErrors.length,3)
  for(const h of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias'])assert.ok(s.includes(h),a.id)
  assert.doesNotMatch(s,/<!-- diagram -->|—/)
  for(const f of a.files)await access(root+f)
 }
})
test('sequences: ocho extractos coinciden con fuentes y tests ejecutados',async()=>{
 const code=compact((await Promise.all(['data.py','networks.py','cells.py','training.py','probes.py','tests/test_training.py'].map(f=>readFile(root+f,'utf8')))).join('\n'));let count=0
 for(const{a,s}of posts)for(const[,v]of s.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(code.includes(compact(v)),a.id);count++}
 assert.equal(count,8)
})
test('sequences: ocho diagramas y cuatro figuras con escala y medidas nativas',async()=>{
 let count=0
 for(const{a,s}of posts){await access(blogPath('assets/recurrent-sequences/'+a.id+'.d2'))
  for(const[,path,alt,w,h,cap]of s.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]+max-width:(\d+)px/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),v=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,v[2]);assert.equal(+h,v[3]);assert.ok(+cap<=380);assert.ok(alt.length>80);count++
  }
 }
 assert.equal(count,12)
 assert.equal(await readFile(root+'embedding-table.svg','utf8'),embeddingChart(d.runs.find(r=>r.id==='gru-7').embedding)+'\n')
 const memory=d.protocol.memory.kinds.map(k=>d.runs.find(r=>r.id===k+'-7'))
 assert.equal(await readFile(root+'memory-curves.svg','utf8'),lineChart(memory.map(r=>({name:r.kind,points:r.history.map(p=>({x:p.epoch,y:p.validationAccuracy}))})),'Memoria · validation · seed 7')+'\n')
})
test('sequences: doce modelos, doce fuentes y presupuestos declarados',async()=>{
 assert.equal(d.kind,'recurrent_sequence_observations');assert.deepEqual(d.protocol,await json(root+'protocol.json'));assert.deepEqual(d,await json(root+'results/training.json'));assert.equal(d.runs.length,12);assert.equal(Object.keys(d.sourceHashes).length,12)
 for(const[f,hash]of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),hash,f)
 assert.deepEqual(d.runtime,{python:'3.13.17',numpy:'2.5.4',torch:'2.14.1+cpu'})
 for(const r of d.runs){const memory=r.task==='memory';assert.equal(r.updates,memory?640:240);assert.equal(r.history.length,memory?17:13);assert.equal(r.history.at(-1).epoch,memory?80:60);assert.equal(r.parameters,memory?{rnn:530,lstm:1778,gru:1362}[r.kind]:1498)
  if(memory)assert.deepEqual(r.embedding[0],[0,0,0,0,0,0,0,0])
 }
})
test('sequences: sensibilidad local pequeña y memoria correcta se conservan sin inventar fallos',()=>{
 for(const r of d.runs.filter(r=>r.task==='memory')){
  assert.equal(r.lengthProbes.length,6);assert.ok(r.lengthProbes.every(p=>p.accuracy===1));assert.equal(r.traces.length,2)
  for(const t of r.traces){assert.equal(t.gradientNorm.length,t.length);assert.equal(t.cells.length,t.length)
   for(let i=0;i<t.length;i++)for(let unit=0;unit<16;unit++)assert.ok(Math.abs(t.hidden[i][unit]-t.cells[i].hidden[unit])<1e-5)
  }
 }
 const first=d.runs.find(r=>r.id==='rnn-7').traces.find(t=>t.length===48).gradientNorm[0]
 assert.ok(first<1e-20);assert.ok(posts.find(p=>p.a.id==='DL-RECURRENT-GRADIENTS').s.includes('no fuerza a la RNN a fallar'))
 for(const p of d.probes.gradientControls){assert.ok(Math.abs(p.rnnHalf/.5**p.length-1)<1e-10);assert.ok(Math.abs(p.rnnLarge/1.2**p.length-1)<1e-10);assert.ok(Math.abs(p.fixedForget/.99**p.length-1)<1e-10)}
 assert.ok(d.probes.gruConvention.wrongMaxError>.07)
})
test('sequences: ocho patrones solapados y perturbación artificial tienen alcance explícito',()=>{
 assert.deepEqual(d.continuationDatasetSummary,{trainUnique:8,validationUnique:8,overlap:8,possiblePatterns:8})
 for(const r of d.runs.filter(r=>r.task==='continuation')){
  assert.equal(r.examples.length,8);assert.equal(r.history.at(-1).rolloutExactMatch,1)
  assert.ok(r.history.some(p=>p.teacherContinuationAccuracy!==p.rolloutContinuationAccuracy))
  for(const e of r.examples){assert.deepEqual(e.generated,e.expected);assert.equal(e.perturbed[0],e.injectedToken);assert.notEqual(e.injectedToken,e.generated[0])}
 }
 const source=posts.find(p=>p.a.id==='DL-TEACHER-FORCING').s
 assert.ok(source.includes('sus conjuntos de patrones únicos coinciden'));assert.ok(source.includes('Al finalizar no observamos una brecha'))
})
test('sequences: nueve exports exactos y fuentes completas enlazadas fuera del blog',async()=>{
 const exports=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(exports.length,9)
 for(const e of exports)assert.equal(await readFile(e.source,'utf8'),await readFile(blogPath(e.destination),'utf8'))
 for(const{s}of posts){assert.match(s,/https:\/\/github.com\/luckys\/luisrc-blog-examples.git/);assert.match(s,/blob\/main\/packages\/recurrent-sequences\//)}
})
