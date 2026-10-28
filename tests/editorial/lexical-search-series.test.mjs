import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';
import {editorialPath} from '../../scripts/editorial-path.mjs';
import {experiment} from '../../packages/lexical-search/experiments.mjs';
const root='packages/lexical-search/',json=async p=>JSON.parse(await readFile(p));
const m=await json(editorialPath('lexical-search-series.json')),d=await json(root+'comparison.json');
const posts=await Promise.all(m.articles.map(async a=>({a,s:await readFile(blogPath('src/content/posts/es/'+a.slug+'.md'),'utf8')})));
test('lexical: eleven focused Spanish drafts, IDs and ordered prerequisites',async()=>{
 assert.equal(posts.length,11);const known=new Set(),ids=new Set(),slugs=new Set(),seen=new Set(),local=new Set(m.articles.map(a=>a.id));let previous=-Infinity;
 for(const file of await readdir(blogPath('src/content/posts/es'))){if(!/\.mdx?$/.test(file))continue;const s=await readFile(blogPath('src/content/posts/es/'+file),'utf8'),a=YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]);if(a.id){assert.ok(!ids.has(a.id),a.id);ids.add(a.id);}assert.ok(!slugs.has(a.slug),a.slug);slugs.add(a.slug);known.add(a.id);}
 assert.equal(new Set(m.articles.map(a=>a.question)).size,11);
 for(const{a,s}of posts){const meta=YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]);for(const k of ['id','title','slug','prerequisites'])assert.deepEqual(meta[k],a[k]);assert.equal(meta.locale,'es');assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,m.name);assert.equal(a.roadmapId,'P106');assert.ok(+new Date(meta.published)>previous);previous=+new Date(meta.published);for(const id of a.prerequisites){assert.ok(known.has(id),id);if(local.has(id))assert.ok(seen.has(id),id);}seen.add(a.id);assert.equal(a.objectives.length,3);assert.equal(a.commonErrors.length,3);assert.doesNotMatch(s,/—|\[\[/);for(const h of ['## Garantías y límites','## Ejercicio:','## Código completo y pruebas','## Referencias'])assert.ok(s.includes(h),a.id);for(const file of a.files)await access(root+file);}
});
test('lexical: eleven exact executed JavaScript excerpts and complete source links',async()=>{
 const source=(await Promise.all(['analysis.mjs','retrieval.mjs','evaluation.mjs','subwords.mjs'].map(f=>readFile(root+f,'utf8')))).join('\n');let n=0;
 for(const{a,s}of posts){for(const[,code]of s.matchAll(/```javascript\n([\s\S]*?)\n```/g)){assert.ok(source.includes(code),a.id);n++;}assert.ok(s.includes('https://github.com/luckys/luisrc-blog-examples.git'));assert.ok(s.includes('packages/lexical-search/queries.json'));assert.ok(s.includes('packages/lexical-search/results/observations.json'));}assert.equal(n,11);
});
test('lexical: eleven diagrams, four numerical figures and twelve exact exports',async()=>{
 let n=0;for(const{a,s}of posts){await access(blogPath('assets/lexical-search/'+a.id+'.d2'));for(const[,path,alt,w,h]of s.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)){const svg=await readFile(blogPath('public'+path),'utf8'),v=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);assert.equal(+w,v[2]);assert.equal(+h,v[3]);assert.ok(alt.length>80);n++;}}assert.equal(n,15);
 const exports=(await json('metadata/blog-exports.json')).filter(e=>e.source.startsWith(root));assert.equal(exports.length,12);for(const e of exports)assert.deepEqual(await readFile(e.source),await readFile(blogPath(e.destination)));
});
test('lexical: fixed labels, nine hashes and every result recomputed',async()=>{
 assert.equal(d.kind,'lexical_search_observations');assert.deepEqual(d,await json(root+'results/observations.json'));assert.equal(Object.keys(d.sourceHashes).length,9);for(const[f,hash]of Object.entries(d.sourceHashes))assert.equal(createHash('sha256').update(await readFile(root+f)).digest('hex'),hash,f);
 assert.deepEqual(d.protocol,await json(root+'protocol.json'));assert.deepEqual(d.corpus,await json(root+'corpus.json'));assert.deepEqual(d.queries,await json(root+'queries.json'));assert.equal(d.corpus.length,20);assert.equal(d.queries.length,20);assert.equal(d.variants.length,6);assert.equal(d.variants.reduce((s,v)=>s+v.rows.length,0),120);
 const actual=experiment(d.corpus,d.queries,d.lexicon,d.protocol);for(const key of Object.keys(actual))assert.deepEqual(actual[key],d[key]);
});
test('lexical: errors remain visible despite better aggregate recall',()=>{
 const query=(v,q)=>d.variants.find(x=>x.id===v).rows.find(x=>x.id===q),ids=r=>r.ranking.slice(0,3).map(r=>r.id);
 assert.deepEqual(ids(query('bm25-fold','Q19')),[]);assert.equal(ids(query('bm25-char3','Q19'))[0],'D17');
 assert.equal(query('bm25-fold','Q17').metrics.rr,1);assert.equal(query('bm25-char3','Q17').metrics.rr,1/3);assert.deepEqual(ids(query('bm25-char3','Q17')),['D06','D07','D15']);
 assert.deepEqual(ids(query('bm25-fold','Q20')),['D02','D01']);for(const v of d.variants){assert.equal(v.summary.test.answerable,9);assert.equal(v.summary.dev.answerable,10);assert.equal(query(v.id,'Q20').metrics,null);}
 assert.equal(d.subwords.merges.length,5);assert.deepEqual(d.subwords.probes.find(p=>p.word==='bajoz').wordpiece,['[UNK]']);assert.equal(d.analysis.morphology.find(p=>p.token==='lunes').stem,'lun');
 const evaluation=posts.find(p=>p.a.id==='NLP-EVALUATION').s;for(const s of ['0,296296','0,833333','0,888889','0,925926','Q20','test'])assert.ok(evaluation.includes(s));
});
