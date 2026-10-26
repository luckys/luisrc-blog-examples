import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from'node:test'
import assert from'node:assert/strict'
import{readFile,readdir,access}from'node:fs/promises'
import{createHash}from'node:crypto'
import YAML from'yaml'
import{blogPath}from'../../scripts/blog-path.mjs'
import{curve}from'../../packages/convolutional-networks/charts.mjs'
const root='packages/convolutional-networks/',json=async p=>JSON.parse(await readFile(p))
const manifest=await json(editorialPath('convolutional-networks-series.json')),data=await json(root+'comparison.json')
const posts=await Promise.all(manifest.articles.map(async a=>({a,source:await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')})))
const compact=s=>s.replace(/\s/g,'').replaceAll('"',"'")
test('CNN: nueve preguntas, drafts y dependencias reales en orden',async()=>{
 assert.equal(posts.length,9);assert.equal(new Set(manifest.articles.map(a=>a.question)).size,9)
 const known=new Set(),seen=new Set(),local=new Set(manifest.articles.map(a=>a.id));let previous=-Infinity
 for(const name of await readdir(blogPath('src/content/posts/es'))){if(!/\.mdx?$/.test(name))continue;const source=await readFile(blogPath('src/content/posts/es/'+name),'utf8');known.add(YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]).id)}
 for(const{a,source}of posts){const meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
  for(const k of ['id','slug','title','prerequisites'])assert.deepEqual(meta[k],a[k])
  assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,manifest.name);assert.equal(a.roadmapId,'P101')
  assert.ok(+new Date(meta.published)>previous);previous=+new Date(meta.published)
  for(const id of a.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id),id)}seen.add(a.id)
  assert.equal(a.objectives.length,3);assert.equal(a.commonErrors.length,3)
  for(const h of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias'])assert.ok(source.includes(h),a.id)
  assert.doesNotMatch(source,/<!-- diagram -->|—/)
  for(const file of a.files)await access(root+file)
 }
})
test('CNN: nueve extractos Python coinciden con fuentes ejecutadas',async()=>{
 const code=compact((await Promise.all(['geometry.py','networks.py','training.py','probes.py'].map(f=>readFile(root+f,'utf8')))).join('\n'));let count=0
 for(const{a,source}of posts)for(const[,snippet]of source.matchAll(/```python\n([\s\S]*?)\n```/g)){assert.ok(code.includes(compact(snippet)),a.id);count++}
 assert.equal(count,9)
})
test('CNN: figuras con tamaño nativo, escalas y datos archivados',async()=>{
 let count=0
 for(const{a,source}of posts){await access(blogPath('assets/convolutional-networks/'+a.id+'.d2'))
  for(const[,path,alt,w,h,cap]of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"[^>]+max-width:(\d+)px/g)){
   const svg=await readFile(blogPath('public'+path),'utf8'),v=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
   assert.equal(+w,v[2]);assert.equal(+h,v[3]);assert.ok(+cap<=380);assert.ok(alt.length>65);count++
  }
 }
 assert.equal(count,12)
 const source=data.runs.find(r=>r.id==='source-7')
 assert.equal(await readFile(root+'source-curves.svg','utf8'),curve(['trainLoss','validationLoss'].map(name=>({name,points:source.history.map(p=>({x:p.epoch,y:p[name]}))})),'Source · cuatro orientaciones · seed 7'))
})
test('CNN: quince entrenamientos, once hashes y protocolo completo',async()=>{
 assert.equal(data.kind,'convolutional_network_observations');assert.deepEqual(data.protocol,await json(root+'protocol.json'));assert.deepEqual(data,await json(root+'results/training.json'))
 assert.equal(Object.keys(data.sourceHashes).length,11)
 for(const[f,hash]of Object.entries(data.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),hash,f)
 assert.deepEqual(data.runtime,{python:'3.13.17',numpy:'2.5.4',torch:'2.14.1+cpu'})
 assert.equal(data.runs.length,15)
 for(const r of data.runs){assert.equal(r.history.length,41);assert.equal(r.updates,r.mode==='source'?320:80);assert.equal(r.history[0].epoch,0);assert.equal(r.history.at(-1).epoch,40)
  assert.equal(r.trainableParameters,r.mode==='source'?372:r.mode.includes('frozen')?18:354)
  if(r.mode.includes('frozen'))assert.equal(r.backboneMaxChange,0)
  for(const p of r.history)for(const key of ['trainLoss','validationLoss','trainAccuracy','validationAccuracy'])assert.ok(Number.isFinite(p[key]))
 }
})
test('CNN: transferencia desfavorable se conserva, sin criterio universal de mejora',()=>{
 for(const seed of data.protocol.seeds){
  const at=mode=>data.runs.find(r=>r.seed===seed&&r.mode===mode).history.at(-1)
  assert.equal(at('source').validationAccuracy,1)
  assert.ok(at('scratch').validationAccuracy>at('frozen').validationAccuracy)
  assert.ok(at('scratch').validationAccuracy>at('fine_tune').validationAccuracy)
 }
 assert.ok(posts.at(-1).source.includes('No sabemos cuánto corresponde'))
})
test('CNN: mapas reales y gradiente local respetan dimensiones y soporte',()=>{
 assert.deepEqual(data.features.map(f=>f.index),[0,32,64,96])
 for(const f of data.features){assert.equal(f.input.length,24);assert.equal(f.maps.conv1_pre.length,4);assert.equal(f.maps.conv2_pre.length,8);assert.equal(f.maps.conv2_pre[0].length,12)
  for(let c=0;c<4;c++)for(let row=0;row<24;row++)for(let col=0;col<24;col++)assert.equal(f.maps.conv1_relu[c][row][col],Math.max(0,f.maps.conv1_pre[c][row][col]))
  for(const g of f.gradients)for(let row=0;row<24;row++)for(let col=0;col<24;col++)if(row<9||row>16||col<9||col>16)assert.equal(g[row][col],0)
 }
 assert.ok(data.probes.cases.every(c=>c.maxError===0))
 assert.deepEqual(data.probes.receptiveField.at(-1),{size:8,jump:2,start:1})
})
test('CNN: exportaciones proceden del monorepo y los posts enlazan fuentes reales',async()=>{
 const exports=await json('metadata/blog-exports.json'),subset=exports.filter(e=>e.source.startsWith(root));assert.equal(subset.length,8)
 for(const e of subset)assert.equal(await readFile(e.source,'utf8'),await readFile(blogPath(e.destination),'utf8'))
 for(const{source}of posts){assert.match(source,/https:\/\/github.com\/luckys\/luisrc-blog-examples.git/);assert.match(source,/blob\/main\/packages\/convolutional-networks\//)}
})
