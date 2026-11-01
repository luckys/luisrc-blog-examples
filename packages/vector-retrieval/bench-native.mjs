import faiss from 'faiss-napi';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import assert from 'node:assert/strict';
import {normalizeVector,squaredL2,neighborRecall} from './vectors.mjs';
import {createHnsw} from './native-index.mjs';
const root=new URL('.',import.meta.url),json=async f=>JSON.parse(await readFile(new URL(f,root))),hash=b=>createHash('sha256').update(b).digest('hex');
try{await access(new URL('results/native-index.json',root));throw Error('Native capture exists; preserve/version it first');}catch(e){if(e.code!=='ENOENT')throw e;}
for(const k of ['OMP_NUM_THREADS','MKL_NUM_THREADS','OPENBLAS_NUM_THREADS'])assert.equal(process.env[k],'1');
const protocol=await json('protocol.json'),capture=await json('results/embeddings.json'),runtime=await json('native-runtime.json');
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(hash(await readFile(new URL(file,root))),sha,file);
const require=createRequire(import.meta.url),release=join(dirname(require.resolve('faiss-napi/package.json')),'build/Release');
for(const file of runtime.files){const h=createHash('sha256');for await(const chunk of createReadStream(join(release,file.file)))h.update(chunk);assert.equal(h.digest('hex'),file.sha256,file.file);}
const documents=capture.rows.filter(r=>r.kind!=='query'),queries=capture.rows.filter(r=>r.kind==='query'),vectors=documents.map(d=>normalizeVector(d.rawVector)),queryVectors=queries.map(q=>normalizeVector(q.rawVector)),matrix=vectors.flat();
assert.equal(documents.length,1000);assert.equal(queries.length,20);
const config=protocol.indexControl,indices=new Map(),builds=[],strategies=[{id:'flat',index:'flat'}],neighbors=[],measurements=[];
await mkdir(new URL('.cache/indices/',root),{recursive:true});
try{
 for(const [id,m]of [['flat',null],...config.hnswM.map(m=>['hnsw'+m,m])]){
  const index=m===null?new faiss.IndexFlatL2(384):createHnsw(384,m,config.efConstruction),start=performance.now();
  index.add(matrix);const insertionMs=performance.now()-start;
  assert.equal(index.ntotal,1000);assert.equal(index.dims,384);
  const bytes=index.toBuffer();await writeFile(new URL('.cache/indices/'+id+'.faiss',root),bytes);
  builds.push({id,m,efConstruction:m===null?null:index.getEfConstruction(),insertionMs,serializedBytes:bytes.length,sha256:hash(bytes),initialEfSearch:m===null?null:index.getEfSearch()});indices.set(id,index);
  if(m!==null)for(const efSearch of config.efSearch)strategies.push({id:id+'-ef'+efSearch,index:id,efSearch});
 }
 const search=(strategy,qi,k)=>{
  const index=indices.get(strategy.index);
  if(strategy.efSearch!==undefined){index.efSearch=strategy.efSearch;assert.equal(index.getEfSearch(),strategy.efSearch);}
  const start=performance.now(),result=index.search(queryVectors[qi],k),elapsedMs=performance.now()-start;
  const labels=result.labels.map(Number);assert.ok(labels.every(x=>x>=0&&x<documents.length));
  return {elapsedMs,ids:labels.map(i=>documents[i].id),distances:result.distances};
 };
 const exact=queries.map((_,i)=>search(strategies[0],i,config.k+1));
 for(const strategy of strategies)for(let qi=0;qi<queries.length;qi++){
  const result=search(strategy,qi,config.k),reference=exact[qi].ids.slice(0,config.k);
  for(let i=0;i<result.ids.length;i++){
   const di=documents.findIndex(d=>d.id===result.ids[i]);
   assert.ok(Math.abs(result.distances[i]-squaredL2(vectors[di],queryVectors[qi]))<5e-6,'Independent distance');
  }
  neighbors.push({strategy:strategy.id,queryId:queries[qi].id,...result,recall:neighborRecall(result.ids,reference),exactBoundaryGap:exact[qi].distances[config.k]-exact[qi].distances[config.k-1]});
 }
 for(let round=0;round<config.warmupRounds;round++)for(const strategy of strategies)for(let qi=0;qi<queries.length;qi++)search(strategy,qi,config.k);
 for(let round=0;round<config.measurementRounds;round++)for(const strategy of strategies)for(let qi=0;qi<queries.length;qi++)measurements.push({round,strategy:strategy.id,queryId:queries[qi].id,...search(strategy,qi,config.k)});
}finally{for(const index of indices.values())index.dispose();}
const quantile=(values,p)=>values.toSorted((a,b)=>a-b)[Math.ceil(p*values.length)-1];
const summaries=strategies.map(s=>{const values=measurements.filter(r=>r.strategy===s.id).map(r=>r.elapsedMs);return{strategy:s.id,requests:values.length,meanNeighborRecall:neighbors.filter(r=>r.strategy===s.id).reduce((n,r)=>n+r.recall,0)/queries.length,p50Ms:quantile(values,.5),p95Ms:quantile(values,.95)};});
const files=['bench-native.mjs','native-run.mjs','native-index.mjs','native-runtime.json','protocol.json','vectors.mjs','results/embeddings.json'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await readFile(new URL(f,root)))])));
await writeFile(new URL('results/native-index.json',root),JSON.stringify({capturedAt:new Date().toISOString(),encodingCapturedAt:capture.capturedAt,kind:'real_faiss_native_index_search_not_semantic_quality',sourceHashes,environment:{node:process.version,cpu:cpus()[0].model,threads:{OMP_NUM_THREADS:process.env.OMP_NUM_THREADS,MKL_NUM_THREADS:process.env.MKL_NUM_THREADS,OPENBLAS_NUM_THREADS:process.env.OPENBLAS_NUM_THREADS},nativePackage:runtime.package,nativeVersion:runtime.version},config,strategies,builds,neighbors,measurements,summaries},null,2)+'\n');
console.log(JSON.stringify({builds,summaries,measurements:measurements.length},null,2));
