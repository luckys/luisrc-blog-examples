import {AutoTokenizer,env} from '@huggingface/transformers';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {readDataset} from './verify.mjs';
import {validateDataset} from './dataset.mjs';
import {packSources,contextEvidenceMetrics} from './context-core.v1.mjs';
const root=new URL('./',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f)),hash=b=>createHash('sha256').update(b).digest('hex');
for(const file of ['results/contexts.v1.json','results/contexts.v1.failure.json']){try{await access(new URL(file,root));throw Error('Preserve existing context capture');}catch(error){if(error.code!=='ENOENT')throw error;}}
await mkdir(new URL('results/',root),{recursive:true});
const files=['capture-context.v1.mjs','context-core.v1.mjs','context-protocol.v1.json','context-tokenizers.v1.json','prepare-tokenizers.v1.mjs','context-dependencies.v1.json','comparison-plan.v1.json','comparison-system.v1.txt','results/rankings.v1.json','corpus.json','queries.json','gold.json','dataset-manifest.json','verify.mjs','dataset.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await read(f))])));
const rows=[];let failure;
try{
 const data=await readDataset();validateDataset(data);const protocol=await json('context-protocol.v1.json'),manifest=await json('context-tokenizers.v1.json'),ranking=await json('results/rankings.v1.json'),plan=await json('comparison-plan.v1.json'),system=(await read('comparison-system.v1.txt')).toString();
 const installed=await json('node_modules/@huggingface/transformers/package.json');assert.equal(installed.version,protocol.tokenization.libraryVersion);assert.equal(protocol.comparisonInputLimit,plan.inputs.inputTokenLimit);assert.equal(protocol.comparisonSourceCount,plan.inputs.k);
 env.allowRemoteModels=false;env.allowLocalModels=true;
 for(const profile of manifest.tokenizers){
  const planned=plan.models.find(m=>m.id===profile.id);assert.equal(profile.revision,planned.revision);assert.equal(profile.repository,planned.repository);
  for(const file of profile.files)assert.equal(hash(await read(profile.cacheFolder+'/'+file.file)),file.sha256,file.file);
  const tokenizer=await AutoTokenizer.from_pretrained(fileURLToPath(new URL(profile.cacheFolder,root)),{local_files_only:true});
  const tokens=await json(profile.cacheFolder+'/tokenizer.json'),startId=tokens.added_tokens.find(t=>t.content==='<|im_start|>').id,endId=tokens.added_tokens.find(t=>t.content==='<|im_end|>').id;
  for(const request of ranking.rows){
   const candidates=request.ranking.slice(0,protocol.comparisonSourceCount).map(r=>data.corpus.documents.find(d=>d.id===r.id));assert.ok(candidates.every(Boolean));
   for(const inputLimit of protocol.inputLimits){
    const measurements=[];
    const result=packSources({system,question:request.question,candidates,inputLimit},messages=>{
     const prompt=tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true}),encoded=tokenizer([prompt],{padding:false,truncation:false,return_tensor:false,add_special_tokens:false}),inputIds=encoded.input_ids[0];assert.equal(encoded.attention_mask[0].length,inputIds.length);assert.ok(encoded.attention_mask[0].every(v=>v===1));assert.equal(inputIds.filter(id=>id===startId).length,messages.length+1);assert.equal(inputIds.filter(id=>id===endId).length,messages.length);
     const value={messagesHash:hash(JSON.stringify(messages)),prompt,inputIds,attentionMaskAllOne:true};measurements.push(value);return value;
    });
    const selected=result.selectedIds.map(id=>data.corpus.documents.find(d=>d.id===id)),label=data.gold.rows.find(g=>g.queryId===request.queryId);
    rows.push({tokenizerId:profile.id,queryId:request.queryId,split:request.split,inputLimit,candidateIds:candidates.map(d=>d.id),result,metrics:result.prompt===null?null:contextEvidenceMetrics(selected,data.corpus,label),measurements});
    if(inputLimit===protocol.comparisonInputLimit)assert.deepEqual(result.selectedIds,candidates.map(d=>d.id),'All baseline sources must fit without changing A/B inputs');
   }
  }
 }
 for(const request of ranking.rows){const pair=rows.filter(r=>r.queryId===request.queryId&&r.inputLimit===protocol.comparisonInputLimit);assert.equal(pair.length,2);assert.deepEqual(pair[0].result.messages,pair[1].result.messages,'A/B must receive identical question/source messages');}
}catch(error){failure={name:error.name,message:error.message,stack:error.stack};}
const artifact={kind:'actual_tokenizer_whole_chat_contexts_with_gold_evidence_proxies',capturedAt:new Date().toISOString(),sourceHashes,runtime:{node:process.version,library:'@huggingface/transformers',libraryVersion:'3.8.1'},modelExecutions:0,generatedTokens:0,rows,...(failure?{failure}:{})};
await writeFile(new URL(failure?'results/contexts.v1.failure.json':'results/contexts.v1.json',root),JSON.stringify(artifact,null,2)+'\n',{flag:'wx'});if(failure)throw Error(failure.message);
console.log(JSON.stringify({compositions:rows.length,tokenizerCalls:rows.reduce((n,r)=>n+r.measurements.length,0),statuses:Object.fromEntries([...new Set(rows.map(r=>r.result.status))].map(s=>[s,rows.filter(r=>r.result.status===s).length])),modelExecutions:0,generatedTokens:0},null,2));
