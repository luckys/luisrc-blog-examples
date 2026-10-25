import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir,access} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import YAML from 'yaml'
import {blogPath} from '../../scripts/blog-path.mjs'
import {selectRuns} from '../../packages/training-dynamics/model.mjs'
import {curveChart} from '../../packages/training-dynamics/charts.mjs'
const root='packages/training-dynamics/',json=async p=>JSON.parse(await readFile(p))
const m=await json(blogPath('docs/editorial/training-dynamics-series.json')),data=await json(root+'comparison.json')
const posts=await Promise.all(m.articles.map(async a=>({a,s:await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')})))
const near=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`),compact=s=>s.replace(/\s/g,'').replaceAll('"',"'")
test('training: siete preguntas P098 con orden y metadatos de drafts españoles',async()=>{
 assert.deepEqual(m.articles.map(a=>a.id),['P098','DL-SGD','DL-MOMENTUM','DL-ADAM','DL-ADAMW','DL-SCHEDULES','DL-ACCUMULATION'])
 const known=new Set(),seen=new Set(),local=new Set(m.articles.map(a=>a.id));let date=-Infinity
 for(const f of await readdir(blogPath('src/content/posts/es'))){const s=await readFile(blogPath('src/content/posts/es/'+f),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const{a,s}of posts){
  const meta=YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const key of ['id','slug','title','prerequisites'])assert.deepEqual(meta[key],a[key])
  assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,m.name)
  assert.ok(+new Date(meta.published)>date);date=+new Date(meta.published)
  for(const id of a.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id),id)}seen.add(a.id)
  assert.equal(a.objectives.length,3);assert.equal(a.commonErrors.length,3)
  assert.ok(a.question.length>30);assert.doesNotMatch(s,/@diagram@|@\w+-graph@|—/)
  for(const title of ['## Código completo y pruebas','## Garantías y límites','## Ejercicio:','## Referencias'])assert.ok(s.includes(title),a.id)
  for(const f of a.files)await access(root+f)
 }
 assert.equal(new Set(m.articles.map(a=>a.question)).size,7)
})
test('training: nueve extractos Python coinciden con fuentes ejecutadas',async()=>{
 const source=compact((await Promise.all(['optimizers.py','training.py'].map(f=>readFile(root+f,'utf8')))).join('\n'));let count=0
 for(const{a,s}of posts)for(const[,code]of s.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(source.includes(compact(code)),a.id);assert.match(s,/packages\/training-dynamics\/\w+\.py/);count++}
 assert.equal(count,9)
})
test('training: siete diagramas, tres gráficos reproducibles y figuras con tamaño explícito',async()=>{
 let count=0
 for(const{a,s}of posts){await access(blogPath('assets/training-dynamics/'+a.id+'.d2'))
  for(const[,path,alt,w,h,cap]of s.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]+max-width:(\d+)px/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),box=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,box[2]);assert.equal(+h,box[3]);assert.ok(+cap<=380);assert.ok(alt.length>80);count++
  }
 }
 assert.equal(count,10)
 for(const[file,options]of Object.entries({'optimizer-curves.svg':{},'batch-curves.svg':{group:'batch',axis:'epoch'},'learning-rates.svg':{group:'schedule',metric:'lrLast'}}))assert.equal(await readFile(root+file,'utf8'),curveChart(data,options)+'\n')
})
test('training: protocolo, fuentes y 17 runs sustentan el presupuesto declarado',async()=>{
 assert.equal(data.kind,'optimizer_training_observations');assert.deepEqual(data.protocol,await json(root+'protocol.json'));assert.equal(Object.keys(data.sources).length,12)
 for(const[f,hash]of Object.entries(data.sources))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),hash,f)
 assert.deepEqual(data,await json(root+'results/training.json'));assert.equal(data.runs.length,17)
 assert.deepEqual([data.runtime.python,data.runtime.numpy,data.runtime.torch],['3.13.17','2.5.4','2.14.1+cpu']);assert.ok(Object.values(data.protocol.limits).every(v=>v===false))
 for(const seed of [7,19,31]){
  const runs=selectRuns(data,'optimizers',seed)
  assert.equal(new Set(runs.map(r=>r.orderHash)).size,1)
  assert.equal(new Set(runs.map(r=>r.history[0].trainLoss)).size,1)
 }
 for(const r of data.runs){
  assert.equal(r.history.length,81);assert.equal(r.parameters.length,17)
  assert.equal(r.updates,80*Math.ceil(256/r.batchSize));assert.equal(r.examplesSeen,20480)
  assert.equal(r.history[0].lrLast,null)
  for(const h of r.history){assert.equal(h.updates,h.epoch*Math.ceil(256/r.batchSize));assert.equal(h.examplesSeen,h.epoch*256);assert.ok(Number.isFinite(h.trainLoss)&&Number.isFinite(h.validationLoss))}
 }
 assert.deepEqual(selectRuns(data,'batch',7).map(r=>r.updates),[640,1280,80])
 near(data.runs.find(r=>r.id==='sgd-7').history.at(-1).validationLoss,.05437991040610826)
 near(data.runs.find(r=>r.id==='momentum-cosine').history.at(-1).validationLoss,.00741004589654176)
})
test('training: reconstruir tres updates por run distingue estado y decay acoplado',()=>{
 for(const r of data.runs){
  let m=Array(17).fill(0),v=Array(17).fill(0)
  for(const row of r.trace){
   const nextM=[],nextV=[]
   for(let i=0;i<17;i++){
    const g=row.gradient[i]+(r.optimizer==='adamw'?0:r.options.decay*row.before[i]);let direction=g
    if(r.optimizer==='momentum'){nextM[i]=.9*m[i]+g;nextV[i]=0;direction=nextM[i]}
    else if(r.optimizer.startsWith('adam')){
     nextM[i]=.9*m[i]+.1*g;nextV[i]=.999*v[i]+.001*g*g
     direction=(nextM[i]/(1-.9**row.update))/(Math.sqrt(nextV[i]/(1-.999**row.update))+1e-8)
    }else{nextM[i]=0;nextV[i]=0}
    near(nextM[i],row.m[i]);near(nextV[i],row.v[i])
    const base=row.before[i]*(r.optimizer==='adamw'?1-row.lr*r.options.decay:1)
    near(row.after[i],base-row.lr*direction)
   }m=nextM;v=nextV
  }
 }
})
test('training: controles detectan promedio de medias y conservan steps efectivos',()=>{
 const a=data.accumulation
 near(Math.max(...a.whole.map((v,i)=>Math.abs(v-a.weighted[i]))),a.maxWeightedError,1e-18)
 near(Math.max(...a.whole.map((v,i)=>Math.abs(v-a.naive[i]))),a.maxNaiveError)
 assert.ok(a.maxWeightedError<1e-14);assert.ok(a.maxNaiveError>.04)
 for(const p of a.training){assert.equal(p.wholeUpdates,40);assert.equal(p.microUpdates,40);assert.ok(p.maxParameterError<1e-14)}
 near(data.decay[0].after,1.9900000005);near(data.decay[1].after,1.998)
 for(const c of data.scalar)for(const[p,next]of c.points.slice(0,-1).map((p,i)=>[p,c.points[i+1]])){near(next.theta,p.theta-c.lr*10*p.theta);near(p.loss,5*p.theta*p.theta)}
})
test('training: ocho exports exactos, visor local y datos sin ejecución de framework',async()=>{
 const exports=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(exports.length,8)
 for(const e of exports)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)))
 const js=await readFile(root+'explorer.mjs','utf8'),html=await readFile(root+'explorer.html','utf8')
 assert.deepEqual([...js.matchAll(/fetch\(([^)]+)\)/g)].map(m=>m[1]),["'./comparison.json'"])
 assert.match(html,/noindex,nofollow/);assert.match(html,/no entrena una red/);assert.match(html,/BatchNorm/)
})
