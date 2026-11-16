import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {cpus,arch,platform} from 'node:os';
import assert from 'node:assert/strict';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file)),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
try{await access(new URL('results/inputs.json',root));throw Error('Inputs exist; version paths/protocol before a new experiment');}catch(error){if(error.code!=='ENOENT')throw error;}
const previous=await json('../document-ingestion/results/retrieval.json'),partitions=await json('../document-ingestion/results/chunking.json'),ledger=await json('../document-ingestion/results/ledger.json'),protocol=await json('protocol.json'),snapshot=await json('model-files.json');
assert.equal(snapshot.model,protocol.encoder.model);assert.equal(snapshot.revision,protocol.encoder.revision);assert.equal(snapshot.dtype,protocol.encoder.dtype);
const chunks=partitions.strategies.find(s=>s.id==='size32').chunks,queries=previous.queries,variants=await json('variants.json'),rewriteCases=await json('rewrite-cases.json'),filters=await json('filter-cases.json');
assert.equal(chunks.length,13);assert.equal(queries.length,20);
const metadata=chunks.map(chunk=>({id:chunk.id,documentId:chunk.documentId,kind:ledger.documents.find(d=>d.documentId===chunk.documentId).kind,language:'es'}));
const texts=new Map(),add=(id,text,role)=>{if(texts.has(id))throw Error('Duplicate input ID');texts.set(id,{id,text,role});};
for(const c of chunks)add('chunk:'+c.id,c.text,'chunk');for(const q of queries)add('query:'+q.id,q.text,'query');
// Only originals need dense embeddings here: multi-query and rewrite experiments use BM25.
const require=createRequire(import.meta.url),hfRequire=createRequire(require.resolve('@huggingface/transformers'));
const runtime={node:process.version,icu:process.versions.icu,unicode:process.versions.unicode,platform:platform(),arch:arch(),cpu:cpus()[0].model,transformersJs:JSON.parse(await read('node_modules/@huggingface/transformers/package.json')).version,onnxRuntimeNode:JSON.parse(await readFile(hfRequire.resolve('onnxruntime-node/package.json'))).version,encoder:protocol.encoder};
assert.equal(runtime.transformersJs,'3.8.1');assert.equal(runtime.onnxRuntimeNode,'1.21.0');
await writeFile(new URL('runtime.json',root),JSON.stringify(runtime,null,2)+'\n');
const lock=(await import('yaml')).parseAllDocuments((await read('../../pnpm-lock.yaml')).toString()).map(doc=>doc.toJS()).find(doc=>doc?.importers?.['packages/retrieval-strategies']);
// Preserve the actual lock bytes, not a reserialization of the parsed structure.
assert.ok(lock?.importers?.['packages/retrieval-strategies']);await writeFile(new URL('dependency-lock.capture.json',root),await read('../../pnpm-lock.yaml'));
const files=['protocol.json','model-files.json','variants.json','rewrite-cases.json','filter-cases.json','prepare.mjs','prepare-model.mjs','ranking.mjs','evaluate.mjs','runtime.json','dependency-lock.capture.json','../document-ingestion/results/retrieval.json','../document-ingestion/results/chunking.json','../document-ingestion/results/ledger.json','../document-ingestion/chunking.mjs','../lexical-search/retrieval.mjs','../lexical-search/analysis.mjs','../vector-retrieval/pooling.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await read(file))])));
await writeFile(new URL('results/inputs.json',root),JSON.stringify({preparedAt:new Date().toISOString(),kind:'fixed_retrieval_inputs_before_new_inference',sourceHashes,protocol,runtime,encoderProfile:digest(JSON.stringify(protocol.encoder)),chunks,queries,metadata,variants,rewriteCases,filters,texts:[...texts.values()]},null,2)+'\n');
console.log('Fixed13 chunks,20queries,33encoder texts,7multi-query cases,8rewrite pairs and6filters before inference.');
