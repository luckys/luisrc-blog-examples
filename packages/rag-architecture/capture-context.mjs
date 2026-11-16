import {AutoTokenizer,env} from '@huggingface/transformers';import {readFile,writeFile,access} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {packContext} from './context-packing.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const file of ['results/context.json','results/context-failed.json']){try{await access(new URL(file,root));throw Error('Preserve existing capture '+file);}catch(error){if(error.code!=='ENOENT')throw error;}}
const protocol=await json('context-protocol.json'),inputs=await json('context-inputs.json'),manifest=await json('context-tokenizer-manifest.json'),system=(await read('context-system.txt')).toString();
const files=['context-protocol.json','context-inputs.json','context-system.txt','context-packing.mjs','capture-context.mjs','context-tokenizer-manifest.json','prepare-context-tokenizer.mjs','context-dependency-lock.capture.json','results/updates.json'];const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await read(f))])));
const rows=[];let failure;
try{
 for(const f of manifest.files)assert.equal(hash(await read('.cache/context-tokenizer/'+f.file)),f.sha256,f.file);
 env.allowRemoteModels=false;const tokenizer=await AutoTokenizer.from_pretrained(fileURLToPath(new URL('.cache/context-tokenizer',root)),{local_files_only:true});
 const tokenizerJson=await json('.cache/context-tokenizer/tokenizer.json'),startId=tokenizerJson.added_tokens.find(t=>t.content==='<|im_start|>').id,endId=tokenizerJson.added_tokens.find(t=>t.content==='<|im_end|>').id;
 for(const scenario of inputs.scenarios)for(const windowTokens of protocol.workWindows)for(const policy of protocol.policies){
  const measurements=[];
  const result=packContext({scenario,system,windowTokens,reservedOutputTokens:protocol.reservedOutputTokens,maxSources:protocol.maxSources,policy},messages=>{
   assert.ok(messages.every(m=>!m.content.includes('<|im_start|>')&&!m.content.includes('<|im_end|>')));
   const prompt=tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true}),encoded=tokenizer([prompt],{padding:false,truncation:false,return_tensor:false,add_special_tokens:false}),inputIds=encoded.input_ids[0];
   assert.equal(encoded.attention_mask[0].length,inputIds.length);assert.ok(encoded.attention_mask[0].every(n=>n===1));assert.equal(inputIds.filter(id=>id===startId).length,messages.length+1);assert.equal(inputIds.filter(id=>id===endId).length,messages.length);
   const measurement={messagesHash:hash(JSON.stringify(messages)),prompt,inputIds};measurements.push(measurement);return measurement;
  });
  if(['ready','no_evidence'].includes(result.status))assert.ok(result.inputIds.length+protocol.reservedOutputTokens<=windowTokens);
  if(result.status==='rejected_scope')assert.equal(measurements.length,0);
  rows.push({scenarioId:scenario.id,windowTokens,reservedOutputTokens:protocol.reservedOutputTokens,policy,result,measurements});
 }
}catch(error){failure={message:error.message,stack:error.stack};}
const artifact={capturedAt:new Date().toISOString(),kind:'real_tokenizer_complete_chat_context_packing',sourceHashes,protocol,tokenizer:{model:manifest.model,revision:manifest.revision,library:manifest.library,libraryVersion:manifest.libraryVersion},rows,...(failure?{failure}:{})};
await writeFile(new URL(failure?'results/context-failed.json':'results/context.json',root),JSON.stringify(artifact,null,2)+'\n');if(failure)throw Error(failure.message);
console.log(JSON.stringify({rows:rows.length,statuses:Object.fromEntries([...new Set(rows.map(r=>r.result.status))].map(status=>[status,rows.filter(r=>r.result.status===status).length])),tokenizerCalls:rows.reduce((n,r)=>n+r.measurements.length,0),maxAcceptedInput:Math.max(...rows.filter(r=>r.result.prompt!==null).map(r=>r.result.inputIds.length)),modelInference:false},null,2));
