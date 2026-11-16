import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';
const base='packages/retrieval-strategies/',json=async file=>JSON.parse(await readFile(base+file)),manifest=JSON.parse(await readFile('docs/editorial/retrieval-strategies-series.json'));
test('RETRIEVAL: seven focused Spanish drafts have exact code,real sources and a fixed chain',async()=>{
 assert.equal(manifest.status,'draft');assert.equal(manifest.editorialState,'verified_drafts');assert.equal(manifest.articles.length,7);assert.deepEqual(manifest.articles.map(a=>a.id),manifest.plannedIds);
 const code=(await Promise.all(['ranking.mjs','evaluate.mjs','../lexical-search/retrieval.mjs'].map(file=>readFile(base+file,'utf8')))).join('\n');
 for(const [i,a]of manifest.articles.entries()){
  const source=await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8'),meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],a[key]);assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.series,manifest.name);assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.locale,'es');assert.ok(source.split(/\s+/).length>1000);assert.doesNotMatch(source,/—|\[\[/);
  if(i)assert.deepEqual(a.prerequisites,[manifest.articles[i-1].id]);else assert.deepEqual(a.prerequisites,['P106','P111','P112']);
  for(const [,snippet]of source.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.replace(/\s+/g,'').includes(snippet.replace(/\s+/g,'')),a.id);
  for(const file of a.files)await access(base+file);
  for(const[,slug]of source.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
  assert.deepEqual(await readFile(blogPath('assets/retrieval-strategies/'+a.id+'.svg')),await readFile(blogPath('public/assets/visuals/retrieval-strategies/'+a.id+'.svg')));assert.ok(source.includes('/assets/interactive/retrieval-strategies/explorer.html'));
 }
});
test('RETRIEVAL: twelve public resources match canonical sources and preserve inputs/results/vectors',async()=>{
 const exports=JSON.parse(await readFile('metadata/blog-exports.json')),rows=exports.filter(r=>r.source.startsWith(base));assert.equal(rows.length,12);
 for(const row of rows)assert.deepEqual(await readFile(row.source),await readFile(blogPath(row.destination)));
 const pack=await json('viewer-data.json'),inputs=await json('results/inputs.json'),results=await json('results/retrieval.json'),embeddings=await json('results/embeddings.json');assert.equal(pack.kind,'saved_retrieval_outcomes_no_live_model');assert.deepEqual(pack.inputs,inputs);assert.deepEqual(pack.results,results);assert.deepEqual(pack.vectors,embeddings.rows.map(({id,rawVector})=>({id,vector:rawVector})));
 assert.equal(inputs.chunks.length,13);assert.equal(inputs.texts.length,33);assert.equal(results.rows.length,60);assert.equal(results.filters.length,36);assert.equal(results.multi.length,7);assert.equal(results.rewrites.length,16);
 assert.equal(results.multi.find(r=>r.queryId==='Q08').metrics.coverage,0);assert.equal(results.rewrites.find(r=>r.queryId==='Q13'&&r.kind==='unsafe').guard.accepted,true);
 assert.equal(results.rows.find(r=>r.queryId==='Q14'&&r.method==='bm25').metrics.coverage,1);assert.equal(results.rows.find(r=>r.queryId==='Q14'&&r.method==='rrf').metrics.coverage,0);
 assert.deepEqual(results.rows.filter(r=>r.queryId==='Q20').map(r=>r.metrics.returned),[0,3,3]);assert.ok(results.rows.filter(r=>['Q19','Q20'].includes(r.queryId)).every(r=>r.metrics.coverage===null));
});
test('RETRIEVAL: seven figures are deterministic derivatives of archived outcomes',async()=>{
 const charts=await import('../../packages/retrieval-strategies/charts.mjs'),data=await json('viewer-data.json');
 for(const[file,name,height]of [['lexical-terms.svg','lexicalChart',460],['dense-evidence.svg','denseChart',720],['rrf-contributions.svg','fusionChart',520],['filter-counts.svg','filterChart',420],['multi-coverage.svg','multiChart',440],['rewrite-acceptance.svg','rewriteChart',380],['retriever-evidence.svg','evaluationChart',500]]){
  const svg=charts[name](data);assert.equal(svg,charts[name](data));assert.equal(svg,await readFile(base+file,'utf8'));assert.ok(svg.includes('viewBox="0 0 360 '+height+'"'));
 }
});
