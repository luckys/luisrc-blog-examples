import {readFile} from 'node:fs/promises';
import {root,json,journal,exists} from './generation-io.v1.mjs';
const inputs=await json('results/generation-inputs.v1.json'),events=await journal(),alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
const status=[];for(const modelId of ['A','B']){let saved=0;for(const row of inputs.inputs.filter(r=>r.modelId===modelId))if(await exists('results/response-v1/'+row.id+'.json'))saved++;const sessions=events.filter(e=>e.event==='model_session_started'&&e.modelId===modelId);status.push({modelId,saved,planned:20,sessions:sessions.map(e=>({sessionId:e.sessionId,pid:e.pid,liveNow:alive(e.pid)}))});}
let controller=null;try{const lock=JSON.parse(await readFile(new URL('results/response-v1/active.lock',root)));controller={pid:lock.pid,liveNow:alive(lock.pid)};}catch(error){if(error.code!=='ENOENT')throw error;}
console.log(JSON.stringify({completeArtifact:await exists('results/generation.v1.json'),controller,status,lastEvent:events.at(-1)},null,2));
