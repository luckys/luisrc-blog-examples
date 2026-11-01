import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';
const manifest=JSON.parse(await readFile('docs/editorial/vector-retrieval-series.json'));
test('VEC: nine drafts have exact code, existing links and explicit review state',async()=>{
 assert.equal(manifest.status,'draft');assert.ok(['in_review','verified_drafts'].includes(manifest.editorialState));assert.equal(manifest.plannedIds.length,9);assert.equal(manifest.articles.length,9);
 const pooling=(await Promise.all(['pooling.mjs','vectors.mjs','geometry-examples.mjs','native-index.mjs','bench-native.mjs','bench-postgres.mjs','../lexical-search/evaluation.mjs','saved-panels.mjs'].map(f=>readFile('packages/vector-retrieval/'+f,'utf8')))).join('\n');
 for(const a of manifest.articles){
  const source=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8'),meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],a[key]);
  assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.locale,'es');assert.equal(meta.series,manifest.name);assert.ok(source.split(/\s+/).length>1000);assert.doesNotMatch(source,/—|\[\[/);
  for(const[,snippet]of source.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(pooling.replace(/\s+/g,'').includes(snippet.replace(/\s+/g,'')));
  for(const file of a.files)await access('packages/vector-retrieval/'+file);
  for(const[,slug]of source.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
  assert.deepEqual(await readFile(blogPath('assets/vector-retrieval/'+a.id+'.svg')),await readFile(blogPath('public/assets/visuals/vector-retrieval/'+a.id+'.svg')));
  if(a.id==='P111'){assert.ok(source.includes('0,778'));assert.ok(source.includes('0,833'));}
  assert.ok(source.includes('/assets/interactive/vector-retrieval/explorer.html'));
  for(const file of ['explorer.html','explorer.mjs','geometry.mjs','geometry-diagram.mjs','neighbor-diagram.mjs','vectors.mjs','viewer-data.json','native-recall.svg','serialized-size.svg','quality-comparison.svg','saved-panels.mjs','pg-recall.svg','native-latency.svg','postgres-latency.svg'])assert.deepEqual(await readFile('packages/vector-retrieval/'+file),await readFile(blogPath('public/assets/interactive/vector-retrieval/'+file)));
 }
});

test('VEC: browser pack preserves40 genuine vectors and keeps unlabeled index controls separate',async()=>{
 const pack=JSON.parse(await readFile('packages/vector-retrieval/viewer-data.json')),saved=JSON.parse(await readFile('packages/vector-retrieval/results/embeddings.json'));
 assert.equal(pack.kind,'saved_embedding_geometry_not_live_model');assert.equal(pack.rows.length,40);assert.equal(pack.encodingCapturedAt,saved.capturedAt);
 assert.deepEqual(pack.rows,saved.rows.filter(r=>r.kind!=='index-control').map(({id,kind,text,rawVector})=>({id,kind,text,rawVector})));
 assert.deepEqual(pack.quality,JSON.parse(await readFile('packages/vector-retrieval/results/quality.json')));
 assert.deepEqual(pack.encodingHashes,saved.sourceHashes);
});

test('VEC: native panel preserves140 original neighborhoods and1000texts without exporting980 extra vectors',async()=>{
 const pack=JSON.parse(await readFile('packages/vector-retrieval/viewer-data.json')),native=JSON.parse(await readFile('packages/vector-retrieval/results/native-index.json')),embedding=JSON.parse(await readFile('packages/vector-retrieval/results/embeddings.json'));
 for(const key of ['capturedAt','kind','sourceHashes','config','strategies','builds','neighbors','summaries'])assert.deepEqual(pack.native[key],native[key]);
 assert.equal(pack.native.neighbors.length,140);assert.equal(pack.indexDocuments.length,1000);
 assert.deepEqual(pack.indexDocuments,embedding.rows.filter(r=>r.kind!=='query').map(({id,kind,text})=>({id,kind,text})));
 assert.ok(pack.indexDocuments.every(r=>!('rawVector' in r)));assert.equal(pack.rows.length,40);
});
test('VEC: six ECharts figures are deterministic and exactly derived from captured data',async()=>{
 const{recallChart,sizeChart,qualityChart,postgresRecallChart,latencyChart}=await import('../../packages/vector-retrieval/charts.mjs');
 const native=JSON.parse(await readFile('packages/vector-retrieval/results/native-index.json')),quality=JSON.parse(await readFile('packages/vector-retrieval/results/quality.json')),postgres=JSON.parse(await readFile('packages/vector-retrieval/results/postgres.json'));
 for(const[file,fn,input]of [['native-recall.svg',recallChart,native.summaries],['serialized-size.svg',sizeChart,native.builds],['quality-comparison.svg',qualityChart,quality.summaries],['pg-recall.svg',postgresRecallChart,postgres.summaries],['native-latency.svg',s=>latencyChart(s,'native'),native.summaries],['postgres-latency.svg',s=>latencyChart(s,'postgres'),postgres.summaries]]){
  const a=fn(input),b=fn(input);assert.ok(a===b,'stable SVG identifiers');assert.ok((await readFile('packages/vector-retrieval/'+file,'utf8'))===a,file);assert.ok(a.includes('viewBox="0 0 360 380"'));
 }
});

test('VEC: SQL excerpts are the actual captured schema,query and index parameters',async()=>{
 const source=await readFile(blogPath('src/content/posts/es/pgvector-postgresql-distancias-hnsw-planes-ejecucion.md'),'utf8');
 const script=await readFile('packages/vector-retrieval/bench-postgres.mjs','utf8');
 const saved=JSON.parse(await readFile('packages/vector-retrieval/results/postgres.json'));
 const snippets=[...source.matchAll(/```sql\n([\s\S]*?)\n```/g)].map(m=>m[1].replace(/\s+/g,' ').trim());
 assert.equal(snippets.length,3);
 const compact=value=>value.replace(/\s+/g,'');
 assert.ok(compact(script).includes(compact(snippets[0])));assert.ok(compact(script).includes(compact(snippets[1])));
 const expected=`CREATE INDEX documents_embedding_hnsw ON documents USING hnsw (embedding vector_cosine_ops) WITH (m=${saved.config.m}, ef_construction=${saved.config.efConstruction})`;
 assert.equal(snippets[2],expected);
 const walk=n=>[n,...(n.Plans||[]).flatMap(walk)];
 for(const key of ['exact','unforcedAfterIndex'])assert.ok(walk(saved.plans[key][0].Plan).some(n=>n['Node Type']==='Seq Scan'));
 for(const key of ['hnsw-ef4','hnsw-ef16','hnsw-ef64'])assert.ok(walk(saved.plans[key][0].Plan).some(n=>n['Index Name']==='documents_embedding_hnsw'&&n['Actual Loops']>0));
 assert.equal(saved.plans['hnsw-ef4'][0].Plan['Actual Rows'],4);
});
test('VEC: browser pack preserves original PG neighborhoods/plans and all6600 measured times',async()=>{
 const pack=JSON.parse(await readFile('packages/vector-retrieval/viewer-data.json'));
 for(const [engine,file] of [['native','native-index'],['postgres','postgres']]){
  const saved=JSON.parse(await readFile('packages/vector-retrieval/results/'+file+'.json'));
  assert.deepEqual(pack[engine].measurements,saved.measurements.map(({round,strategy,queryId,elapsedMs})=>({round,strategy,queryId,elapsedMs})));
 }
 const saved=JSON.parse(await readFile('packages/vector-retrieval/results/postgres.json'));
 for(const key of ['capturedAt','kind','sourceHashes','config','versions','indexBuildMs','indexBytes','plans','neighbors','summaries'])assert.deepEqual(pack.postgres[key],saved[key]);
 assert.equal(pack.native.measurements.length+pack.postgres.measurements.length,6600);
 assert.equal(pack.postgres.neighbors.length,80);
});
