import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import {packContext} from './context-packing.mjs';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f)),hash=b=>createHash('sha256').update(b).digest('hex');
const capture=await json('results/context.json'),inputs=await json('context-inputs.json'),manifest=await json('context-tokenizer-manifest.json'),system=(await read('context-system.txt')).toString();
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(hash(await read(file)),sha,file);assert.equal(capture.failure,undefined);assert.equal(capture.rows.length,60);assert.equal(capture.tokenizer.revision,manifest.revision);assert.equal(capture.tokenizer.libraryVersion,'3.8.1');
const upstream=await json('results/updates.json'),published=upstream.relations.find(r=>r.generation==='v2').finalDocuments;
for(const scenario of inputs.scenarios){
 const request=upstream.reads.find(r=>r.role===scenario.principal.role&&r.state.accessRevision===scenario.authorizationContext.accessRevision&&r.state.generation===scenario.authorizationContext.generation&&r.state.indexRevision===scenario.authorizationContext.indexRevision);assert.ok(request);assert.deepEqual(scenario.principal,request.principal);assert.deepEqual(scenario.authorizationContext,request.state);
 for(const source of scenario.sources){
  if(source.origin==='authored length control,not a PostgreSQL document'){assert.equal(source.id,'length-control-v1');assert.equal(source.generation,'authored-length-fixture');continue;}
  const document=published.find(d=>d.id===source.id);assert.ok(document);assert.equal(source.text,document.body);assert.equal(source.tenant,document.tenant);assert.equal(source.revision,document.revision);assert.equal(source.generation,'v2');
  const effective=scenario.authorizationContext.accessRevision===2&&document.tenant==='alpha'&&document.key==='cache'?1:document.accessLevel;assert.equal(source.accessLevel,effective);
 }
}
let tokenizer;
if(process.argv.includes('--tokenizer')){
 for(const f of manifest.files)assert.equal(hash(await read('.cache/context-tokenizer/'+f.file)),f.sha256,f.file);
 assert.equal((await json('node_modules/@huggingface/transformers/package.json')).version,'3.8.1');
 const {AutoTokenizer,env}=await import('@huggingface/transformers');env.allowRemoteModels=false;tokenizer=await AutoTokenizer.from_pretrained(fileURLToPath(new URL('.cache/context-tokenizer',root)),{local_files_only:true});
}
const unique=new Set();let nativeCounts=0;
for(const scenario of inputs.scenarios)for(const windowTokens of capture.protocol.workWindows)for(const policy of capture.protocol.policies){
 const key=scenario.id+':'+windowTokens+':'+policy;assert.ok(!unique.has(key));unique.add(key);const row=capture.rows.find(r=>r.scenarioId===scenario.id&&r.windowTokens===windowTokens&&r.policy===policy);assert.ok(row);assert.equal(row.reservedOutputTokens,64);let cursor=0;
 const replay=packContext({scenario,system,windowTokens,reservedOutputTokens:capture.protocol.reservedOutputTokens,maxSources:capture.protocol.maxSources,policy},messages=>{
  const saved=row.measurements[cursor++];assert.ok(saved);assert.equal(hash(JSON.stringify(messages)),saved.messagesHash);assert.ok(messages.every(m=>!m.content.includes('<|im_start|>')&&!m.content.includes('<|im_end|>')));
  if(tokenizer){const prompt=tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true}),ids=tokenizer([prompt],{padding:false,truncation:false,return_tensor:false,add_special_tokens:false}).input_ids[0];assert.equal(prompt,saved.prompt);assert.deepEqual(ids,saved.inputIds);nativeCounts++;}
  return saved;
 });assert.deepEqual(replay,row.result);assert.equal(cursor,row.measurements.length);assert.equal(row.result.inputBudget,windowTokens-64);
 if(['ready','no_evidence'].includes(row.result.status)){assert.ok(row.result.inputIds.length+64<=windowTokens);const evidence=JSON.parse(row.result.messages.at(-1).content).evidence;assert.deepEqual(evidence.map(e=>e.alias),row.result.selected);for(const e of evidence){const reg=row.result.registry.find(r=>r.alias===e.alias),source=scenario.sources.find(s=>s.id===reg.id);assert.equal(e.text,source.text);assert.equal(hash(e.text),reg.contentHash);assert.equal(source.tenant,scenario.principal.tenant);assert.ok(source.accessLevel<=scenario.principal.maxLevel);}}
 if(row.result.status==='rejected_scope'){assert.equal(cursor,0);assert.equal(row.result.prompt,null);assert.deepEqual(row.result.registry,[]);}
 if(row.result.status==='base_over_budget'){assert.equal(row.result.prompt,null);assert.ok(row.result.rejectedBase.inputIds.length>row.result.inputBudget);}
 if(row.result.status==='ready')assert.ok(row.result.selected.length>0);if(row.result.status==='no_evidence')assert.deepEqual(row.result.selected,[]);
 if(scenario.id==='T10')assert.deepEqual(row.result.selected,['S02']);
}
const statuses=Object.fromEntries([...new Set(capture.rows.map(r=>r.result.status))].map(status=>[status,capture.rows.filter(r=>r.result.status===status).length]));assert.deepEqual(statuses,{ready:34,base_over_budget:8,no_evidence:6,rejected_scope:12});assert.equal(capture.rows.reduce((n,r)=>n+r.measurements.length,0),165);
const selected=(id,window,policy)=>capture.rows.find(r=>r.scenarioId===id&&r.windowTokens===window&&r.policy===policy).result;assert.deepEqual(selected('T05',320,'history_first').selected,['S01']);assert.deepEqual(selected('T05',320,'history_first').historyIds,['H3']);assert.deepEqual(selected('T05',320,'evidence_first').selected,['S01','S02','S03']);assert.deepEqual(selected('T05',320,'evidence_first').historyIds,[]);
console.log(JSON.stringify({verified:true,rows:60,statuses,measurements:165,retokenized:nativeCounts,maxAcceptedInput:Math.max(...capture.rows.filter(r=>r.result.prompt!==null).map(r=>r.result.inputIds.length)),modelInference:false},null,2));
