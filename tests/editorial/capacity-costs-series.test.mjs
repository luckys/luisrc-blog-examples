import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { stripTypeScriptTypes } from 'node:module'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'
import { calculate } from '../../packages/capacity-costs/scripts/calculate.mjs'
const root='packages/capacity-costs/'
const json=async p=>JSON.parse(await readFile(p))
const manifest=await json(editorialPath('capacity-costs-series.json'))
const report=await json(root+'comparison.json')
const posts=await Promise.all(manifest.articles.map(async entry=>({entry,source:await readFile(blogPath('src/content/posts/es/'+entry.slug+'.md'),'utf8')})))
const compact=s=>s.replace(/\s/g,'').replaceAll('"',"'").replaceAll(';','').replace(/,(?=[)}\]])/g,'')
test('capacidad: siete drafts específicos, dependencias reales y temario P066',async()=>{
 assert.deepEqual(manifest.articles.map(a=>a.id),['P066','CAP-UTILIZATION','CAP-BOTTLENECKS','CAP-AUTOSCALING','CAP-ESTIMATES','CAP-COMMITMENTS','CAP-FINOPS'])
 const known=new Set(),seen=new Set();let date=-Infinity
 for(const f of await readdir(blogPath('src/content/posts/es'))){const s=await readFile(blogPath('src/content/posts/es/'+f),'utf8');known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const {entry,source} of posts){
  const meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const k of ['id','slug','title','prerequisites'])assert.deepEqual(meta[k],entry[k])
  assert.equal(meta.series,manifest.name);assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft')
  assert.ok(new Date(meta.published).valueOf()>date);date=new Date(meta.published).valueOf()
  for(const id of meta.prerequisites){assert.ok(known.has(id),id);if(id==='P066'||id.startsWith('CAP-'))assert.ok(seen.has(id))}seen.add(meta.id)
  for(const h of ['## Código completo y pruebas','garantías y límites','## Ejercicio:','## Referencias'])assert.ok(source.toLowerCase().includes(h.toLowerCase()),entry.id)
  assert.doesNotMatch(source,/—|WIDTH|HEIGHT|@snippet|@diagram/)
  for(const f of entry.files)await access(root+f)
 }
 assert.equal(new Set(manifest.articles.map(a=>a.question)).size,7)
})
test('capacidad: siete extractos TypeScript del modelo probado y JSON de tarifas exacto',async()=>{
 const model=compact(await readFile(root+'src/model.ts','utf8'));let count=0
 for(const {entry,source} of posts)for(const [,code] of source.matchAll(/```typescript\n([\s\S]*?)\n```/g)){assert.ok(model.includes(compact(code)),entry.id);count++}
 assert.equal(count,7)
 const [,code]=posts[4].source.match(/```json\n([\s\S]*?)\n```/)
 assert.deepEqual(JSON.parse(code),report.input.rates)
})
test('capacidad: siete diagramas pequeños y gráfico con escala monetaria compartida',async()=>{
 let count=0
 for(const {entry,source} of posts){
  await access(blogPath('assets/capacity-costs/'+entry.id+'.d2'))
  for(const [,path,alt,w,h] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)){
   const svg=await readFile(blogPath('public'+path),'utf8');const box=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,box[2]);assert.equal(+h,box[3]);assert.ok(+w<=380);assert.ok(alt.length>80);count++
  }
 }
 assert.equal(count,8)
 const svg=await readFile(root+'cost-scenarios.svg','utf8')
 const values=report.results.cases.flatMap(c=>[BigInt(c.result.subtotal),BigInt(c.result.subtotal)-BigInt(c.result.lines.compute)+BigInt(c.result.staticCompute)])
 const max=Math.max(...values.map(Number))
 for(const n of values)assert.ok(svg.includes((240*Number(n)/max).toFixed(2)))
 assert.match(svg,/tarifas ficticias/)
})
test('capacidad: tres escenarios, contrastes y contadores recalculables, sin mediciones cloud',async()=>{
 assert.equal(report.kind,'calculated_scenarios_and_fluid_simulation_not_measurements')
 assert.deepEqual(report.results,calculate(report.input));assert.equal(Object.keys(report.sources).length,9)
 for(const [f,sha]of Object.entries(report.sources))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),sha,f)
 assert.ok(Object.values(report.limitations).every(v=>v===false))
 assert.deepEqual(report.results.cases.map(c=>c.result.requests),[20736000,120960000,82080000])
 assert.deepEqual(report.results.cases.map(c=>c.result.subtotal),['159516715','358147501','279478662'])
 assert.equal(report.results.cases[2].cpuDouble.feasibleCpuModel,false)
 assert.equal(report.results.cases[2].payloadTenfold.subtotal,'898666613')
 assert.deepEqual(Object.values(report.results.traces).map(t=>t.at(-1).rejected),[2000,0,11000])
 for(const c of report.results.cases){assert.equal(c.result.capacityValidated,false);assert.equal(c.allocation.shares.reduce((a,v)=>a+BigInt(v),0n),BigInt(c.result.subtotal))}
 for(const rows of Object.values(report.results.traces))for(const row of rows)assert.equal(row.arrived,row.served+row.rejected+row.queue)
})
test('capacidad: seis exports canónicos y el navegador usa el modelo tipado sin otra implementación',async()=>{
 assert.equal(await readFile(root+'model.mjs','utf8'),stripTypeScriptTypes(await readFile(root+'src/model.ts','utf8')))
 const exp=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root))
 assert.equal(exp.length,6)
 for(const e of exp)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)))
 const viewer=await readFile(root+'explorer.mjs','utf8'),html=await readFile(root+'explorer.html','utf8')
 assert.match(viewer,/import .*estimate.*simulate.*from '\.\/model.mjs'/)
 assert.deepEqual([...viewer.matchAll(/fetch\(([^)]+)\)/g)].map(m=>m[1]),["'./comparison.json'"])
 assert.match(html,/noindex,nofollow/);assert.match(html,/tarifas ficticias/i)
 assert.match(html,/no la modifica/);assert.match(viewer,/INVIABLE/)
 assert.equal([...posts[4].source.matchAll(/^\| ---/gm)].length,2)
 assert.equal([...posts[4].source.matchAll(/<div role="region"/g)].length,2)
})
