import {readFile,writeFile,access} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {cpus,arch,platform} from 'node:os';
import assert from 'node:assert/strict';
import {digest} from './ledger.mjs';
import {sentencePieces,resolveGold} from './chunking.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
try{await access(new URL('results/chunk-inputs.json',root));throw Error('Chunk inputs exist: preserve/version first');}catch(error){if(error.code!=='ENOENT')throw error;}
const ledger=await json('results/ledger.json'),protocol=await json('chunking-protocol.json'),queries=await json('retrieval-queries.json'),snapshot=await json('semantic-model-files.json');
for(const[file,hash]of Object.entries(ledger.sourceHashes))assert.equal(digest(await read(file)),hash,file);
assert.equal(snapshot.model,protocol.encoder.model);assert.equal(snapshot.revision,protocol.encoder.revision);assert.equal(snapshot.dtype,protocol.encoder.dtype);
const documents=protocol.corpus.map(id=>ledger.documents.find(doc=>doc.documentId===id));assert.ok(documents.every(Boolean));
const goldQueries=resolveGold(queries,documents),segments=documents.map(doc=>({documentId:doc.documentId,...sentencePieces(doc,protocol.segmentation.maxUnits)}));
for(const group of segments){const doc=documents.find(doc=>doc.documentId===group.documentId);assert.equal(group.pieces.map(piece=>piece.text).join(' '),doc.text);}
const require=createRequire(import.meta.url),hfRequire=createRequire(require.resolve('@huggingface/transformers'));
const runtime={node:process.version,icu:process.versions.icu,unicode:process.versions.unicode,platform:platform(),arch:arch(),cpu:cpus()[0].model,transformersJs:JSON.parse(await read('node_modules/@huggingface/transformers/package.json')).version,onnxRuntimeNode:JSON.parse(await readFile(hfRequire.resolve('onnxruntime-node/package.json'))).version,encoder:protocol.encoder};
assert.equal(runtime.transformersJs,'3.8.1');assert.equal(runtime.onnxRuntimeNode,'1.21.0');
await writeFile(new URL('semantic-runtime.json',root),JSON.stringify(runtime,null,2)+'\n');
const files=['prepare-chunking.mjs','prepare-semantic-model.mjs','chunking.mjs','chunking-protocol.json','retrieval-queries.json','results/ledger.json','semantic-model-files.json','semantic-runtime.json'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await read(file))])));
const inputs={preparedAt:new Date().toISOString(),kind:'fixed_gold_and_sentence_inputs_before_semantic_inference',sourceHashes,protocol,runtime,encoderProfile:digest(JSON.stringify(protocol.encoder)),goldQueries,segments};
await writeFile(new URL('results/chunk-inputs.json',root),JSON.stringify(inputs,null,2)+'\n');
console.log(JSON.stringify({queries:goldQueries.length,answerable:goldQueries.filter(q=>q.facts.length).length,pieces:segments.map(group=>[group.documentId,group.pieces.length,group.ignored.length])}));
