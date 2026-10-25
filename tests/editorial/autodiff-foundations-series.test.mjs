import test from'node:test'
import assert from'node:assert/strict'
import{readFile,readdir,access}from'node:fs/promises'
import{createHash}from'node:crypto'
import YAML from'yaml'
import{blogPath}from'../../scripts/blog-path.mjs'
import{scalarTrace}from'../../packages/autodiff-foundations/model.mjs'
import{errorChart,gradientChart}from'../../packages/autodiff-foundations/charts.mjs'
const root='packages/autodiff-foundations/',json=async p=>JSON.parse(await readFile(p))
const manifest=await json(blogPath('docs/editorial/autodiff-foundations-series.json')),data=await json(root+'comparison.json')
const posts=await Promise.all(manifest.articles.map(async entry=>({entry,source:await readFile(blogPath('src/content/posts/es/'+entry.slug+'.md'),'utf8')})))
const near=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`)
const compact=s=>s.replace(/\s/g,'').replaceAll('"',"'")
test('autodiff: cinco drafts P097, objetivos distintos y dependencias anteriores',async()=>{
 assert.deepEqual(manifest.articles.map(a=>a.id),['P097','DL-LOSS-GRADIENT','DL-BACKPROP','DL-GRADCHECK','DL-AUTODIFF'])
 const known=new Set(),seen=new Set(),local=new Set(manifest.articles.map(a=>a.id));let date=-Infinity
 for(const f of await readdir(blogPath('src/content/posts/es'))){const s=await readFile(blogPath('src/content/posts/es/'+f),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const{entry,source}of posts){
  const meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const k of ['id','title','slug','prerequisites'])assert.deepEqual(meta[k],entry[k])
  assert.equal(meta.locale,'es');assert.equal(meta.series,manifest.name);assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.draft,true);assert.equal(meta.status,'draft')
  assert.ok(new Date(meta.published).valueOf()>date);date=new Date(meta.published).valueOf()
  for(const id of meta.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id))}seen.add(entry.id)
  assert.equal(entry.objectives.length,3);assert.equal(entry.commonErrors.length,3)
  for(const h of ['## Código completo y pruebas','## Garantías y límites','## Ejercicio:','## Referencias'])assert.ok(source.includes(h),entry.id)
  assert.doesNotMatch(source,/—|WIDTH|HEIGHT|@code|@diagram/)
  for(const f of entry.files)await access(root+f)
 }
 for(const f of manifest.dependencyFiles)await access(f)
 assert.equal(new Set(manifest.articles.map(a=>a.question)).size,5)
})
test('autodiff: diez extractos Python del código ejecutado, con rutas visibles',async()=>{
 const code=compact((await Promise.all(['manual.py','framework.py','experiments.py'].map(f=>readFile(root+f,'utf8')))).join('\n'));let count=0
 for(const{entry,source}of posts)for(const[,s]of source.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(code.includes(compact(s)),entry.id);count++}
 assert.equal(count,10)
})
test('autodiff: siete imágenes con medidas reales y gráficos calculados desde observaciones',async()=>{
 let count=0
 for(const{entry,source}of posts){await access(blogPath('assets/autodiff-foundations/'+entry.id+'.d2'))
  for(const[,path,alt,w,h]of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),box=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,box[2]);assert.equal(+h,box[3]);assert.ok(+w<=380);assert.ok(alt.length>80);count++
  }
 }
 assert.equal(count,7)
 assert.equal(await readFile(root+'error-sweep.svg','utf8'),errorChart(data)+'\n')
 assert.equal(await readFile(root+'gradient-vector.svg','utf8'),gradientChart(data)+'\n')
})
test('autodiff: fuentes, cuatro grafos y los 51 gradientes sustentan el contraste CPU',async()=>{
 assert.equal(data.kind,'manual_finite_difference_and_pytorch_autograd_observations')
 assert.deepEqual(data.protocol,await json(root+'protocol.json'));assert.equal(Object.keys(data.sources).length,14)
 for(const[f,sha]of Object.entries(data.sources))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),sha,f)
 assert.deepEqual([data.runtime.python,data.runtime.numpy,data.runtime.torch],['3.13.17','2.5.4','2.14.1+cpu'])
 assert.equal(data.runtime.device,'cpu');assert.ok(Object.values(data.limits).every(v=>v===false))
 for(const scalar of data.scalarCases){assert.deepEqual(scalar.manual,scalarTrace(scalar.input.w,scalar.input.x));for(const[k,v]of Object.entries(scalar.torch))near(v,scalar.manual[k])}
 for(const c of data.cases){assert.equal(c.manual.length,17);assert.equal(c.names.length,17);near(c.trace.loss,c.torchLoss)
  const max=Math.max(...c.manual.map((v,i)=>Math.abs(v-c.torch[i])));assert.equal(max,c.maxTorchError);assert.ok(max<6e-17)
  for(const f of c.finite){const errors=f.vector.map((v,i)=>Math.abs(v-c.manual[i]));near(Math.max(...errors),f.maxAbsError,1e-16)
   assert.equal(f.passes,errors.every((v,i)=>v<=data.protocol.check.atol+data.protocol.check.rtol*Math.abs(c.manual[i])))
  }
  assert.deepEqual(c.finite.map(f=>f.passes),[false,true,true,true,false,false,false])
  assert.deepEqual(Object.keys(c.mutants),['missing_mean','missing_tanh','bias_mean','extra_sigmoid'])
  assert.ok(Object.values(c.mutants).every(v=>v.passes===false))
 }
})
test('autodiff: acumulación, detach y retención tienen observaciones distintas',()=>{
 for(const c of data.cases){
  assert.ok(c.checks.gradcheck&&c.checks.weightsUnchanged&&c.checks.reuseRejected&&c.checks.noGradRejected)
  assert.equal(c.checks.nonLeafGradWithoutRetain,null);assert.equal(c.checks.leafGradsPresentWithoutRetain,true)
  assert.deepEqual(c.checks.hiddenGradShape,[4,4]);assert.equal(c.checks.detached.filter(v=>v===null).length,12)
  for(let i=0;i<17;i++){near(c.checks.once[i],c.torch[i]);near(c.checks.twice[i],2*c.torch[i]);near(c.checks.reset[i],c.torch[i]);if(i>=12)near(c.checks.detached[i],c.torch[i])}
  assert.ok(c.vjpMaxError<1e-12)
 }
})
test('autodiff: siete exports canónicos y visor sin ejecución de framework',async()=>{
 const exports=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(exports.length,7)
 for(const e of exports)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)))
 const viewer=await readFile(root+'explorer.mjs','utf8'),html=await readFile(root+'explorer.html','utf8')
 assert.deepEqual([...viewer.matchAll(/fetch\(([^)]+)\)/g)].map(m=>m[1]),["'./comparison.json'"])
 assert.match(html,/noindex,nofollow/);assert.match(html,/no ejecuta PyTorch|No ejecuta PyTorch/);assert.match(html,/None representa/)
 assert.equal([...posts[3].source.matchAll(/^\| ---/gm)].length,1)
 assert.equal([...posts[3].source.matchAll(/<div role="region"/g)].length,1)
})
