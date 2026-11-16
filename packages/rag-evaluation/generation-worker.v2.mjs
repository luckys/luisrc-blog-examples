import {AutoTokenizer,AutoModelForCausalLM,env} from '@huggingface/transformers';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {root,read,json,digest,fileDigest,exists,saveNew,event,journal,attemptState} from './generation-io.v2.mjs';
import {validateResponse} from './response-contract.v1.mjs';
const [modelId,sessionId]=process.argv.slice(2),prepared=await json('results/generation-inputs.v2.json'),manifest=await json('generation-models.v1.json'),plan=await json('comparison-plan.v1.json'),profile=manifest.models.find(m=>m.id===modelId);
assert.ok(profile);const sourceHashes={...prepared.sourceHashes,'results/generation-inputs.v2.json':digest(await read('results/generation-inputs.v2.json'))};
for(const[file,hash]of Object.entries(sourceHashes))assert.equal(digest(await read(file)),hash,file);
await event({event:'model_session_started',modelId,sessionId});
for(const file of profile.files)assert.equal(await fileDigest(new URL(profile.cacheFolder+'/'+file.file,root)),file.sha256,file.file);
env.allowRemoteModels=false;env.allowLocalModels=true;
const directory=fileURLToPath(new URL(profile.cacheFolder,root));let model,tokenizer;
try{
 const tokenizerStart=performance.now();tokenizer=await AutoTokenizer.from_pretrained(directory,{local_files_only:true});const tokenizerLoadMs=performance.now()-tokenizerStart;
 const modelStart=performance.now();model=await AutoModelForCausalLM.from_pretrained(directory,{local_files_only:true,dtype:profile.dtype,device:plan.generation.device,session_options:{intraOpNumThreads:plan.generation.intraOpNumThreads,interOpNumThreads:plan.generation.interOpNumThreads}});const modelLoadMs=performance.now()-modelStart;
 await saveNew('results/response-v2/load-'+sessionId+'.json',{kind:'actual_local_model_load',sourceHashes,modelId,sessionId,pid:process.pid,tokenizerLoadMs,modelLoadMs,generationDefaults:JSON.parse(JSON.stringify(model.generation_config))});
 await event({event:'model_loaded',modelId,sessionId,modelLoadMs});
}catch(error){await saveNew('results/response-v2/load-failure-'+sessionId+'.json',{kind:'actual_model_load_failure',sourceHashes,modelId,sessionId,error:{name:error.name,message:error.message}});await event({event:'model_load_failed',modelId,sessionId,error:error.message});throw error;}
try{
 for(const input of prepared.inputs.filter(r=>r.modelId===modelId)){
  const file='results/response-v2/'+input.id+'.json';if(await exists(file))continue;
  const state=attemptState(input.id,await journal(),false);assert.equal(state,'not_started','Started cases must be recovered,never regenerated');
  await event({event:'case_started',modelId,sessionId,id:input.id,queryId:input.queryId});
  const caseStart=performance.now();let record;
  try{
   const encoded=tokenizer([input.prompt],{padding:false,truncation:false,add_special_tokens:false});assert.deepEqual(encoded.input_ids.tolist()[0].map(Number),input.inputIds);assert.ok(encoded.attention_mask.tolist()[0].every(v=>Number(v)===1));const prepareInputMs=performance.now()-caseStart;
   const rssBeforeBytes=process.memoryUsage().rss,cpuBefore=process.resourceUsage(),generateStart=performance.now();
   const output=await model.generate({...encoded,max_new_tokens:plan.generation.max_new_tokens,do_sample:plan.generation.do_sample,num_beams:plan.generation.num_beams,use_cache:plan.generation.use_cache});
   const generateMs=performance.now()-generateStart,cpuAfter=process.resourceUsage(),rssAfterBytes=process.memoryUsage().rss,allIds=output.tolist()[0].map(Number);assert.deepEqual(allIds.slice(0,input.inputIds.length),input.inputIds);
   const generatedIds=allIds.slice(input.inputIds.length),decodeStart=performance.now(),decodedWithSpecialTokens=tokenizer.decode(generatedIds,{skip_special_tokens:false}),raw=tokenizer.decode(generatedIds,{skip_special_tokens:true}),decodeMs=performance.now()-decodeStart,validateStart=performance.now(),validation=validateResponse(raw,input.sourceIds),validateMs=performance.now()-validateStart;
   record={kind:'actual_local_two_checkpoint_response',outcome:'generated',sourceHashes,id:input.id,modelId,queryId:input.queryId,split:input.split,sessionId,inputIds:input.inputIds,generatedIds,decodedWithSpecialTokens,raw,reachedTokenLimit:generatedIds.length===plan.generation.max_new_tokens,validation,timing:{prepareInputMs,generateMs,decodeMs,validateMs,caseTotalMs:performance.now()-caseStart},resources:{rssBeforeBytes,rssAfterBytes,userCpuMicros:cpuAfter.userCPUTime-cpuBefore.userCPUTime,systemCpuMicros:cpuAfter.systemCPUTime-cpuBefore.systemCPUTime}};
  }catch(error){record={kind:'actual_local_generation_error',outcome:'execution_error',sourceHashes,id:input.id,modelId,queryId:input.queryId,split:input.split,sessionId,inputIds:input.inputIds,generatedIds:null,raw:null,error:{name:error.name,message:error.message},observedCaseMs:performance.now()-caseStart};}
  await saveNew(file,record);await event({event:'case_completed',modelId,sessionId,id:input.id,outcome:record.outcome,generatedTokens:record.generatedIds?.length??null});
  console.log(input.id+' '+record.outcome+' '+(record.generatedIds?.length??'unknown')+' tokens '+Math.round(record.timing?.generateMs??record.observedCaseMs)+'ms');
 }
}finally{await model.dispose();await event({event:'model_session_finished',modelId,sessionId});}
