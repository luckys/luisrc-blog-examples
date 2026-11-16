import {AutoTokenizer,env} from '@huggingface/transformers';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {root,read,json,digest,requireMissing,saveNew,hashes,verifyHashes} from './io.mjs';
import {rerankCandidates,selectEvidence} from './core.mjs';
import {evidenceMetrics} from '../document-ingestion/chunking.mjs';
await requireMissing('results/answer-inputs.json');const inputs=await json('results/inputs.json'),reranker=await json('results/reranker.json'),manifest=await json('generator-model-files.json');await verifyHashes(inputs);await verifyHashes(reranker);
for(const file of manifest.files)assert.equal(digest(await read('.cache/generator/'+file.file)),file.sha256,file.file);
env.allowRemoteModels=false;const tokenizer=await AutoTokenizer.from_pretrained(fileURLToPath(new URL('.cache/generator',root)),{local_files_only:true}),countTokens=text=>tokenizer([text],{padding:false,truncation:false,return_tensor:false,add_special_tokens:false}).input_ids[0].length;
const scores=new Map(reranker.rows.map(row=>[row.id,row.logit])),byId=new Map(inputs.registry.map(c=>[c.id,c])),rerankings=[],selections=[],scenarios=[],prompts=new Map(),profile=digest(JSON.stringify(inputs.protocol.generator));
for(const query of inputs.queries)for(const method of inputs.protocol.retrievers){
 const original=inputs.rankings.find(row=>row.queryId===query.id&&row.method===method).ranking;
 for(const budget of inputs.protocol.candidateBudgets){const raw=original.slice(0,budget),ranked=rerankCandidates(original,query.id,scores,budget),measure=ranking=>evidenceMetrics(ranking.map(r=>byId.get(r.id)),query,inputs.protocol.context.maxChunks);rerankings.push({queryId:query.id,method,budget,raw,reranked:ranked,rawMetrics:measure(raw),rerankedMetrics:measure(ranked)});}
 const rankings=rerankings.find(r=>r.queryId===query.id&&r.method===method&&r.budget===inputs.protocol.answerCandidateBudget);
 for(const mode of ['without','with']){
  const ranking=mode==='with'?rankings.reranked:rankings.raw,id=query.id+':'+method+':'+mode;
  for(const tokenBudget of inputs.protocol.context.tokenBudgets){
   const selection=selectEvidence(ranking,inputs.registry,{maxChunks:inputs.protocol.context.maxChunks,tokenBudget},countTokens);selections.push({scenarioId:id,tokenBudget,...selection});
   if(tokenBudget!==inputs.protocol.context.answerTokenBudget)continue;
   const messages=[{role:'system',content:inputs.systemPrompt},{role:'user',content:'PREGUNTA:\n'+query.text+'\n\nCONTEXTO:\n'+(selection.text||'(sin fragmentos)')}],prompt=tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true}),inputIds=tokenizer([prompt],{padding:false,truncation:false,return_tensor:false,add_special_tokens:false}).input_ids[0];assert.ok(inputIds.length<=inputs.protocol.generator.maxInputTokens,'Prompt too long: no silent truncation');
   const promptId=digest(JSON.stringify([profile,prompt]));if(!prompts.has(promptId))prompts.set(promptId,{id:promptId,queryId:query.id,query:query.text,messages,prompt,inputIds,selectedIds:selection.selected.map(c=>c.id),selectedAliases:selection.selected.map(c=>c.alias),contextTokens:selection.tokens});
   scenarios.push({id,queryId:query.id,method,mode,promptId,selectedIds:selection.selected.map(c=>c.id),contextTokens:selection.tokens});
  }
 }
}
await saveNew('results/answer-inputs.json',{preparedAt:new Date().toISOString(),kind:'fixed_prompts_after_reranking_before_generation',sourceHashes:await hashes(['prepare-answers.mjs','core.mjs','io.mjs','results/inputs.json','results/reranker.json','generator-model-files.json']),generatorProfile:profile,rerankings,selections,scenarios,prompts:[...prompts.values()]});
console.log(JSON.stringify({rerankingComparisons:rerankings.length,selections:selections.length,scenarios:scenarios.length,uniquePrompts:prompts.size,maxPromptTokens:Math.max(...[...prompts.values()].map(p=>p.inputIds.length))}));
