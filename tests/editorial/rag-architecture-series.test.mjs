import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';
import {conceptDiagram} from '../../packages/rag-architecture/concepts.mjs';
const base='packages/rag-architecture/',json=async path=>JSON.parse(await readFile(path));
const manifest=await json('docs/editorial/rag-architecture-series.json');
test('RAG architecture: nine focused drafts cover the planned chain and preserve explicit limits',async()=>{
 assert.equal(manifest.editorialState,'verified_drafts');assert.equal(manifest.status,'draft');assert.equal(manifest.plannedIds.length,9);assert.equal(manifest.articles.length,9);
 assert.deepEqual(manifest.articles.map(a=>a.id),manifest.plannedIds);
 const code=(await Promise.all(['schema.sql','search.sql','capture-isolation.mjs','capture-conversation.mjs','conversations.mjs','multistep.mjs','retrieval-cache.mjs','updates-core.mjs','capture-updates.mjs','updates-schema.sql','context-packing.mjs','capture-context.mjs','generation-contracts.mjs'].map(f=>readFile(base+f,'utf8')))).join('\n').replace(/\s+/g,'');
 for(const [i,article] of manifest.articles.entries()){
  const source=await readFile(blogPath('src/content/posts/es/'+article.slug+'.md'),'utf8'),meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],article[key]);
  assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.series,manifest.name);assert.ok(source.split(/\s+/).length>1000);assert.doesNotMatch(source,/—|\[\[/);
  if(!i)assert.deepEqual(meta.prerequisites,['P112','P113','P114']);else assert.deepEqual(meta.prerequisites,[manifest.articles[i-1].id]);
  for(const[,snippet]of source.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.includes(snippet.replace(/\s+/g,'')),article.id+' code');
  for(const[,sql]of source.matchAll(/```sql\n([\s\S]*?)\n```/g))assert.ok(code.includes(sql.replace(/\s+/g,'')),article.id+' SQL executed in capture');
  for(const file of article.files)await access(base+file);
  for(const[,slug]of source.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
  for(const directory of ['assets/rag-architecture','public/assets/visuals/rag-architecture'])assert.equal(await readFile(blogPath(directory+'/'+article.id+'.svg'),'utf8'),conceptDiagram(article.id));
 }
});
test('RAG architecture: frozen native evidence verifies roles, requests, probes and physical relations',()=>{
 const result=spawnSync(process.execPath,[base+'verify-isolation.mjs'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.verified,true);assert.equal(report.deniedProbes,36);
 assert.deepEqual(report.summary.map(r=>[r.requests,r.nonemptyGold,r.emptyGold,r.exposures,r.unexpected,r.meanEligibleRecall]),[[28,19,9,0,0,1],[28,19,9,0,0,1]]);
});
test('RAG architecture: public playback preserves actual capture, corpus and scoped gold',async()=>{
 const pack=await json(base+'viewer-data.json');assert.equal(pack.kind,'saved_public_synthetic_database_execution');
 assert.deepEqual(pack.capture,await json(base+'results/isolation.json'));assert.deepEqual(pack.corpus,await json(base+'corpus.json'));assert.deepEqual(pack.cases,await json(base+'cases.json'));
 const exports=(await json('metadata/blog-exports.json')).filter(r=>r.source.startsWith(base));assert.equal(exports.length,33);
 for(const file of exports)assert.deepEqual(await readFile(file.source),await readFile(blogPath(file.destination)));
 assert.match(await readFile(base+'explorer.html','utf8'),/no autentica al visitante/);
 assert.ok(manifest.validationLimits.some(s=>s.includes('61 P114')));
});

test('RAG architecture: conversation evidence is reauthorized in21 actual cases,including revocations',async()=>{
 const result=spawnSync(process.execPath,[base+'verify-conversation.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.cases,21);assert.deepEqual(report.counts,{ready:7,forbidden:8,unavailable_reference:4,not_found:1,no_evidence:1});
 const pack=await json(base+'conversation-data.json');assert.equal(pack.kind,'saved_public_synthetic_conversation_cases');assert.deepEqual(pack.capture,await json(base+'results/conversation.json'));
 const article=await readFile(blogPath('src/content/posts/es/rag-conversaciones-historial-referencias-permisos.md'),'utf8'),code=await readFile(base+'conversations.mjs','utf8');for(const[,snippet]of article.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.replace(/\s+/g,'').includes(snippet.replace(/\s+/g,'')));
});

test('RAG architecture:44 frozen workflows retain negative paths and bounded authorized reads',async()=>{
 const result=spawnSync(process.execPath,[base+'verify-multistep.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.workflows,44);assert.equal(report.sourceCalls,60);assert.deepEqual(report.stops,{call_budget:12,requirements_met:10,no_progress:14,no_results:4,source_budget:4});
 const pack=await json(base+'multistep-data.json');assert.equal(pack.kind,'saved_public_synthetic_bounded_workflows');assert.deepEqual(pack.capture,await json(base+'results/multistep.json'));assert.deepEqual(pack.cases,await json(base+'multistep-cases.json'));
 for(const role of ['alpha_reader','alpha_manager','beta_reader','beta_manager']){assert.equal(pack.capture.rows.find(r=>r.caseId===role+'-one-step').coverage,0);assert.equal(pack.capture.rows.find(r=>r.caseId===role+'-follow-reference').coverage,1);assert.equal(pack.capture.rows.find(r=>r.caseId===role+'-direct-sufficient').result.calls,1);}
});

test('RAG architecture:22 cache lookups retain revocations,ACL epochs,errors and real expiry',async()=>{
 const result=spawnSync(process.execPath,[base+'verify-cache.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.requests,22);assert.deepEqual(report.lookups,{hit:8,miss:13,expired:1});assert.equal(report.sourceCalls,14);assert.equal(report.sourceErrors,2);assert.ok(report.observedWaitMs>=3000);
 const pack=await json(base+'cache-data.json');assert.equal(pack.kind,'saved_public_synthetic_retrieval_cache');assert.deepEqual(pack.capture,await json(base+'results/cache.json'));
 const revoked=pack.capture.rows.find(r=>r.caseId==='revoked-manager');assert.equal(revoked.principal.authorizationRevision,2);assert.deepEqual(revoked.result.rows,[]);
 const acl=pack.capture.rows.find(r=>r.caseId==='document-acl-changed');assert.equal(acl.state.accessRevision,2);assert.deepEqual(acl.result.rows,[]);assert.equal(pack.capture.rows.find(r=>r.caseId==='global-epoch-affects-beta').lookup.status,'miss');
});

test('RAG architecture:actual activation preserves overlap,current ACL and historical sources',async()=>{
 const result=spawnSync(process.execPath,[base+'verify-updates.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.deepEqual(report,{verified:true,activationAttempts:3,accepted:1,reads:11,hits:4,sourceReads:7,citations:9,resolved:4,overlapVerified:true,currentAclForHistoricalContent:true});
 const pack=await json(base+'updates-data.json');assert.equal(pack.kind,'saved_public_synthetic_generation_activation');assert.deepEqual(pack.capture,await json(base+'results/updates.json'));
 for(const id of ['old-after-acl','new-after-acl'])assert.deepEqual(pack.capture.citations.find(c=>c.caseId===id).rows,[]);
 const historical=pack.capture.citations.find(c=>c.caseId==='manager-old');assert.equal(historical.rows[0].stored_access_level,0);assert.equal(historical.rows[0].access_level,1);assert.equal(historical.rows[0].body,'La cache tiene TTL de 300 segundos.');
});

test('RAG architecture:60 complete-chat budgets preserve real counts and all rejection states',async()=>{
 const result=spawnSync(process.execPath,[base+'verify-context.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.rows,60);assert.deepEqual(report.statuses,{ready:34,base_over_budget:8,no_evidence:6,rejected_scope:12});assert.equal(report.measurements,165);assert.equal(report.modelInference,false);
 const pack=await json(base+'context-data.json');assert.equal(pack.kind,'saved_public_synthetic_context_packing');assert.deepEqual(pack.capture,await json(base+'results/context.json'));assert.deepEqual(pack.inputs,await json(base+'context-inputs.json'));
 assert.ok(pack.capture.rows.filter(r=>r.result.status==='rejected_scope').every(r=>r.measurements.length===0));assert.ok(pack.capture.rows.filter(r=>r.result.prompt!==null).every(r=>r.result.inputIds.length+r.reservedOutputTokens<=r.windowTokens));
 const metadata=await json(base+'context-tokenizer-manifest.json');assert.equal(metadata.revision,'22942cb7d7ba4cc81bb4673549ca4d4614469b5e');assert.ok(metadata.files.every(f=>f.file.endsWith('.json')));
});

test('RAG architecture:prepared descriptors do not claim model execution or a fine-tuning comparison',async()=>{
 const result=spawnSync(process.execPath,[base+'verify-generation-contracts.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.deepEqual(report,{verified:true,descriptors:60,prepared:34,notPrepared:26,generationsExecuted:0,ragFineTuningComparisons:0});
 const pack=await json(base+'architecture-data.json');assert.equal(pack.kind,'derived_provenance_inspector_no_model_comparison');assert.deepEqual(pack.data,await json(base+'results/generation-contracts.json'));assert.ok(pack.data.rows.every(r=>r.descriptor.executed===false));assert.equal(pack.data.modelProfile.adapter,null);
});
