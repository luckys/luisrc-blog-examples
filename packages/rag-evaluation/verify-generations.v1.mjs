import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {root,read,json,digest,fileDigest,journal} from './generation-io.v1.mjs';
import {validateResponse} from './response-contract.v1.mjs';
const prepared=await json('results/generation-inputs.v1.json'),capture=await json('results/generation.v1.json'),models=await json('generation-models.v1.json'),plan=await json('comparison-plan.v1.json'),contexts=await json('results/contexts.v1.json');
assert.equal(capture.kind,'all_fixed_two_checkpoint_attempts_preserved');assert.equal(prepared.inputs.length,40);assert.equal(capture.rows.length,40);
const sourceHashes={...prepared.sourceHashes,'results/generation-inputs.v1.json':digest(await read('results/generation-inputs.v1.json'))};assert.deepEqual(capture.sourceHashes,sourceHashes);for(const[f,h]of Object.entries(sourceHashes))assert.equal(digest(await read(f)),h,f);
const events=await journal();assert.equal(digest(await read('results/response-v1/events.jsonl')),capture.eventsSha256);
const decoders=new Map();if(process.argv.includes('--tokenizers')){const {AutoTokenizer,env}=await import('@huggingface/transformers');env.allowRemoteModels=false;for(const model of models.models)decoders.set(model.id,await AutoTokenizer.from_pretrained(fileURLToPath(new URL(model.cacheFolder,root)),{local_files_only:true}));}
if(process.argv.includes('--models'))for(const model of models.models)for(const file of model.files)assert.equal(await fileDigest(new URL(model.cacheFolder+'/'+file.file,root)),file.sha256);
const counts={};let produced=0,valid=0,decoded=0;
for(const [i,index]of capture.rows.entries()){
 const input=prepared.inputs[i],record=await json(index.file);assert.equal(index.id,input.id);assert.equal(digest(await read(index.file)),index.sha256);assert.deepEqual(record.sourceHashes,sourceHashes);assert.equal(record.id,input.id);assert.equal(record.queryId,input.queryId);assert.equal(record.modelId,input.modelId);assert.equal(record.split,input.split);assert.equal(index.outcome,record.outcome);assert.deepEqual(record.inputIds,input.inputIds);
 const context=contexts.rows.find(r=>r.tokenizerId===input.modelId&&r.queryId===input.queryId&&r.inputLimit===plan.inputs.inputTokenLimit);assert.equal(input.prompt,context.result.prompt);assert.deepEqual(input.inputIds,context.result.inputIds);assert.deepEqual(input.sourceIds,context.result.selectedIds);
 counts[record.outcome]=(counts[record.outcome]??0)+1;
 if(record.outcome==='generated'){
  produced++;assert.ok(events.some(e=>e.event==='case_started'&&e.id===input.id));assert.ok(events.some(e=>e.event==='case_completed'&&e.id===input.id&&e.outcome==='generated'));assert.ok(record.generatedIds.length<=plan.generation.max_new_tokens);assert.ok(record.generatedIds.every(id=>Number.isSafeInteger(id)&&id>=0));assert.equal(record.reachedTokenLimit,record.generatedIds.length===plan.generation.max_new_tokens);assert.deepEqual(record.validation,validateResponse(record.raw,input.sourceIds));if(record.validation.valid)valid++;
  for(const key of ['prepareInputMs','generateMs','decodeMs','validateMs','caseTotalMs'])assert.ok(Number.isFinite(record.timing[key])&&record.timing[key]>=0);assert.ok(record.timing.caseTotalMs+1e-6>=record.timing.prepareInputMs+record.timing.generateMs+record.timing.decodeMs+record.timing.validateMs);for(const n of Object.values(record.resources))assert.ok(Number.isFinite(n)&&n>=0);
  const load=await json('results/response-v1/load-'+record.sessionId+'.json');assert.equal(load.kind,'actual_local_model_load');assert.equal(load.modelId,record.modelId);assert.deepEqual(load.sourceHashes,sourceHashes);assert.ok(load.modelLoadMs>0);
  if(decoders.size){const tokenizer=decoders.get(record.modelId);assert.equal(tokenizer.decode(record.generatedIds,{skip_special_tokens:true}),record.raw);assert.equal(tokenizer.decode(record.generatedIds,{skip_special_tokens:false}),record.decodedWithSpecialTokens);decoded++;}
 }else{assert.ok(['execution_error','interrupted_unknown','not_executed'].includes(record.outcome));assert.equal(record.generatedIds,null);assert.equal(record.raw,null);}
}
console.log(JSON.stringify({verified:true,planned:40,outcomes:counts,actualGenerations:produced,technicallyValid:valid,decodedAgain:decoded,weightsRehashed:process.argv.includes('--models'),noRepairOrRetry:true},null,2));
