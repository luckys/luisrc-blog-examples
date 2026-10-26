import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir,access} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import YAML from 'yaml'
import {blogPath} from '../../scripts/blog-path.mjs'
import {vector} from '../../packages/pytorch-training/model.mjs'
import {curveChart,resumeErrors} from '../../packages/pytorch-training/charts.mjs'
const root='packages/pytorch-training/',json=async p=>JSON.parse(await readFile(p))
const m=await json(editorialPath('pytorch-training-series.json')),data=await json(root+'comparison.json')
const posts=await Promise.all(m.articles.map(async a=>({a,s:await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')})))
const compact=s=>s.replace(/\s/g,'').replaceAll('"',"'"),near=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`)
test('pytorch: siete preguntas P099, drafts españoles y dependencias en orden',async()=>{
 assert.deepEqual(m.articles.map(a=>a.id),['P099','DL-DATALOADER','DL-MODULE','DL-TORCH-LOOP','DL-EVALUATION','DL-CHECKPOINT','DL-RESUME'])
 const known=new Set(),seen=new Set(),local=new Set(m.articles.map(a=>a.id));let date=-Infinity
 for(const f of await readdir(blogPath('src/content/posts/es'))){const s=await readFile(blogPath('src/content/posts/es/'+f),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const{a,s}of posts){
  const meta=YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const k of ['id','title','slug','prerequisites'])assert.deepEqual(meta[k],a[k])
  assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.series,m.name)
  assert.ok(+new Date(meta.published)>date);date=+new Date(meta.published)
  for(const id of a.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id))}seen.add(a.id)
  assert.equal(a.objectives.length,3);assert.equal(a.commonErrors.length,3)
  for(const h of ['## Ejercicio:','## Código completo y pruebas','## Garantías y límites','## Referencias'])assert.ok(s.includes(h),a.id)
  assert.doesNotMatch(s,/@diagram@|@\w+-graph@|—/)
  for(const f of a.files)await access(root+f)
 }
 assert.equal(new Set(m.articles.map(a=>a.question)).size,7)
})
test('pytorch: catorce extractos Python pertenecen a las fuentes ejecutadas',async()=>{
 const code=compact((await Promise.all(['pipeline.py','checkpoints.py','probes.py'].map(f=>readFile(root+f,'utf8')))).join('\n'));let count=0
 for(const{a,s}of posts)for(const[,excerpt]of s.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(code.includes(compact(excerpt)),a.id);assert.match(s,/packages\/pytorch-training\/\w+\.py/);count++}
 assert.equal(count,14)
})
test('pytorch: siete diagramas, dos gráficas y dimensiones verificables',async()=>{
 let count=0
 for(const{a,s}of posts){await access(blogPath('assets/pytorch-training/'+a.id+'.d2'))
  for(const[,path,alt,w,h,cap]of s.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]+max-width:(\d+)px/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),box=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,box[2]);assert.equal(+h,box[3]);assert.ok(+cap<=380);assert.ok(alt.length>80);count++
  }
 }
 assert.equal(count,9)
 assert.equal(await readFile(root+'training-curves.svg','utf8'),curveChart(data)+'\n')
 assert.equal(await readFile(root+'resume-errors.svg','utf8'),resumeErrors(data)+'\n')
})
test('pytorch: trece hashes, versiones y tres entrenamientos completos sustentan el protocolo',async()=>{
 assert.equal(data.kind,'pytorch_end_to_end_training_observations');assert.deepEqual(data.protocol,await json(root+'protocol.json'));assert.equal(Object.keys(data.sources).length,13)
 for(const[f,h]of Object.entries(data.sources))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),h,f)
 assert.deepEqual(data,await json(root+'results/training.json'));assert.equal(data.runs.length,3)
 assert.deepEqual([data.runtime.python,data.runtime.numpy,data.runtime.torch],['3.13.17','2.5.4','2.14.1+cpu']);assert.ok(Object.values(data.protocol.limits).every(v=>v===false))
 for(const r of data.runs){
  assert.equal(r.history.length,61);assert.equal(r.finalParameters.length,17)
  for(const h of r.history){
   assert.equal(h.updates,h.epoch*9);assert.equal(h.examplesSeen,h.epoch*256);assert.equal(vector(h).length,17)
   assert.ok(Number.isFinite(h.trainLoss)&&Number.isFinite(h.validationLoss))
   if(h.epoch){assert.deepEqual(h.order.toSorted((a,b)=>a-b),Array.from({length:256},(_,i)=>i));assert.deepEqual(h.order,data.runs[0].history[h.epoch].order)}
   else{assert.equal(h.onlineLoss,null);assert.equal(h.lrUsed,null);assert.deepEqual(h.order,[])}
  }
  near(r.history[20].lrUsed,.1);near(r.history[20].lrNext,.05);near(r.history[60].lrUsed,.025);near(r.history[60].lrNext,.0125)
  assert.deepEqual(r.trace.before,r.trace.afterBackward)
  assert.ok(r.trace.afterStep.some((v,i)=>v!==r.trace.before[i]))
  for(let i=0;i<17;i++)near(r.trace.afterStep[i],r.trace.before[i]-.1*r.trace.gradient[i])
 }
 near(data.runs[0].history.at(-1).validationLoss,.008309222327672137)
})
test('pytorch: la reanudación completa es exacta y omitir estado cambia la trayectoria',()=>{
 const full=data.runs[0]
 assert.equal(data.inference.maxLogitError,0);assert.equal(data.inference.fileReloaded,true);assert.equal(data.inference.modelMode,false);assert.equal(data.inference.parameterCount,17)
 assert.deepEqual(data.inference.before,data.inference.after)
 for(const r of data.resumed){
  assert.deepEqual(r.history.slice(0,31),full.history.slice(0,31))
  const error=Math.max(...r.finalParameters.map((v,i)=>Math.abs(v-full.finalParameters[i])));assert.equal(error,r.maxParameterError)
  if(r.variant==='full'){assert.equal(error,0);assert.deepEqual(r.history,full.history);assert.ok(r.historyExactlyEqual&&r.cpuRngMatchesSaved&&r.loaderRngMatchesSaved)}
  else{assert.ok(error>1e-8);assert.equal(r.historyExactlyEqual,false)}
 }
 assert.ok(data.resumed.find(r=>r.variant==='weights_only').history.at(-1).validationLoss<full.history.at(-1).validationLoss)
 assert.equal(data.resumed.find(r=>r.variant==='order_reset').loaderRngMatchesSaved,false)
})
test('pytorch: controles de broadcasting, modos, alias y agregación conservan diferencias',()=>{
 const p=data.probes
 assert.deepEqual(p.tensors.badShape,[4,4]);assert.deepEqual(p.tensors.goodShape,[4,1]);assert.ok(p.tensors.bceRejected)
 assert.equal(p.tensors.badMse,2.625);assert.equal(p.tensors.goodMse,1.875)
 assert.equal(p.tensors.sharedAfterMutation,9);assert.equal(p.tensors.copiedAfterMutation,0)
 assert.ok(p.modes.evalStillRequiresGrad&&p.modes.noGradStillTraining&&p.modes.dropoutTrainDiffers&&p.modes.dropoutEvalIdentity)
 assert.equal(p.modes.noGradRequiresGrad,false);assert.ok(p.snapshots.shallowChanged&&p.snapshots.deepUnchanged)
 near(p.validationAggregation.loss,.7094226372354705);near(p.validationAggregation.naiveMeanOfBatchMeans,.713554108154547)
 assert.equal(p.validationAggregation.count,128)
})
test('pytorch: siete exports canónicos sin checkpoint binario o control de ejecución',async()=>{
 const ex=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(ex.length,7)
 for(const e of ex){assert.doesNotMatch(e.source,/\.pt$/);assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)))}
 const html=await readFile(root+'explorer.html','utf8'),js=await readFile(root+'explorer.mjs','utf8')
 assert.match(html,/noindex,nofollow/);assert.match(html,/no ejecuta PyTorch/);assert.match(html,/siempre usa seed7/)
 assert.deepEqual([...js.matchAll(/fetch\(([^)]+)\)/g)].map(m=>m[1]),["'./comparison.json'"])
})
