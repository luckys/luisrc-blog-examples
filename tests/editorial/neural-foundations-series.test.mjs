import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,access,readdir}from'node:fs/promises'
import{createHash}from'node:crypto'
import YAML from'yaml'
import{blogPath}from'../../scripts/blog-path.mjs'
import{infer}from'../../packages/neural-foundations/inference.mjs'
import{lossChart}from'../../packages/neural-foundations/charts.mjs'
const root='packages/neural-foundations/',json=async p=>JSON.parse(await readFile(p))
const manifest=await json(editorialPath('neural-foundations-series.json')),data=await json(root+'training.json')
const posts=await Promise.all(manifest.articles.map(async entry=>({entry,source:await readFile(blogPath('src/content/posts/es/'+entry.slug+'.md'),'utf8')})))
const compact=s=>s.replace(/\s/g,'').replaceAll('"',"'")
test('neural: cinco drafts P096 con preguntas y objetivos específicos, dependencias anteriores',async()=>{
 assert.deepEqual(manifest.articles.map(a=>a.id),['P096','DL-DENSE','DL-ACTIVATIONS','DL-XOR','DL-REPRESENTATIONS'])
 const known=new Set(),seen=new Set();let date=-Infinity
 for(const file of await readdir(blogPath('src/content/posts/es'))){const s=await readFile(blogPath('src/content/posts/es/'+file),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const{entry,source}of posts){
  const meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const k of ['id','title','slug','prerequisites'])assert.deepEqual(meta[k],entry[k])
  assert.equal(meta.locale,'es');assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.series,manifest.name);assert.equal(meta.draft,true);assert.equal(meta.status,'draft')
  assert.ok(new Date(meta.published).valueOf()>date);date=new Date(meta.published).valueOf()
  for(const id of meta.prerequisites){assert.ok(known.has(id),id);if(id==='P096'||id.startsWith('DL-'))assert.ok(seen.has(id))}seen.add(entry.id)
  assert.equal(entry.objectives.length,3);assert.equal(entry.commonErrors.length,3)
  for(const heading of ['## Código completo y pruebas','## Garantías y límites','## Ejercicio:','## Referencias'])assert.ok(source.includes(heading),entry.id)
  for(const f of entry.files)await access(root+f)
  assert.doesNotMatch(source,/—|WIDTH|HEIGHT|@code|@diagram/)
 }
 assert.equal(new Set(manifest.articles.map(a=>a.question)).size,5)
})
test('neural: nueve extractos Python corresponden al modelo y experimento probados',async()=>{
 const code=compact((await readFile(root+'neural.py','utf8'))+(await readFile(root+'experiments.py','utf8')));let count=0
 for(const{entry,source}of posts)for(const[,s]of source.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(code.includes(compact(s)),entry.id);count++}
 assert.equal(count,9)
})
test('neural: diagramas y tres gráficas tienen dimensiones y fuentes canónicas',async()=>{
 let count=0
 for(const{entry,source}of posts){await access(blogPath('assets/neural-foundations/'+entry.id+'.d2'))
  for(const[,path,alt,w,h]of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),box=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,box[2]);assert.equal(+h,box[3]);assert.ok(+w<=380);assert.ok(alt.length>80);count++
  }
 }
 assert.equal(count,8)
 assert.equal(await readFile(root+'training-curves.svg','utf8'),lossChart(data.results.cases)+'\n')
 assert.match(await readFile(root+'decision-maps.svg','utf8'),/sin evaluación/)
})
test('neural: cinco entrenamientos, splits y controles sustentan solo el resultado sintético',async()=>{
 assert.equal(data.kind,'numpy_training_observations_on_synthetic_xor')
 assert.deepEqual(data.protocol,await json(root+'protocol.json'))
 assert.equal(Object.keys(data.sources).length,8)
 for(const[f,sha]of Object.entries(data.sources))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),sha,f)
 assert.ok(Object.values(data.limits).every(v=>v===false));assert.equal(data.runtime.numpy,'2.5.3');assert.equal(data.runtime.python,'3.13.15')
 assert.deepEqual(data.results.cases.map(c=>c.id),['linear','zero','mlp-7','mlp-19','mlp-31'])
 assert.deepEqual(data.results.cases.map(c=>c.test.accuracy),[.5,.5,1,1,1])
 assert.deepEqual(data.results.cases.map(c=>c.parameterCount),[3,17,17,17,17])
 for(const c of data.results.cases){assert.equal(c.history.length,21);assert.equal(c.history[0].epoch,0);assert.equal(c.history.at(-1).epoch,3000);assert.equal(c.testProbability.length,256)}
 assert.ok(data.results.cases[1].history.every(h=>h.trainLoss===Math.log(2)))
 assert.deepEqual(Object.values(data.results.splits).map(s=>s.x.length),[256,128,256])
 const all=new Set()
 for(const s of Object.values(data.results.splits)){assert.equal(s.y.reduce((a,b)=>a+b,0),s.y.length/2);for(const p of s.x){assert.ok(p.every(v=>Math.abs(v)>=.55&&Math.abs(v)<=1.45));const key=JSON.stringify(p);assert.ok(!all.has(key));all.add(key)}}
 assert.match(posts[3].source,/256 puntos de test/);assert.match(posts[4].source,/No evalúa|no evalúa|No hemos muestreado/)
})
test('neural: inferencia, pesos y métricas se corresponden; test no decide checkpoints',()=>{
 for(const c of data.results.cases)for(const h of c.history){
  const split=data.results.splits.validation,p=split.x.map(x=>infer(x,h.layers))
  const accuracy=p.filter((v,i)=>Number(v.probability>=.5)===split.y[i]).length/p.length
  assert.equal(accuracy,h.validationAccuracy)
  const loss=p.reduce((a,v,i)=>a+Math.max(v.logit,0)+Math.log1p(Math.exp(-Math.abs(v.logit)))-split.y[i]*v.logit,0)/p.length
  assert.ok(Math.abs(loss-h.validationLoss)<2e-12)
  assert.equal(h.test,undefined);assert.equal(h.testAccuracy,undefined)
 }
 assert.equal(data.protocol.training.earlyStopping,false);assert.equal(data.protocol.training.testSelection,false)
})
test('neural: ocho exports exactos y visor sin entrenamiento o control remoto',async()=>{
 const exports=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(exports.length,8)
 for(const e of exports)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)))
 const viewer=await readFile(root+'explorer.mjs','utf8'),html=await readFile(root+'explorer.html','utf8')
 assert.deepEqual([...viewer.matchAll(/fetch\(([^)]+)\)/g)].map(m=>m[1]),["'./training.json'"])
 assert.match(html,/noindex,nofollow/);assert.match(html,/no cambia|no cambian/i);assert.match(viewer,/No se evalúa en este checkpoint/)
 assert.equal([...posts[3].source.matchAll(/^\| ---/gm)].length,1)
 assert.equal([...posts[3].source.matchAll(/<div role="region"/g)].length,1)
})
