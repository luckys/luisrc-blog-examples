import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {readDataset} from './verify.mjs';
import {validateDataset} from './dataset.mjs';
import {packSources,contextEvidenceMetrics} from './context-core.v1.mjs';
const root=new URL('./',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f)),hash=b=>createHash('sha256').update(b).digest('hex');
const record=await json('results/contexts.v1.json'),protocol=await json('context-protocol.v1.json'),manifest=await json('context-tokenizers.v1.json'),ranking=await json('results/rankings.v1.json'),system=(await read('comparison-system.v1.txt')).toString(),data=await readDataset();validateDataset(data);
for(const[file,digest]of Object.entries(record.sourceHashes))assert.equal(hash(await read(file)),digest,file);
assert.equal(record.kind,'actual_tokenizer_whole_chat_contexts_with_gold_evidence_proxies');assert.equal(record.modelExecutions,0);assert.equal(record.generatedTokens,0);assert.equal(record.rows.length,manifest.tokenizers.length*ranking.rows.length*protocol.inputLimits.length);
const dependency=await json('context-dependencies.v1.json');assert.equal(hash(dependency.content),dependency.sha256);assert.equal(dependency.kind,'dependency_snapshot_not_active_lockfile');
const realTokenizers=new Map();
if(process.argv.includes('--tokenizers')){
 const {AutoTokenizer,env}=await import('@huggingface/transformers');env.allowRemoteModels=false;const installed=await json('node_modules/@huggingface/transformers/package.json');assert.equal(installed.version,protocol.tokenization.libraryVersion);
 for(const profile of manifest.tokenizers){for(const file of profile.files)assert.equal(hash(await read(profile.cacheFolder+'/'+file.file)),file.sha256);realTokenizers.set(profile.id,await AutoTokenizer.from_pretrained(fileURLToPath(new URL(profile.cacheFolder,root)),{local_files_only:true}));}
}
let offset=0,measurements=0;
for(const profile of manifest.tokenizers)for(const request of ranking.rows)for(const inputLimit of protocol.inputLimits){
 const row=record.rows[offset++],candidates=request.ranking.slice(0,protocol.comparisonSourceCount).map(r=>data.corpus.documents.find(d=>d.id===r.id));assert.equal(row.queryId,request.queryId);assert.equal(row.tokenizerId,profile.id);assert.equal(row.inputLimit,inputLimit);assert.equal(row.split,request.split);assert.deepEqual(row.candidateIds,candidates.map(d=>d.id));let index=0;
 const result=packSources({system,question:request.question,candidates,inputLimit},messages=>{
  const saved=row.measurements[index++];assert.ok(saved);assert.equal(saved.messagesHash,hash(JSON.stringify(messages)));assert.equal(saved.attentionMaskAllOne,true);assert.ok(saved.inputIds.every(id=>Number.isSafeInteger(id)&&id>=0));
  if(realTokenizers.size){const tokenizer=realTokenizers.get(profile.id),prompt=tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true}),encoded=tokenizer([prompt],{padding:false,truncation:false,return_tensor:false,add_special_tokens:false});assert.equal(prompt,saved.prompt);assert.deepEqual(encoded.input_ids[0],saved.inputIds);assert.ok(encoded.attention_mask[0].every(v=>v===1));}
  measurements++;return saved;
 });
 assert.equal(index,row.measurements.length);assert.deepEqual(result,row.result);assert.ok(result.prompt===null||result.inputIds.length<=inputLimit);
 const selected=result.selectedIds.map(id=>data.corpus.documents.find(d=>d.id===id)),label=data.gold.rows.find(g=>g.queryId===row.queryId);assert.deepEqual(row.metrics,result.prompt===null?null:contextEvidenceMetrics(selected,data.corpus,label));
 if(inputLimit===protocol.comparisonInputLimit)assert.deepEqual(result.selectedIds,row.candidateIds);
}
let identicalPairs=0;
for(const request of ranking.rows)for(const limit of protocol.inputLimits){const pair=record.rows.filter(r=>r.queryId===request.queryId&&r.inputLimit===limit);assert.equal(pair.length,2);assert.deepEqual(pair[0].result.messages,pair[1].result.messages);assert.deepEqual(pair[0].result.prompt,pair[1].result.prompt);assert.deepEqual(pair[0].result.inputIds,pair[1].result.inputIds);identicalPairs++;}
console.log(JSON.stringify({verified:true,compositions:record.rows.length,measurements,identicalPromptAndIdPairs:identicalPairs,fullBaselinePairs:ranking.rows.length,maxAcceptedInput:Math.max(...record.rows.map(r=>r.result.inputIds.length)),statuses:Object.fromEntries([...new Set(record.rows.map(r=>r.result.status))].map(s=>[s,record.rows.filter(r=>r.result.status===s).length])),tokenizerReencoded:realTokenizers.size>0,modelExecutions:0,generatedTokens:0},null,2));
