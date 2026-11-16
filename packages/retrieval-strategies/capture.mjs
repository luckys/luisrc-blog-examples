import {AutoTokenizer,AutoModel,env} from '@huggingface/transformers';
import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {maskedMeanPool} from '../vector-retrieval/pooling.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file)),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
try{await access(new URL('results/embeddings.json',root));throw Error('Capture exists: preserve/version before another execution');}catch(error){if(error.code!=='ENOENT')throw error;}
const inputs=await json('results/inputs.json'),snapshot=await json('model-files.json'),config=inputs.protocol.encoder;
for(const[file,hash]of Object.entries(inputs.sourceHashes))assert.equal(digest(await read(file)),hash,file);
for(const file of snapshot.files)assert.equal(digest(await read('.cache/model/'+file.file)),file.sha256,file.file);
env.allowRemoteModels=false;env.allowLocalModels=true;const directory=fileURLToPath(new URL('.cache/model',root)),tokenizer=await AutoTokenizer.from_pretrained(directory,{local_files_only:true});
const model=await AutoModel.from_pretrained(directory,{local_files_only:true,dtype:config.dtype,device:config.device,session_options:{intraOpNumThreads:config.intraOpNumThreads,interOpNumThreads:config.interOpNumThreads}}),rows=[];
try{for(let start=0;start<inputs.texts.length;start+=config.batchSize){
 const batch=inputs.texts.slice(start,start+config.batchSize),texts=batch.map(row=>row.text),full=tokenizer(texts,{padding:false,truncation:false,return_tensor:false});
 assert.ok(full.input_ids.every(ids=>ids.length<=config.maxTokens),'Full input exceeds limit; never truncate silently');
 const encoded=tokenizer(texts,{padding:true,truncation:false}),output=await model(encoded),vectors=maskedMeanPool(output.last_hidden_state,encoded.attention_mask),ids=encoded.input_ids.tolist().map(row=>row.map(Number)),masks=encoded.attention_mask.tolist().map(row=>row.map(Number));
 for(let i=0;i<batch.length;i++){assert.equal(vectors[i].length,config.dimensions);rows.push({...batch[i],modelTokens:full.input_ids[i].length,inputIds:ids[i],attentionMask:masks[i],rawVector:vectors[i]});}
 console.log('Encoded '+rows.length+'/'+inputs.texts.length);
}}finally{await model.dispose();}
const files=['capture.mjs','results/inputs.json','model-files.json','../vector-retrieval/pooling.mjs'],sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await read(file))])));
await writeFile(new URL('results/embeddings.json',root),JSON.stringify({capturedAt:new Date().toISOString(),kind:'actual_local_minilm_query_and_chunk_embeddings',sourceHashes,runtime:inputs.runtime,encoderProfile:inputs.encoderProfile,rows},null,2)+'\n');
console.log('Original33 embeddings preserved, no favorable retry selection.');
