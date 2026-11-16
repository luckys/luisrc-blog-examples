import {mkdir,open,readFile,rename,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {root,read,json,digest,exists,saveNew,event,journal,attemptState} from './generation-io.v1.mjs';
assert.equal(await exists('results/generation.v1.json'),false,'Preserve existing completed generation capture');
const prepared=await json('results/generation-inputs.v1.json');for(const[f,h]of Object.entries(prepared.sourceHashes))assert.equal(digest(await read(f)),h,f);
await mkdir(new URL('results/response-v1/',root),{recursive:true});const lock=new URL('results/response-v1/active.lock',root),alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
try{const bytes=await readFile(lock),previous=JSON.parse(bytes);assert.ok(!alive(previous.pid),'Existing capture process is live; observe it instead of restarting');const events=await journal(),workerPids=[...new Set(events.filter(e=>e.event==='model_session_started').map(e=>e.pid))];assert.ok(workerPids.every(pid=>!alive(pid)),'A model worker is still live');await rename(lock,new URL('results/response-v1/stale-lock-'+Date.now()+'.json',root));}catch(error){if(error.code!=='ENOENT')throw error;}
const handle=await open(lock,'wx');await handle.writeFile(JSON.stringify({pid:process.pid,at:new Date().toISOString()}));await handle.close();
const sourceHashes={...prepared.sourceHashes,'results/generation-inputs.v1.json':digest(await read('results/generation-inputs.v1.json'))};
try{
 for(const modelId of ['A','B']){
  const events=await journal();
  for(const input of prepared.inputs.filter(r=>r.modelId===modelId)){
   const file='results/response-v1/'+input.id+'.json';if(await exists(file)){const saved=await json(file);assert.deepEqual(saved.sourceHashes,sourceHashes);continue;}
   if(attemptState(input.id,events,false)==='interrupted_unknown')await saveNew(file,{kind:'unrecoverable_started_generation_not_retried',outcome:'interrupted_unknown',sourceHashes,id:input.id,modelId,queryId:input.queryId,split:input.split,inputIds:input.inputIds,generatedIds:null,raw:null,error:{message:'Started generation has no saved result; output and timing unknown; no retry'}});
  }
  const pending=[];for(const input of prepared.inputs.filter(r=>r.modelId===modelId))if(!await exists('results/response-v1/'+input.id+'.json'))pending.push(input);
  if(!pending.length)continue;
  const sessionId=modelId+'-'+String(events.filter(e=>e.event==='model_session_started'&&e.modelId===modelId).length+1).padStart(2,'0');
  const before=performance.now(),code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(new URL('generation-worker.v1.mjs',root)),modelId,sessionId],{stdio:'inherit'});child.on('error',reject);child.on('exit',(code,signal)=>resolve({code,signal}));});
  await event({event:'profile_process_exited',modelId,sessionId,...code,wallMs:performance.now()-before});
  if(code.code!==0){const current=await journal();for(const input of pending){const file='results/response-v1/'+input.id+'.json';if(await exists(file))continue;const started=attemptState(input.id,current,false)==='interrupted_unknown';await saveNew(file,{kind:'profile_failure_preserved_without_retry',outcome:started?'interrupted_unknown':'not_executed',sourceHashes,id:input.id,modelId,queryId:input.queryId,split:input.split,sessionId,inputIds:input.inputIds,generatedIds:null,raw:null,error:{message:started?'Worker exited after starting case; output unknown':'Worker failed before executing this case',exit:code}});}}
 }
 const rows=[];for(const input of prepared.inputs){const file='results/response-v1/'+input.id+'.json',record=await json(file);assert.deepEqual(record.sourceHashes,sourceHashes);rows.push({id:input.id,modelId:input.modelId,queryId:input.queryId,split:input.split,outcome:record.outcome,file,sha256:digest(await read(file))});}
 await saveNew('results/generation.v1.json',{kind:'all_fixed_two_checkpoint_attempts_preserved',capturedAt:new Date().toISOString(),sourceHashes,runtime:prepared.runtime,rows,eventsSha256:digest(await read('results/response-v1/events.jsonl'))});console.log('All40 planned cases preserved. No favorable retry or repair.');
}finally{await unlink(lock);}
