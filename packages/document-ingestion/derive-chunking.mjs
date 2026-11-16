import {AutoTokenizer,env} from '@huggingface/transformers';
import {readFile,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {digest,wordWindows} from './ledger.mjs';
import {semanticWindows,overlapWindows} from './chunking.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
try{await access(new URL('results/chunking.json',root));throw Error('Chunking derivation exists: preserve/version first');}catch(error){if(error.code!=='ENOENT')throw error;}
const ledger=await json('results/ledger.json'),inputs=await json('results/chunk-inputs.json'),embeddings=await json('results/semantic-embeddings.json'),oldPreflight=await json('results/token-preflight.json');
for(const capture of [ledger,inputs,embeddings,oldPreflight])for(const[file,hash]of Object.entries(capture.sourceHashes))assert.equal(digest(await read(file)),hash,file);
const documents=inputs.protocol.corpus.map(id=>ledger.documents.find(doc=>doc.documentId===id)),semanticDocuments=[];
for(const document of documents){const pieces=inputs.segments.find(group=>group.documentId===document.documentId).pieces,vectors=pieces.map(piece=>embeddings.rows.find(row=>row.id===piece.id).rawVector);
 semanticDocuments.push({documentId:document.documentId,...semanticWindows(document,pieces,vectors,{budget:inputs.protocol.semantic.budget,threshold:inputs.protocol.semantic.threshold,profile:inputs.encoderProfile})});
}
const baseline=documents.flatMap(document=>wordWindows(document,32));assert.deepEqual(baseline,ledger.chunks.filter(chunk=>chunk.budget===32));
const strategies=[{id:'size32',chunks:baseline},{id:'semantic32',chunks:semanticDocuments.flatMap(doc=>doc.chunks)},...[4,8].map(overlap=>({id:'overlap'+overlap,chunks:documents.flatMap(document=>overlapWindows(document,32,overlap))}))];
const snapshot=await json('semantic-model-files.json');for(const file of snapshot.files.filter(file=>!file.file.startsWith('onnx/')))assert.equal(digest(await read('.cache/semantic-model/'+file.file)),file.sha256);
env.allowRemoteModels=false;env.allowLocalModels=true;const tokenizer=await AutoTokenizer.from_pretrained(fileURLToPath(new URL('.cache/semantic-model',root)),{local_files_only:true});
const allChunks=strategies.flatMap(strategy=>strategy.chunks.map(chunk=>({strategy:strategy.id,...chunk}))),output=tokenizer(allChunks.map(chunk=>chunk.text),{padding:false,truncation:false,return_tensor:false,add_special_tokens:true});
const tokenRows=allChunks.map((chunk,index)=>({strategy:chunk.strategy,chunkId:chunk.id,documentId:chunk.documentId,units:chunk.last-chunk.first,modelTokens:output.input_ids[index].length,modelTokenIds:output.input_ids[index]}));
for(const row of tokenRows){assert.ok(row.modelTokens<=inputs.protocol.encoder.maxTokens,'Token overflow: never truncate');if(row.strategy==='size32')assert.deepEqual(row.modelTokenIds,oldPreflight.rows.find(old=>old.chunkId===row.chunkId).modelTokenIds);}
const summaries=strategies.map(strategy=>{const units=new Set(),tokens=tokenRows.filter(row=>row.strategy===strategy.id);let totalUnits=0;
 for(const chunk of strategy.chunks)for(let i=chunk.first;i<chunk.last;i++){units.add(chunk.representationId+':'+i);totalUnits++;}
 assert.equal(units.size,documents.reduce((sum,doc)=>sum+doc.units.length,0));
 return {strategy:strategy.id,chunks:strategy.chunks.length,totalUnits,uniqueUnits:units.size,repeatedUnits:totalUnits-units.size,unitInflation:totalUnits/units.size,totalModelTokens:tokens.reduce((sum,row)=>sum+row.modelTokens,0),maxModelTokens:Math.max(...tokens.map(row=>row.modelTokens))};
});
const files=['derive-chunking.mjs','chunking.mjs','results/ledger.json','results/chunk-inputs.json','results/semantic-embeddings.json','results/token-preflight.json','semantic-model-files.json'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await read(file))])));
await writeFile(new URL('results/chunking.json',root),JSON.stringify({derivedAt:new Date().toISOString(),kind:'derived_chunk_policies_with_actual_tokenizer_counts',sourceHashes,protocol:inputs.protocol,encoderProfile:inputs.encoderProfile,semanticDocuments,strategies,tokenRows,summaries},null,2)+'\n');
console.log(JSON.stringify({summaries,boundaries:semanticDocuments.map(doc=>({documentId:doc.documentId,total:doc.boundaries.length,budget:doc.boundaries.filter(b=>b.reason==='budget').length,semantic:doc.boundaries.filter(b=>b.reason==='semantic').length,continued:doc.boundaries.filter(b=>!b.cut).length}))},null,2));
