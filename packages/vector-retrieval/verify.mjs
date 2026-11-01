import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {normalizeVector,squaredL2,dot,neighborRecall,cosineRanking} from './vectors.mjs';
import {buildRecords} from './build-records.mjs';
import {buildIndex,search} from '../lexical-search/retrieval.mjs';
import {analyzer} from '../lexical-search/analysis.mjs';
const root=new URL('.',import.meta.url),json=async f=>JSON.parse(await readFile(new URL(f,root))),hash=b=>createHash('sha256').update(b).digest('hex');
const [embedding,quality,native,postgres,protocol,corpus,queries,archive]=await Promise.all(['results/embeddings.json','results/quality.json','results/native-index.json','results/postgres.json','protocol.json','corpus.json','queries.json','dependency-lock.capture.json'].map(json));
for(const saved of [embedding,quality,native,postgres])for(const[file,sha]of Object.entries(saved.sourceHashes))assert.equal(hash(await readFile(new URL(file,root))),sha,file);
assert.equal(hash(archive.content),archive.sha256);assert.equal(archive.originalPath,'../../pnpm-lock.yaml');
assert.deepEqual(embedding.protocol,protocol);assert.equal(embedding.rows.length,1020);
for(const saved of [quality,native,postgres])assert.equal(saved.encodingCapturedAt,embedding.capturedAt);
const original=buildRecords(corpus,queries),byId=new Map(embedding.rows.map(r=>[r.id,r]));assert.equal(byId.size,1020);
for(const[i,row]of embedding.rows.entries()){
 for(const k of ['id','kind','text'])assert.equal(row[k],original[i][k]);
 assert.equal(row.rawVector.length,384);assert.ok(row.rawVector.every(Number.isFinite));assert.ok(Math.hypot(...row.rawVector)>0);
 assert.equal(row.inputIds.length,row.attentionMask.length);assert.ok(row.inputIds.every(Number.isInteger));assert.ok(row.attentionMask.every(v=>v===0||v===1));assert.ok(row.inputIds.length<=128);assert.ok(row.untruncatedTokenCount>=row.attentionMask.reduce((a,b)=>a+b,0));
}
const lexical=buildIndex(corpus,analyzer('fold')),vectors=corpus.map(d=>byId.get(d.id).rawVector),close=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
for(const[rowIndex,row]of quality.rows.entries()){
 const query=queries[rowIndex];assert.equal(row.queryId,query.id);assert.deepEqual(row.relevant,query.relevant);assert.equal(row.split,query.split);
 for(const method of ['bm25','dense']){
  const expected=method==='bm25'?search(lexical,query.text,{k1:1.2,b:.75}):cosineRanking(corpus,vectors,byId.get(query.id).rawVector);
  assert.equal(row.rankings[method].length,expected.length);
  expected.forEach((r,i)=>{assert.equal(row.rankings[method][i].id,r.id);close(row.rankings[method][i].score,r.score);});
  if(!query.relevant.length){assert.equal(row.metrics[method],null);continue;}
  const top=expected.slice(0,3),gold=new Set(query.relevant),hits=top.filter(r=>gold.has(r.id)).length,first=top.findIndex(r=>gold.has(r.id));
  assert.deepEqual(row.metrics[method],{precision:hits/3,recall:hits/gold.size,rr:first<0?0:1/(first+1),hits});
 }
}
for(const row of quality.summaries){const values=quality.rows.filter(r=>r.split===row.split&&r.metrics[row.method]).map(r=>r.metrics[row.method]);assert.equal(row.answerable,values.length);for(const[k,m]of [['precision','precision'],['recall','recall'],['mrr','rr']])close(row[k],values.reduce((n,r)=>n+r[m],0)/values.length);}
const documents=embedding.rows.filter(r=>r.kind!=='query'),normalized=documents.map(d=>normalizeVector(d.rawVector)),qVectors=queries.map(q=>normalizeVector(byId.get(q.id).rawVector)),documentIndex=new Map(documents.map((d,i)=>[d.id,i]));
const distances=new Map(queries.map((q,qi)=>[q.id,normalized.map(v=>({l2:squaredL2(v,qVectors[qi]),cosine:1-dot(v,qVectors[qi])/(Math.hypot(...v)*Math.hypot(...qVectors[qi]))}))]));
for(const saved of [native,postgres]){
 const isNative=saved===native,referenceName=isNative?'flat':'exact',expectedStrategies=isNative?saved.strategies.map(s=>s.id):['exact',...saved.config.efSearch.map(ef=>'hnsw-ef'+ef)];
 assert.equal(saved.neighbors.length,expectedStrategies.length*20);assert.equal(saved.measurements.length,expectedStrategies.length*20*30);
 for(const row of [...saved.neighbors,...saved.measurements]){
  assert.ok(expectedStrategies.includes(row.strategy));assert.equal(new Set(row.ids).size,row.ids.length);assert.equal(row.ids.length,row.distances.length);assert.ok(row.ids.length<=10);assert.ok(Number.isFinite(row.elapsedMs)&&row.elapsedMs>=0);
  for(let i=0;i<row.ids.length;i++){assert.ok(documentIndex.has(row.ids[i]));const d=distances.get(row.queryId)[documentIndex.get(row.ids[i])];close(row.distances[i],isNative?d.l2:d.cosine,5e-6);if(i)assert.ok(row.distances[i]>=row.distances[i-1]-1e-7);}
 }
 for(const row of saved.neighbors){const exact=saved.neighbors.find(r=>r.strategy===referenceName&&r.queryId===row.queryId);assert.equal(exact.ids.length,10);close(row.recall,neighborRecall(row.ids,exact.ids));if(row.strategy===referenceName){const selected=new Set(row.ids),selectedMax=Math.max(...row.ids.map(id=>distances.get(row.queryId)[documentIndex.get(id)][isNative?'l2':'cosine'])),outside=documents.flatMap((d,i)=>selected.has(d.id)?[]:[distances.get(row.queryId)[i][isNative?'l2':'cosine']]);assert.ok(selectedMax<=Math.min(...outside)+1e-5,'Exact geometric frontier');}}
 const unique=new Set(saved.measurements.map(r=>`${r.strategy}/${r.queryId}/${r.round}`));assert.equal(unique.size,saved.measurements.length);
 for(const summary of saved.summaries){const values=saved.measurements.filter(r=>r.strategy===summary.strategy).map(r=>r.elapsedMs).sort((a,b)=>a-b),neighbors=saved.neighbors.filter(r=>r.strategy===summary.strategy);assert.equal(summary.requests,600);close(summary.meanNeighborRecall,neighbors.reduce((s,r)=>s+r.recall,0)/20);close(summary.p50Ms,values[Math.ceil(.5*values.length)-1]);close(summary.p95Ms,values[Math.ceil(.95*values.length)-1]);}
}
function planNodes(value){if(!value||typeof value!=='object')return[];return[value,...Object.values(value).flatMap(planNodes)];}
for(const ef of postgres.config.efSearch){const nodes=planNodes(postgres.plans['hnsw-ef'+ef]);assert.ok(nodes.some(p=>p['Node Type']==='Index Scan'&&p['Index Name']==='documents_embedding_hnsw'&&p['Actual Loops']>0));}
assert.ok(!planNodes(postgres.plans.exact).some(p=>p['Index Name']==='documents_embedding_hnsw'));
assert.equal(postgres.versions.vector,'0.8.7');
console.log('1020 vectores,40 rankings etiquetados,140+80 vecindarios,6600 mediciones y planes HNSW verificados sin inferencia ni reescritura');
