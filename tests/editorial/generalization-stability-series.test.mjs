import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from'node:test'
import assert from'node:assert/strict'
import{readFile,readdir,access}from'node:fs/promises'
import{createHash}from'node:crypto'
import YAML from'yaml'
import{blogPath}from'../../scripts/blog-path.mjs'
import{curvesChart,fitChart,biasChart,clippingChart}from'../../packages/generalization-stability/charts.mjs'
const root='packages/generalization-stability/',json=async p=>JSON.parse(await readFile(p))
const m=await json(editorialPath('generalization-stability-series.json')),d=await json(root+'comparison.json')
const posts=await Promise.all(m.articles.map(async a=>({a,s:await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')})))
const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`),compact=s=>s.replace(/\s/g,'').replaceAll('"',"'")
test('generalization: diez preguntas P100, drafts y dependencias en orden',async()=>{
 assert.equal(m.articles.length,10);assert.equal(new Set(m.articles.map(a=>a.question)).size,10)
 const known=new Set(),seen=new Set(),local=new Set(m.articles.map(a=>a.id));let date=-Infinity
 for(const f of await readdir(blogPath('src/content/posts/es'))){const s=await readFile(blogPath('src/content/posts/es/'+f),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const{a,s}of posts){const meta=YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const k of ['id','title','slug','prerequisites'])assert.deepEqual(meta[k],a[k])
  assert.equal(meta.locale,'es');assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,m.name);assert.equal(a.roadmapId,'P100')
  assert.ok(+new Date(meta.published)>date);date=+new Date(meta.published)
  for(const id of a.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id))}seen.add(a.id)
  assert.equal(a.objectives.length,3);assert.equal(a.commonErrors.length,3)
  for(const h of ['## Ejercicio:','## Código completo y pruebas','## Garantías y límites','## Referencias'])assert.ok(s.includes(h),a.id)
  assert.doesNotMatch(s,/@diagram@|@\w+-graph@|—/)
  for(const f of a.files)await access(root+f)
 }
})
test('generalization: diecisiete extractos Python coinciden con las fuentes',async()=>{
 const code=compact((await Promise.all(['training.py','probes.py'].map(f=>readFile(root+f,'utf8')))).join('\n'));let count=0
 for(const{a,s}of posts)for(const[,v]of s.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(code.includes(compact(v)),a.id);assert.match(s,/packages\/generalization-stability\/\w+\.py/);count++}
 assert.equal(count,17)
})
test('generalization: diez diagramas y cuatro gráficos con datos y medidas reales',async()=>{
 let count=0
 for(const{a,s}of posts){await access(blogPath('assets/generalization-stability/'+a.id+'.d2'))
  for(const[,path,alt,w,h,cap]of s.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]+max-width:(\d+)px/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),v=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,v[2]);assert.equal(+h,v[3]);assert.ok(+cap<=380);assert.ok(alt.length>80);count++
  }
 }
 assert.equal(count,14)
 const r=d.runs.find(r=>r.id==='baseline-7')
 for(const[f,svg]of Object.entries({'overfit-curves.svg':curvesChart(r),'overfit-functions.svg':fitChart(d,r,'last'),'bias-variance.svg':biasChart(d),'clipping-curves.svg':clippingChart(d)}))assert.equal(await readFile(root+f,'utf8'),svg+'\n')
})
test('generalization: once fuentes, protocolo y 18 entrenamientos con métricas coherentes',async()=>{
 assert.equal(d.kind,'generalization_and_stability_observations');assert.deepEqual(d.protocol,await json(root+'protocol.json'));assert.deepEqual(d,await json(root+'results/training.json'))
 assert.equal(Object.keys(d.sources).length,11)
 for(const[f,h]of Object.entries(d.sources))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),h,f)
 assert.deepEqual([d.runtime.python,d.runtime.numpy,d.runtime.torch],['3.13.17','2.5.4','2.14.1+cpu']);assert.ok(Object.values(d.protocol.limits).every(v=>v===false))
 assert.equal(d.runs.length,18)
 for(const r of d.runs){
  assert.equal(r.updates,r.last.epoch);assert.equal(r.history[0].epoch,0);assert.equal(r.history.at(-1).epoch,r.last.epoch)
  assert.equal(r.parameterCount,r.options.normalization?4609:4353)
  assert.equal(r.best.validationMse,Math.min(...r.history.map(h=>h.validationMse)))
  for(const h of r.history){assert.ok(Number.isFinite(h.trainMse)&&Number.isFinite(h.validationMse));assert.equal(h.epoch%10,0)}
  for(const phase of ['initial','last','best','selected'])assert.equal(r[phase].prediction.length,101)
 }
 for(let i=0;i<24;i++)near(d.data.y[i]-d.data.unshiftedY[i],i===8?1.25:0)
})
test('generalization: sobreajuste observado y parada prematura se conservan como resultados distintos',()=>{
 const improved=[],worse=[]
 for(const seed of [7,19,31]){
  const base=d.runs.find(r=>r.id===`baseline-${seed}`),early=d.runs.find(r=>r.id===`early_stopping-${seed}`)
  assert.ok(base.last.trainMse<base.best.trainMse);assert.ok(base.last.validationMse>base.best.validationMse)
  assert.deepEqual(early.history,base.history.slice(0,early.history.length));assert.ok(early.stoppedEarly&&early.restoredBest)
  assert.equal(early.last.epoch,early.best.epoch+100);assert.deepEqual(early.selected.prediction,early.best.prediction)
  ;(early.selected.validationMse<base.last.validationMse?improved:worse).push(seed)
 }
 assert.deepEqual(improved,[7,31]);assert.deepEqual(worse,[19])
 assert.deepEqual(d.runs.filter(r=>r.variant==='early_stopping').map(r=>[r.last.epoch,r.best.epoch]),[[530,430],[170,70],[410,310]])
 const post=posts.find(p=>p.a.id==='DL-EARLY-STOPPING').s
 assert.match(post,/expectativa inicial/);assert.match(post,/hipótesis rechazada/)
})
test('generalization: mecanismos estadísticos, ejes y clipping distinguen sus límites',()=>{
 for(const r of d.biasVariance.models){near(r.cleanRisk,r.biasSquared+r.variance);assert.equal(r.knownNoiseVariance,.0625)}
 near(d.normalization.layerA[0][0],d.normalization.layerB[0][0]);assert.notEqual(d.normalization.batchA[0][0],d.normalization.batchB[0][0])
 for(const key of ['Mean','Variance'])d.normalization['running'+key].forEach((v,i)=>near(v,d.normalization['expectedRunning'+key][i]))
 assert.ok(d.normalization.singletonRejected&&d.normalization.untrackedEvalUsesBatch)
 assert.deepEqual(d.dropout.possibleValues,[0,1.25]);assert.ok(d.dropout.evalIdentity)
 for(const r of d.initialization.filter(r=>r.id.endsWith('relu')))assert.ok(r.layers.every(l=>l.saturationFraction===null))
 near(d.clipping.vector.before,5);assert.ok(d.clipping.vector.after<=2);assert.ok(d.clipping.adam.stepNorm>d.clipping.adam.lrTimesClip)
 const curve=d.clipping.curves.find(r=>r.id==='unclipped');assert.equal(curve.reason,'loss_above_guard');assert.equal(curve.history.at(-1).step,9)
 assert.ok(d.clipping.curves.find(r=>r.id==='clipped').history.filter(r=>r.stepNorm!==null).every(r=>r.stepNorm<=.05+1e-12))
 assert.equal(d.clipping.curves.find(r=>r.id==='stable_rate').history.at(-1).loss,0)
})
test('generalization: nueve exports exactos y visor local sin entrenamiento',async()=>{
 const ex=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(ex.length,9)
 for(const e of ex)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)))
 const html=await readFile(root+'explorer.html','utf8'),js=await readFile(root+'explorer.mjs','utf8')
 assert.match(html,/noindex,nofollow/);assert.match(html,/no entrena ni ejecuta PyTorch/)
 assert.deepEqual([...js.matchAll(/fetch\(([^)]+)\)/g)].map(m=>m[1]),["'./comparison.json'"])
})
