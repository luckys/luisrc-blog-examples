import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import YAML from 'yaml';
import {blogPath} from '../../scripts/blog-path.mjs';
const manifest=JSON.parse(await readFile('docs/editorial/document-ingestion-series.json'));
const exports=JSON.parse(await readFile('metadata/blog-exports.json'));
test('INGEST: nine Spanish drafts preserve prerequisites,exact excerpts,links and explicit9of9state',async()=>{
 assert.equal(manifest.status,'draft');assert.equal(manifest.editorialState,'verified_drafts');assert.equal(manifest.articles.length,9);assert.equal(manifest.plannedIds.length,9);
 const code=(await Promise.all(['parsing.mjs','capture.mjs','ocr-tsv.mjs','ledger.mjs','ranges.mjs','preflight.mjs','chunking.mjs'].map(file=>readFile('packages/document-ingestion/'+file,'utf8')))).join('\n');
 for(const article of manifest.articles){
  const source=await readFile(blogPath('src/content/posts/es/'+article.slug+'.md'),'utf8'),meta=YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
  for(const key of ['id','title','slug','prerequisites'])assert.deepEqual(meta[key],article[key]);
  assert.equal(meta.author,'Luis Ramírez Calle');assert.equal(meta.draft,true);assert.equal(meta.status,'draft');assert.equal(meta.locale,'es');assert.equal(meta.series,manifest.name);assert.ok(source.split(/\s+/).length>1000);assert.doesNotMatch(source,/—|\[\[/);
  for(const [,snippet]of source.matchAll(/```javascript\n([\s\S]*?)\n```/g))assert.ok(code.replace(/\s+/g,'').includes(snippet.replace(/\s+/g,'')),article.id);
  for(const file of article.files)await access('packages/document-ingestion/'+file);
  for(const [,slug]of source.matchAll(/\]\(\/posts\/([^/)]+)\)/g))await access(blogPath('src/content/posts/es/'+slug+'.md'));
  assert.deepEqual(await readFile(blogPath('assets/document-ingestion/'+article.id+'.svg')),await readFile(blogPath('public/assets/visuals/document-ingestion/'+article.id+'.svg')));
  assert.ok(source.includes('/assets/interactive/document-ingestion/explorer.html'));
 }
 const relevant=exports.filter(row=>row.source.startsWith('packages/document-ingestion/'));assert.equal(relevant.length,20);
 for(const row of relevant)assert.deepEqual(await readFile(row.source),await readFile(blogPath(row.destination)));
});
test('INGEST: viewer preserves the raw capture and explicitly corrects the headerless TSV without new OCR',async()=>{
 const pack=JSON.parse(await readFile('packages/document-ingestion/viewer-data.json')),saved=JSON.parse(await readFile('packages/document-ingestion/results/extraction.json')),derived=JSON.parse(await readFile('packages/document-ingestion/results/ocr-words.json'));
 assert.equal(pack.kind,'saved_document_extraction_not_live_ocr');assert.equal(pack.capturedAt,saved.capturedAt);assert.deepEqual(pack.sourceHashes,saved.sourceHashes);assert.deepEqual(pack.derivedHashes,derived.sourceHashes);
 assert.equal(saved.ocr.words.length,0);assert.equal(pack.ocr.words.length,178);assert.deepEqual(pack.ocr.words,derived.words);assert.equal(pack.ocr.text,saved.ocr.text);assert.equal(pack.ocr.confidence,saved.ocr.confidence);assert.deepEqual(pack.metrics,saved.metrics);assert.deepEqual(pack.layout,saved.layout);
 for(const doc of saved.documents)assert.deepEqual(pack.documents.find(row=>row.id===doc.id).pages,doc.pages);
 assert.equal(pack.metrics.ocr.rate,0);assert.equal(pack.metrics.ocr.referenceCharacters,1158);
 assert.equal(pack.metrics.layout.rows.edits,435);assert.equal(pack.metrics.layout.columns.edits,0);
 assert.equal(pack.ocr.words.find(word=>word.ordinal===27).text,'checksum');assert.equal(pack.ocr.words[27].confidence,42.646103);
});
test('INGEST: five ECharts figures are deterministic derivatives of preserved outputs',async()=>{
 const{extractionChart,confidenceChart,layoutChart,dedupChart,budgetChart}=await import('../../packages/document-ingestion/charts.mjs');
 const saved=JSON.parse(await readFile('packages/document-ingestion/results/extraction.json')),derived=JSON.parse(await readFile('packages/document-ingestion/results/ocr-words.json')),ledger=JSON.parse(await readFile('packages/document-ingestion/results/ledger.json')),preflight=JSON.parse(await readFile('packages/document-ingestion/results/token-preflight.json'));
 for(const[file,fn,input]of [['extraction-counts.svg',extractionChart,saved],['ocr-confidence.svg',confidenceChart,derived.words],['layout-order.svg',layoutChart,saved],['dedup-groups.svg',dedupChart,ledger],['window-budgets.svg',budgetChart,preflight]]){
  const svg=fn(input);assert.equal(svg,fn(input));assert.equal(svg,await readFile('packages/document-ingestion/'+file,'utf8'));assert.ok(svg.includes(file==='window-budgets.svg'?'viewBox="0 0 360 520"':'viewBox="0 0 360 380"'));
 }
});

