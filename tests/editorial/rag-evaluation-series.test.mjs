import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';
import {datasetDiagram} from '../../packages/rag-evaluation/concepts.mjs';
import {rankingDiagram} from '../../packages/rag-evaluation/ranking-concepts.mjs';
import {contextDiagram} from '../../packages/rag-evaluation/context-concepts.mjs';
const json=async file=>JSON.parse(await readFile(file));
const base='packages/rag-evaluation/',manifest=await json('docs/editorial/rag-evaluation-series.json');
test('RAG evaluation: five Spanish drafts start a ten-part series without claiming A/B completion',async()=>{
 assert.equal(manifest.editorialState,'in_progress');assert.deepEqual(manifest.verifiedIds,manifest.articles.map(a=>a.id));assert.equal(manifest.plannedIds.length,10);assert.equal(manifest.articles.length,5);
 const article=manifest.articles[0],source=await readFile(blogPath('src/content/posts/es/'+article.slug+'.md'),'utf8'),meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
 for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],article[key]);
 assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.status,'draft');assert.equal(meta.draft,true);assert.equal(meta.series,manifest.name);assert.ok(source.split(/\s+/).length>1500);assert.doesNotMatch(source,/—|\[\[/);
 assert.match(source,/No es un test ciego/i);assert.match(source,/todavía no ejecuta esa comparación/);assert.match(source,/61 generaciones/);
 const code=(await readFile(base+'dataset.mjs','utf8')).replace(/\s+/g,'');
 for(const[,snippet]of source.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.includes(snippet.replace(/\s+/g,'')));
 for(const[,slug]of source.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
 for(const file of article.files)await access(base+file);
});
test('RAG evaluation: hashes and structural validation retain all labels without model execution',()=>{
 const result=spawnSync(process.execPath,[base+'verify.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{verified:true,documents:16,facts:32,queries:20,dev:5,test:15,answerable:16,unanswerable:4,grades:{0:296,1:16,2:8},groups:8,modelRuns:0});
});
test('RAG evaluation: public viewer contains authored gold,not rankings or generated answers',async()=>{
 const pack=await json(base+'viewer-data.json');assert.equal(pack.kind,'authored_dataset_not_model_results');assert.deepEqual(pack.data.corpus,await json(base+'corpus.json'));assert.deepEqual(pack.data.queries,await json(base+'queries.json'));assert.deepEqual(pack.data.gold,await json(base+'gold.json'));assert.equal(pack.report.modelRuns,0);
 const exports=(await json('metadata/blog-exports.json')).filter(r=>r.source.startsWith(base));assert.equal(exports.length,15);for(const row of exports)assert.deepEqual(await readFile(row.source),await readFile(blogPath(row.destination)));
});
test('RAG evaluation: native diagram is identical in source and blog assets',async()=>{
 assert.equal(await readFile(base+'dataset-diagram.svg','utf8'),datasetDiagram());
 for(const folder of ['assets/rag-evaluation','public/assets/visuals/rag-evaluation'])assert.equal(await readFile(blogPath(folder+'/P116.svg'),'utf8'),datasetDiagram());
});

test('RAG ranking: three focused drafts match the frozen evaluator and their prerequisite chain',async()=>{
 const code=(await readFile(base+'ranking-metrics.v1.mjs','utf8')).replace(/\s+/g,'');
 for(const [i,article]of manifest.articles.entries()){
  if(!i||i>3)continue;const source=await readFile(blogPath('src/content/posts/es/'+article.slug+'.md'),'utf8'),meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],article[key]);assert.deepEqual(meta.prerequisites,[manifest.articles[i-1].id]);
  assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,manifest.name);assert.ok(source.split(/\s+/).length>1500);assert.doesNotMatch(source,/—|\[\[/);
  for(const[,snippet]of source.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.includes(snippet.replace(/\s+/g,'')),article.id+' executable excerpt');
  for(const file of article.files)await access(base+file);
  for(const[,slug]of source.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
  for(const folder of ['assets/rag-evaluation','public/assets/visuals/rag-evaluation'])assert.equal(await readFile(blogPath(folder+'/'+article.id+'.svg'),'utf8'),rankingDiagram(article.id));
 }
});
test('RAG ranking: original20 searches,80 evaluations and all metrics replay exactly without new generation',async()=>{
 const result=spawnSync(process.execPath,[base+'verify-rankings.v1.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{verified:true,searches:20,evaluations:80,summaries:12,modelExecutions:0,datasetUnchanged:true});
 const capture=await json(base+'results/rankings.v1.json'),testAt1=capture.summaries.find(s=>s.split==='test'&&s.k===1),testAt3=capture.summaries.find(s=>s.split==='test'&&s.k===3);
 assert.equal(testAt1.answerable,12);assert.equal(testAt1.noAnswer,3);assert.equal(testAt1.meanRr,1);assert.equal(testAt1.meanRecall,.75);assert.equal(testAt3.meanAllPrecision,.4);assert.equal(testAt3.meanAnswerablePrecision,.5);
 assert.equal(capture.rows.find(r=>r.queryId==='Q002').evaluations.find(m=>m.k===5).recall,.5);
 const plan=await json(base+'comparison-plan.v1.json');assert.equal(plan.models[1].revision,'d54957e3af1be04546436e874a60fe386041b244');assert.equal(plan.status,'not_executed');
});
test('RAG ranking: public playback keeps actual searches separate from eight authored controls',async()=>{
 const pack=await json(base+'ranking-data.json');assert.deepEqual(pack.capture,await json(base+'results/rankings.v1.json'));assert.deepEqual(pack.corpus,await json(base+'corpus.json'));assert.deepEqual(pack.gold,await json(base+'gold.json'));assert.equal(pack.controls.rows.length,8);assert.equal(pack.controls.kind,'authored_metric_controls_not_retriever_or_model_outputs');
 const exports=(await json('metadata/blog-exports.json')).filter(r=>r.source.startsWith(base));assert.equal(exports.length,15);for(const row of exports)assert.deepEqual(await readFile(row.source),await readFile(blogPath(row.destination)));
 const high=pack.controls.rows.find(r=>r.id==='C05').evaluations.find(m=>m.k===3),low=pack.controls.rows.find(r=>r.id==='C06').evaluations.find(m=>m.k===3);assert.equal(high.rr,low.rr);assert.equal(high.precision,low.precision);assert.equal(high.ndcg,1);assert.ok(low.ndcg<1);
 for(const row of pack.capture.rows){const positive=new Set(pack.gold.rows.find(g=>g.queryId===row.queryId).qrels.filter(r=>r.grade>0).map(r=>r.grade));assert.ok(positive.size<=1,'Native gold does not mix positive grades within a query');}
});

test('RAG context: fifth draft explains distinct denominators,actual tokenizer limits and no generation',async()=>{
 const article=manifest.articles[4],source=await readFile(blogPath('src/content/posts/es/'+article.slug+'.md'),'utf8'),meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
 for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],article[key]);assert.equal(meta.id,'RAG-CONTEXT-RELEVANCE');assert.deepEqual(meta.prerequisites,['RAG-NDCG']);assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.locale,'es');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.series,manifest.name);assert.ok(source.split(/\s+/).length>1500);assert.doesNotMatch(source,/—|\[\[/);
 const code=(await readFile(base+'context-core.v1.mjs','utf8')).replace(/\s+/g,'');for(const[,snippet]of source.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.includes(snippet.replace(/\s+/g,'')));
 for(const file of article.files){assert.ok(!file.split('/').some(p=>['.cache','node_modules'].includes(p)));await access(base+file);}
 for(const[,slug]of source.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
 for(const folder of ['assets/rag-evaluation','public/assets/visuals/rag-evaluation'])assert.equal(await readFile(blogPath(folder+'/RAG-CONTEXT-RELEVANCE.svg'),'utf8'),contextDiagram());
 const result=spawnSync(process.execPath,[base+'verify-contexts.v1.mjs'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{verified:true,compositions:120,measurements:474,identicalPromptAndIdPairs:60,fullBaselinePairs:20,maxAcceptedInput:383,statuses:{empty_context:40,ready:80},tokenizerReencoded:false,modelExecutions:0,generatedTokens:0});
});
test('RAG context: public data preserves all120 compositions and metadata,without weight files or a judge score',async()=>{
 const pack=await json(base+'context-data.json');assert.equal(pack.kind,'saved_whole_source_input_and_authored_gold_proxies_not_model_answers');assert.deepEqual(pack.capture,await json(base+'results/contexts.v1.json'));assert.deepEqual(pack.corpus,await json(base+'corpus.json'));assert.deepEqual(pack.queries,await json(base+'queries.json'));assert.deepEqual(pack.gold,await json(base+'gold.json'));assert.deepEqual(pack.tokenizers,await json(base+'context-tokenizers.v1.json'));
 assert.equal(pack.tokenizers.tokenizers.length,2);assert.equal(pack.tokenizers.tokenizers.flatMap(r=>r.files).length,10);assert.ok(pack.tokenizers.tokenizers.every(r=>r.files.every(f=>f.file.endsWith('.json'))));
 for(const q of pack.queries.rows)for(const id of ['A','B'])assert.deepEqual(pack.capture.rows.find(r=>r.queryId===q.id&&r.tokenizerId===id&&r.inputLimit===384).result,pack.capture.rows.find(r=>r.queryId===q.id&&r.tokenizerId===id&&r.inputLimit===1536).result);
 const row=pack.capture.rows.find(r=>r.queryId==='Q008'&&r.tokenizerId==='A'&&r.inputLimit===1536);assert.equal(row.metrics.requiredEvidenceUnits,105);assert.equal(row.metrics.selectedBodyUnits,291);assert.equal(row.metrics.requiredFactCoverage,1);
 const empty=pack.capture.rows.find(r=>r.queryId==='Q008'&&r.tokenizerId==='A'&&r.inputLimit===256);assert.equal(empty.result.status,'empty_context');assert.equal(empty.result.inputIds.length,221);assert.equal(empty.metrics.requiredFactCoverage,0);assert.equal(empty.metrics.selectedDocumentRelevance,null);
 const selected=JSON.parse(row.result.messages[1].content.split('\nFuentes:\n')[1]);assert.ok(selected.every(s=>JSON.stringify(Object.keys(s))===JSON.stringify(['id','title','body'])));
});
