import {Client} from 'pg';
import {readFile,writeFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {normalizeVector,dot,neighborRecall} from './vectors.mjs';
const root=new URL('.',import.meta.url),json=async f=>JSON.parse(await readFile(new URL(f,root))),hash=b=>createHash('sha256').update(b).digest('hex');
try{await access(new URL('results/postgres.json',root));throw Error('Postgres capture exists; preserve/version it first');}catch(e){if(e.code!=='ENOENT')throw e;}
const config=await json('postgres-protocol.json'),runtime=await json('postgres-runtime.json'),capture=await json('results/embeddings.json');
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(hash(await readFile(new URL(file,root))),sha,file);
const documents=capture.rows.filter(r=>r.kind!=='query'),queries=capture.rows.filter(r=>r.kind==='query'),vectors=documents.map(d=>normalizeVector(d.rawVector)),queryVectors=queries.map(q=>normalizeVector(q.rawVector)),literal=v=>JSON.stringify(v);
const name='vector-retrieval-'+randomUUID(),docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
let client;const neighbors=[],measurements=[],plans={},exact=[];let versions,indexBuildMs,indexBytes,port;
const sql='SELECT id, embedding <=> $1::vector AS distance FROM documents ORDER BY embedding <=> $1::vector LIMIT $2';
try{
 docker('run','--detach','--rm','--name',name,'--pull=never','--platform',runtime.platform,'--user','999:999','--cap-drop','ALL','--security-opt','no-new-privileges:true','--read-only','--tmpfs','/var/lib/postgresql/data:rw,uid=999,gid=999,mode=0700,size=768m','--tmpfs','/var/run/postgresql:rw,uid=999,gid=999,mode=0775','--cpus','2','--memory','1g','--publish','127.0.0.1::5432','--env','POSTGRES_HOST_AUTH_METHOD=trust','--env','POSTGRES_USER=vectorlab','--env','POSTGRES_DB=vectorlab',runtime.image);
 const inspect=JSON.parse(docker('inspect',name))[0];assert.equal(inspect.HostConfig.ReadonlyRootfs,true);assert.deepEqual(inspect.HostConfig.CapDrop,['ALL']);
 const binding=inspect.NetworkSettings.Ports['5432/tcp'][0];assert.equal(binding.HostIp,'127.0.0.1');port=Number(binding.HostPort);
 for(let attempt=0;attempt<60;attempt++){
  const candidate=new Client({host:'127.0.0.1',port,user:'vectorlab',database:'vectorlab',connectionTimeoutMillis:1000});
  try{await candidate.connect();client=candidate;break;}catch{await candidate.end().catch(()=>{});await new Promise(resolve=>setTimeout(resolve,250));}
 }
 if(!client)throw Error('Isolated PostgreSQL did not become ready');
 await client.query('CREATE EXTENSION vector');
 versions=(await client.query("SELECT version() AS postgres, (SELECT extversion FROM pg_extension WHERE extname='vector') AS vector")).rows[0];assert.equal(versions.vector,runtime.extension);
 await client.query('CREATE TABLE documents (id text PRIMARY KEY, body text NOT NULL, representation_version text NOT NULL, embedding vector(384) NOT NULL)');
 const version=capture.protocol.encoder.model+'@'+capture.protocol.encoder.revision+':q8:mean:unit-f32';
 await client.query('BEGIN');
 for(let start=0;start<documents.length;start+=50){
  const batch=documents.slice(start,start+50),params=[];
  const tuples=batch.map((doc,i)=>{const offset=i*4;params.push(doc.id,doc.text,version,literal(vectors[start+i]));return `($${offset+1},$${offset+2},$${offset+3},$${offset+4}::vector)`;});
  await client.query('INSERT INTO documents VALUES '+tuples.join(','),params);
 }
 await client.query('COMMIT');await client.query('ANALYZE documents');
 assert.equal(Number((await client.query('SELECT count(*) FROM documents')).rows[0].count),1000);
 const explain=async()=> (await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql,[literal(queryVectors[0]),config.k])).rows[0]['QUERY PLAN'];
 const search=async qi=>{const begin=performance.now(),result=await client.query(sql,[literal(queryVectors[qi]),config.k]),elapsedMs=performance.now()-begin;return{elapsedMs,ids:result.rows.map(r=>r.id),distances:result.rows.map(r=>Number(r.distance))};};
 plans.exact=await explain();
 for(let qi=0;qi<queries.length;qi++){
  const result=await search(qi);assert.equal(result.ids.length,config.k);exact.push(result);
  for(let i=0;i<result.ids.length;i++){const di=documents.findIndex(d=>d.id===result.ids[i]),a=vectors[di],b=queryVectors[qi],expected=1-dot(a,b)/(Math.hypot(...a)*Math.hypot(...b));assert.ok(Math.abs(result.distances[i]-expected)<5e-6,'Independent cosine distance');}
  neighbors.push({strategy:'exact',queryId:queries[qi].id,...result,recall:1});
 }
 for(let round=0;round<config.warmupRounds;round++)for(let qi=0;qi<queries.length;qi++)await search(qi);
 for(let round=0;round<config.measurementRounds;round++)for(let qi=0;qi<queries.length;qi++)measurements.push({round,strategy:'exact',queryId:queries[qi].id,...await search(qi)});
 const start=performance.now();
 await client.query(`CREATE INDEX documents_embedding_hnsw ON documents USING hnsw (embedding vector_cosine_ops) WITH (m=${config.m},ef_construction=${config.efConstruction})`);indexBuildMs=performance.now()-start;
 indexBytes=Number((await client.query("SELECT pg_relation_size('documents_embedding_hnsw') AS bytes")).rows[0].bytes);
 plans.unforcedAfterIndex=await explain();await client.query('SET enable_seqscan=off');await client.query("SET hnsw.iterative_scan='off'");
 for(const ef of config.efSearch){
  await client.query('SET hnsw.ef_search='+ef);plans['hnsw-ef'+ef]=await explain();
  assert.ok(JSON.stringify(plans['hnsw-ef'+ef]).includes('documents_embedding_hnsw'),'Actual HNSW plan required');
  assert.equal(Number((await client.query('SHOW hnsw.ef_search')).rows[0]['hnsw.ef_search']),ef);
  for(let qi=0;qi<queries.length;qi++){const result=await search(qi);neighbors.push({strategy:'hnsw-ef'+ef,queryId:queries[qi].id,...result,recall:neighborRecall(result.ids,exact[qi].ids)});}
 }
 for(let round=0;round<config.warmupRounds;round++)for(const ef of config.efSearch){await client.query('SET hnsw.ef_search='+ef);for(let qi=0;qi<queries.length;qi++)await search(qi);}
 for(let round=0;round<config.measurementRounds;round++)for(const ef of config.efSearch){await client.query('SET hnsw.ef_search='+ef);for(let qi=0;qi<queries.length;qi++)measurements.push({round,strategy:'hnsw-ef'+ef,queryId:queries[qi].id,...await search(qi)});}
}finally{if(client)await client.end();try{docker('rm','--force',name);}catch{}}
const strategies=['exact',...config.efSearch.map(ef=>'hnsw-ef'+ef)],quantile=(values,p)=>values.toSorted((a,b)=>a-b)[Math.ceil(p*values.length)-1];
const summaries=strategies.map(strategy=>{const values=measurements.filter(r=>r.strategy===strategy).map(r=>r.elapsedMs),rows=neighbors.filter(r=>r.strategy===strategy);return{strategy,requests:values.length,meanNeighborRecall:rows.reduce((s,r)=>s+r.recall,0)/queries.length,minReturned:Math.min(...rows.map(r=>r.ids.length)),maxReturned:Math.max(...rows.map(r=>r.ids.length)),p50Ms:quantile(values,.5),p95Ms:quantile(values,.95)};});
const files=['bench-postgres.mjs','postgres-protocol.json','postgres-runtime.json','protocol.json','vectors.mjs','results/embeddings.json'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await readFile(new URL(f,root)))])));
await writeFile(new URL('results/postgres.json',root),JSON.stringify({capturedAt:new Date().toISOString(),encodingCapturedAt:capture.capturedAt,kind:'real_pgvector_exact_and_hnsw_search_local_ipc',sourceHashes,config,runtime,versions,connection:{host:'127.0.0.1',port,clients:1,temporaryContainerRemoved:true},indexBuildMs,indexBytes,plans,neighbors,measurements,summaries},null,2)+'\n');
console.log(JSON.stringify({versions,indexBuildMs,indexBytes,summaries,measurements:measurements.length},null,2));
