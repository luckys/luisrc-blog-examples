import {AutoTokenizer,AutoModelForSequenceClassification,env} from '@huggingface/transformers';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {root,read,json,digest,requireMissing,saveNew,hashes,verifyHashes} from './io.mjs';
await requireMissing('results/reranker.json');const inputs=await json('results/inputs.json'),manifest=await json('reranker-model-files.json'),config=inputs.protocol.reranker;await verifyHashes(inputs);
for(const file of manifest.files)assert.equal(digest(await read('.cache/reranker/'+file.file)),file.sha256,file.file);
env.allowRemoteModels=false;env.allowLocalModels=true;const directory=fileURLToPath(new URL('.cache/reranker',root)),tokenizer=await AutoTokenizer.from_pretrained(directory,{local_files_only:true}),model=await AutoModelForSequenceClassification.from_pretrained(directory,{local_files_only:true,dtype:config.dtype,device:config.device,session_options:{intraOpNumThreads:config.intraOpNumThreads,interOpNumThreads:config.interOpNumThreads}}),rows=[],batches=[];
try{for(let start=0;start<inputs.pairs.length;start+=config.batchSize){
 const real=inputs.pairs.slice(start,start+config.batchSize),padded=[...real];while(padded.length<config.batchSize)padded.push(real.at(-1));
 const queries=padded.map(p=>p.query),passages=padded.map(p=>p.passage),full=tokenizer(queries,{text_pair:passages,padding:false,truncation:false,return_tensor:false});assert.ok(full.input_ids.every(ids=>ids.length<=config.maxPairTokens),'Pair too long: no silent truncation');
 const encoded=tokenizer(queries,{text_pair:passages,padding:true,truncation:false}),started=performance.now(),output=await model(encoded),elapsedMs=performance.now()-started;
 assert.deepEqual(output.logits.dims,[config.batchSize,1]);const logits=Array.from(output.logits.data);assert.ok(logits.every(Number.isFinite));
 const ids=encoded.input_ids.tolist().map(row=>row.map(Number)),masks=encoded.attention_mask.tolist().map(row=>row.map(Number));
 batches.push({pairIds:padded.map(p=>p.id),actualCount:real.length,logits,elapsedMs,inputIds:ids,attentionMasks:masks});
 for(let i=0;i<real.length;i++)rows.push({...real[i],logit:logits[i],modelTokens:full.input_ids[i].length,batch:batches.length-1,slot:i});
 console.log('Reranked unique pairs '+rows.length+'/'+inputs.pairs.length);
}}finally{await model.dispose();}
await saveNew('results/reranker.json',{capturedAt:new Date().toISOString(),kind:'actual_local_cross_encoder_pair_inference',sourceHashes:await hashes(['capture-reranker.mjs','io.mjs','results/inputs.json','reranker-model-files.json']),runtime:inputs.runtime,config,rows,batches});
console.log('Preserved all raw logits and padded batch inputs/outputs.');
