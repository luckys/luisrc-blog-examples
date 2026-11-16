import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {prepareGenerationDescriptor} from './generation-contracts.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f));
const data=await json('results/generation-contracts.json'),context=await json('results/context.json'),inputs=await json('context-inputs.json'),generator=await json('../reranking-grounding/generator-model-files.json');
for(const[file,sha]of Object.entries(data.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha,file);
assert.equal(data.kind,'derived_request_provenance_not_model_execution');assert.deepEqual(data.modelProfile,{id:generator.model,revision:generator.revision,dtype:generator.dtype,tokenizerRevision:context.tokenizer.revision,adapter:null});assert.equal(data.rows.length,60);
for(const [index,row]of context.rows.entries()){
 const saved=data.rows[index];assert.equal(saved.scenarioId,row.scenarioId);assert.equal(saved.windowTokens,row.windowTokens);assert.equal(saved.policy,row.policy);
 const result=prepareGenerationDescriptor({row,scenario:inputs.scenarios.find(s=>s.id===row.scenarioId),tokenizerProfile:context.tokenizer,modelProfile:data.modelProfile,promptRevision:context.sourceHashes['context-system.txt']});assert.deepEqual(saved.descriptor,result);assert.equal(result.executed,false);
 if(result.status==='prepared_not_executed'){assert.equal(result.prompt,row.result.prompt);assert.deepEqual(result.inputIds,row.result.inputIds);assert.equal(result.inputTokens,row.result.inputIds.length);assert.equal(result.maxNewTokens,64);assert.equal(result.provenance.model.adapter,null);assert.deepEqual(result.evidence.map(e=>e.alias),row.result.selected);}
 else{assert.equal(result.reason,row.result.status);assert.equal(result.prompt,undefined);}
}
assert.equal(data.rows.filter(r=>r.descriptor.status==='prepared_not_executed').length,34);
console.log(JSON.stringify({verified:true,descriptors:60,prepared:34,notPrepared:26,generationsExecuted:0,ragFineTuningComparisons:0},null,2));
