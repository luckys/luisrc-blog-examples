import test from'node:test'
import assert from'node:assert/strict'
import{readFile,readdir,access}from'node:fs/promises'
import{createHash}from'node:crypto'
import YAML from'yaml'
import{blogPath}from'../../scripts/blog-path.mjs'
import{editorialPath}from'../../scripts/editorial-path.mjs'
import{matrixChart}from'../../packages/attention-transformer/charts.mjs'
const root='packages/attention-transformer/',json=async p=>JSON.parse(await readFile(p))
const m=await json(editorialPath('attention-transformer-series.json')),d=await json(root+'comparison.json')
const posts=await Promise.all(m.articles.map(async a=>({a,s:await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')})))
const compact=s=>s.replace(/\s/g,'').replaceAll('"',"'")
test('attention: ocho drafts específicos con dependencias y orden',async()=>{
 assert.equal(posts.length,8);assert.equal(new Set(m.articles.map(a=>a.question)).size,8)
 const known=new Set(),local=new Set(m.articles.map(a=>a.id)),seen=new Set();let previous=-Infinity
 for(const file of await readdir(blogPath('src/content/posts/es'))){if(!/\.mdx?$/.test(file))continue;const s=await readFile(blogPath('src/content/posts/es/'+file),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const{a,s}of posts){const meta=YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const k of ['id','title','slug','prerequisites'])assert.deepEqual(meta[k],a[k]);assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,m.name);assert.equal(a.roadmapId,'P103')
  assert.ok(+new Date(meta.published)>previous);previous=+new Date(meta.published)
  for(const id of a.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id))}seen.add(a.id)
  assert.equal(a.objectives.length,3);assert.equal(a.commonErrors.length,3)
  for(const h of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias'])assert.ok(s.includes(h),a.id)
  assert.doesNotMatch(s,/<!-- diagram -->|—/)
  for(const f of a.files)await access(root+f)
 }
})
test('attention: ocho extractos Python de las fuentes ejecutadas',async()=>{
 const code=compact((await Promise.all(['attention.py','transformer.py','probes.py'].map(f=>readFile(root+f,'utf8')))).join('\n'));let count=0
 for(const{a,s}of posts)for(const[,v]of s.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(code.includes(compact(v)),a.id);count++}
 assert.equal(count,8)
})
test('attention: ocho diagramas y cuatro figuras con dimensiones reales',async()=>{
 let count=0
 for(const{a,s}of posts){await access(blogPath('assets/attention-transformer/'+a.id+'.d2'))
  for(const[,path,alt,w,h,cap]of s.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]+max-width:(\d+)px/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),v=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,v[2]);assert.equal(+h,v[3]);assert.ok(+cap<=380);assert.ok(alt.length>80);count++
  }
 }
 assert.equal(count,12)
 const c=d.cases.find(c=>c.id==='self_causal-7')
 assert.equal(await readFile(root+'attention-weights.svg','utf8'),matrixChart(c.trace.weights[0][0],{allowed:c.trace.allowed[0][0],title:'Self causal · seed 7 · head 0'})+'\n')
})
test('attention: diez hashes, nueve casos y parámetros declarados sin entrenamiento',async()=>{
 assert.equal(d.kind,'attention_transformer_observations');assert.deepEqual(d.protocol,await json(root+'protocol.json'));assert.deepEqual(d,await json(root+'results/observations.json'));assert.equal(d.protocol.training,false)
 assert.equal(d.cases.length,9);assert.equal(d.models.length,3);assert.equal(Object.keys(d.sourceHashes).length,10)
 for(const[f,hash]of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),hash,f)
 for(const c of d.cases){assert.equal(c.parameters,288);assert.ok(Math.max(c.sdpaError,c.mhaError,c.mhaWeightError)<1e-12)}
 for(const m of d.models){assert.equal(m.lmParameters,820);assert.equal(m.seqParameters,1740)}
})
test('attention: pesos, exclusiones y sumas se reconstruyen por head',()=>{
 for(const c of d.cases){const t=c.trace
  for(let b=0;b<2;b++)for(let h=0;h<2;h++)for(let q=0;q<t.weights[b][h].length;q++){
   const weights=t.weights[b][h][q];assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-12)
   weights.forEach((v,k)=>{if(!t.allowed[b][h][q][k])assert.equal(v,0);assert.ok(Math.abs(t.scores[b][h][q][k]-t.rawScores[b][h][q][k]/2)<1e-12)})
   for(let component=0;component<4;component++)assert.ok(Math.abs(weights.reduce((s,w,k)=>s+w*t.value[b][h][k][component],0)-t.attended[b][h][q][component])<1e-12)
  }
 }
 assert.ok(d.probes.wrongMaskError>8);assert.equal(d.probes.softmax.naiveNonfinite,true);assert.equal(d.probes.softmax.stableFinite,true)
})
test('attention: causalidad end to end y controles negativos conservados',()=>{
 for(const m of d.models){assert.equal(m.prefixError,0);assert.equal(m.seqTargetPrefixError,0);assert.equal(m.seqPaddingPrefixError,0);assert.ok(m.unmaskedPrefixChange>1e-5);assert.ok(m.seqSourceChange>1e-5)
  for(const row of m.inputGradient[0].slice(2))assert.ok(row.every(v=>v===0))
  assert.ok(m.inputGradient[1].flat().every(v=>v===0))
 }
 assert.ok(d.probes.permutation.noPositionError<1e-12);assert.ok(d.probes.permutation.fixedPositionChange>.4);assert.ok(d.probes.permutation.jointPermutationError<1e-12)
 assert.deepEqual(d.probes.positions[0],[0,1,0,1,0,1,0,1])
 for(const p of d.probes.costs)assert.equal(p.scoreBytes,32*p.length**2)
})
test('attention: nueve exports exactos y fuentes enlazadas en los ocho posts',async()=>{
 const exports=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(exports.length,9)
 for(const e of exports)assert.equal(await readFile(e.source,'utf8'),await readFile(blogPath(e.destination),'utf8'))
 for(const{s}of posts){assert.match(s,/https:\/\/github.com\/luckys\/luisrc-blog-examples.git/);assert.match(s,/blob\/main\/packages\/attention-transformer\//)}
})
