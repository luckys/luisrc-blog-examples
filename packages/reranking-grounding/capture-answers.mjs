import {AutoTokenizer,AutoModelForCausalLM,env} from '@huggingface/transformers';
import {mkdir,appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {root,read,json,digest,requireMissing,saveNew,hashes,verifyHashes} from './io.mjs';
await requireMissing('results/generation.json');const inputs=await json('results/inputs.json'),prepared=await json('results/answer-inputs.json'),manifest=await json('generator-model-files.json'),config=inputs.protocol.generator;await verifyHashes(inputs);await verifyHashes(prepared);
for(const file of manifest.files)assert.equal(digest(await read('.cache/generator/'+file.file)),file.sha256,file.file);
await mkdir(new URL('results/answers',root),{recursive:true});env.allowRemoteModels=false;env.allowLocalModels=true;const directory=fileURLToPath(new URL('.cache/generator',root)),tokenizer=await AutoTokenizer.from_pretrained(directory,{local_files_only:true}),model=await AutoModelForCausalLM.from_pretrained(directory,{local_files_only:true,dtype:config.dtype,device:config.device,session_options:{intraOpNumThreads:config.intraOpNumThreads,interOpNumThreads:config.interOpNumThreads}}),rows=[];
const sourceHashes=await hashes(['capture-answers.mjs','io.mjs','results/inputs.json','results/answer-inputs.json','generator-model-files.json']);
const event=record=>appendFile(new URL('results/generation-events.jsonl',root),JSON.stringify({...record,at:new Date().toISOString()})+'\n');
try{for(const prompt of prepared.prompts){
 const file='results/answers/'+prompt.id+'.json';let previous;
 try{previous=await json(file);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(previous){assert.equal(previous.promptId,prompt.id);assert.deepEqual(previous.sourceHashes,sourceHashes);rows.push({promptId:prompt.id,file,sha256:digest(await read(file))});console.log('Reused saved exact prompt '+rows.length+'/'+prepared.prompts.length);continue;}
 const encoded=tokenizer([prompt.prompt],{padding:false,truncation:false,add_special_tokens:false});assert.deepEqual(encoded.input_ids.tolist()[0].map(Number),prompt.inputIds);assert.ok(prompt.inputIds.length<=config.maxInputTokens);
 await event({event:'started',promptId:prompt.id,queryId:prompt.queryId});const started=performance.now();
 const output=await model.generate({...encoded,max_new_tokens:config.maxNewTokens,do_sample:config.doSample,num_beams:config.numBeams,repetition_penalty:config.repetitionPenalty}),elapsedMs=performance.now()-started,allIds=output.tolist()[0].map(Number);assert.deepEqual(allIds.slice(0,prompt.inputIds.length),prompt.inputIds);
 const generatedIds=allIds.slice(prompt.inputIds.length),raw=tokenizer.decode(generatedIds,{skip_special_tokens:true}),record={capturedAt:new Date().toISOString(),kind:'actual_local_qwen_generation',sourceHashes,promptId:prompt.id,inputIds:prompt.inputIds,generatedIds,raw,elapsedMs,reachedTokenLimit:generatedIds.length===config.maxNewTokens};
 await saveNew(file,record);await event({event:'completed',promptId:prompt.id,generatedTokens:generatedIds.length});rows.push({promptId:prompt.id,file,sha256:digest(await read(file))});console.log('Generated '+rows.length+'/'+prepared.prompts.length+' '+prompt.queryId+' '+generatedIds.length+' tokens '+Math.round(elapsedMs)+'ms');
}}finally{await model.dispose();}
await saveNew('results/generation.json',{capturedAt:new Date().toISOString(),kind:'all_unique_real_generations_preserved',sourceHashes,runtime:inputs.runtime,config,rows});console.log('All unique prompts preserved, including format failures and unsupported content.');
