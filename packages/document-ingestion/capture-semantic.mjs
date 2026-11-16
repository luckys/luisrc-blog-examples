import {AutoTokenizer,AutoModel,env} from '@huggingface/transformers';
import {readFile,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {digest} from './ledger.mjs';
import {maskedMeanPool} from '../vector-retrieval/pooling.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
try{await access(new URL('results/semantic-embeddings.json',root));throw Error('Semantic capture exists: preserve/version it first');}catch(error){if(error.code!=='ENOENT')throw error;}
const inputs=await json('results/chunk-inputs.json'),snapshot=await json('semantic-model-files.json'),config=inputs.protocol.encoder;
for(const[file,hash]of Object.entries(inputs.sourceHashes))assert.equal(digest(await read(file)),hash,file);
for(const file of snapshot.files)assert.equal(digest(await read('.cache/semantic-model/'+file.file)),file.sha256,file.file);
env.allowRemoteModels=false;env.allowLocalModels=true;const directory=fileURLToPath(new URL('.cache/semantic-model',root));
const tokenizer=await AutoTokenizer.from_pretrained(directory,{local_files_only:true});
const model=await AutoModel.from_pretrained(directory,{local_files_only:true,dtype:config.dtype,device:config.device,session_options:{intraOpNumThreads:config.intraOpNumThreads,interOpNumThreads:config.interOpNumThreads}});
const pieces=inputs.segments.flatMap(group=>group.pieces),rows=[],started=performance.now();
try{for(let start=0;start<pieces.length;start+=config.batchSize){
 const batch=pieces.slice(start,start+config.batchSize),texts=batch.map(piece=>piece.text),full=tokenizer(texts,{padding:false,truncation:false,return_tensor:false});
 assert.ok(full.input_ids.every(ids=>ids.length<=config.maxTokens),'Too long: do not silently truncate');
 const input=tokenizer(texts,{padding:true,truncation:false}),output=await model(input),vectors=maskedMeanPool(output.last_hidden_state,input.attention_mask);
 const ids=input.input_ids.tolist().map(row=>row.map(Number)),masks=input.attention_mask.tolist().map(row=>row.map(Number));
 for(let i=0;i<batch.length;i++){assert.equal(vectors[i].length,config.dimensions);rows.push({...batch[i],modelTokens:full.input_ids[i].length,inputIds:ids[i],attentionMask:masks[i],rawVector:vectors[i]});}
 console.log('Encoded semantic sentence pieces '+rows.length+'/'+pieces.length);
}}finally{await model.dispose();}
const files=['capture-semantic.mjs','results/chunk-inputs.json','../vector-retrieval/pooling.mjs','semantic-model-files.json','semantic-runtime.json'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await read(file))])));
await writeFile(new URL('results/semantic-embeddings.json',root),JSON.stringify({capturedAt:new Date().toISOString(),kind:'actual_local_minilm_sentence_embedding_inference',sourceHashes,encoderProfile:inputs.encoderProfile,runtime:inputs.runtime,diagnosticEncodingMs:performance.now()-started,rows},null,2)+'\n');
console.log('Preserved real384d pooled vectors; no relevance tuning or favorable retry selection.');