test('INGEST: viewer preserves all nine provenance records and47 real tokenizer sequences',async()=>{
 const pack=JSON.parse(await readFile('packages/document-ingestion/viewer-data.json')),ledger=JSON.parse(await readFile('packages/document-ingestion/results/ledger.json')),preflight=JSON.parse(await readFile('packages/document-ingestion/results/token-preflight.json'));
 assert.deepEqual(pack.ledger,ledger);assert.deepEqual(pack.preflight,preflight);
 assert.equal(ledger.documents.length,9);assert.equal(ledger.documents.reduce((sum,doc)=>sum+doc.units.length,0),760);
 assert.deepEqual(ledger.indexDocumentIds,['RUNBOOK','COLUMNS','HTML']);assert.equal(ledger.rawGroups.length,8);assert.equal(ledger.contentGroups.length,6);
 assert.equal(ledger.nearCandidates.length,2);assert.ok(ledger.nearCandidates.every(pair=>pair.decision==='review_only_not_merged'));
 assert.equal(preflight.rows.length,47);assert.deepEqual(preflight.summaries.map(row=>[row.budget,row.chunks,row.maxModelTokens]),[[16,25,29],[32,13,52],[48,9,77]]);
});

test('INGEST: final viewer data and three figures retain all semantic boundaries and all80 outcomes',async()=>{
 const json=async file=>JSON.parse(await readFile('packages/document-ingestion/'+file)),pack=await json('viewer-data.json'),chunking=await json('results/chunking.json'),retrieval=await json('results/retrieval.json'),inputs=await json('results/chunk-inputs.json');
 assert.deepEqual(pack.chunkInputs,inputs);assert.deepEqual(pack.chunking,chunking);assert.deepEqual(pack.retrieval,retrieval);
 assert.equal(chunking.semanticDocuments.flatMap(d=>d.boundaries).length,41);assert.ok(chunking.semanticDocuments.flatMap(d=>d.boundaries).every(b=>b.cut&&b.semantic&&!b.budget));
 assert.equal(retrieval.rows.length,80);assert.equal(chunking.tokenRows.length,87);assert.equal(inputs.goldQueries.length,20);
 assert.deepEqual(chunking.summaries.map(s=>[s.chunks,s.totalUnits,s.totalModelTokens]),[[13,367,530],[44,367,592],[14,411,593],[16,471,682]]);
 for(const strategy of ['size32','semantic32','overlap4','overlap8']){
  assert.equal(retrieval.rows.find(r=>r.strategy===strategy&&r.queryId==='Q19').metrics.returned,3);
  assert.equal(retrieval.rows.find(r=>r.strategy===strategy&&r.queryId==='Q20').metrics.returned,0);
  assert.equal(retrieval.rows.find(r=>r.strategy===strategy&&r.queryId==='Q19').metrics.coverage,null);
 }
 const{semanticChart,overlapChart,retrievalChart}=await import('../../packages/document-ingestion/chunk-charts.mjs');
 for(const[file,fn,input,height]of [['semantic-boundaries.svg',semanticChart,chunking,660],['overlap-cost.svg',overlapChart,chunking,420],['retrieval-evidence.svg',retrievalChart,retrieval,480]]){
  const svg=fn(input);assert.equal(svg,fn(input));assert.equal(svg,await readFile('packages/document-ingestion/'+file,'utf8'));assert.ok(svg.includes('viewBox="0 0 360 '+height+'"'));
 }
});
