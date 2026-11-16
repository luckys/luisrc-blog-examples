import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {digest,wordWindows} from './ledger.mjs';
import {sentencePieces,resolveGold} from './chunking.mjs';
import {buildIndex,search} from '../lexical-search/retrieval.mjs';
import {analyzer} from '../lexical-search/analysis.mjs';
import './verify-ledger.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
const ledger=await json('results/ledger.json'),inputs=await json('results/chunk-inputs.json'),embedding=await json('results/semantic-embeddings.json'),chunking=await json('results/chunking.json'),retrieval=await json('results/retrieval.json');
for(const saved of [inputs,embedding,chunking,retrieval])for(const[file,hash]of Object.entries(saved.sourceHashes))assert.equal(digest(await read(file)),hash,file);
assert.ok(Date.parse(inputs.preparedAt)<=Date.parse(embedding.capturedAt));assert.ok(Date.parse(embedding.capturedAt)<=Date.parse(retrieval.capturedAt));
const documents=inputs.protocol.corpus.map(id=>ledger.documents.find(doc=>doc.documentId===id));
assert.deepEqual(resolveGold(await json('retrieval-queries.json'),documents),inputs.goldQueries);assert.deepEqual(retrieval.queries,inputs.goldQueries);
assert.equal(process.versions.icu,inputs.runtime.icu,'Match recorded ICU to reproduce sentence segmentation');
for(const group of inputs.segments)assert.deepEqual(sentencePieces(documents.find(doc=>doc.documentId===group.documentId),inputs.protocol.segmentation.maxUnits),{pieces:group.pieces,ignored:group.ignored});
const pieces=inputs.segments.flatMap(group=>group.pieces);assert.equal(embedding.rows.length,pieces.length);
for(const piece of pieces){const row=embedding.rows.find(row=>row.id===piece.id);for(const key of ['documentId','first','last','start','end','text'])assert.deepEqual(row[key],piece[key]);assert.equal(row.rawVector.length,384);assert.ok(row.rawVector.every(Number.isFinite));assert.ok(Math.hypot(...row.rawVector)>0);assert.equal(row.inputIds.length,row.attentionMask.length);assert.ok(row.attentionMask.every(value=>value===0||value===1));assert.equal(row.attentionMask.reduce((sum,value)=>sum+value,0),row.modelTokens);assert.ok(row.modelTokens<=128);}
for(const group of inputs.segments){
 const doc=documents.find(doc=>doc.documentId===group.documentId),saved=chunking.semanticDocuments.find(row=>row.documentId===group.documentId),expected=[];let first=0;
 assert.equal(saved.boundaries.length,group.pieces.length-1);
 for(let i=1;i<group.pieces.length;i++){
  const a=embedding.rows.find(row=>row.id===group.pieces[i-1].id).rawVector,b=embedding.rows.find(row=>row.id===group.pieces[i].id).rawVector;
  let dot=0,aa=0,bb=0;for(let j=0;j<a.length;j++){dot+=a[j]*b[j];aa+=a[j]*a[j];bb+=b[j]*b[j];}
  const distance=1-dot/Math.sqrt(aa*bb),over=group.pieces[i].last-first>32,semantic=distance>inputs.protocol.semantic.threshold,boundary=saved.boundaries[i-1];
  assert.ok(Math.abs(distance-boundary.distance)<1e-12);assert.equal(boundary.budget,over);assert.equal(boundary.semantic,semantic);assert.equal(boundary.cut,over||semantic);assert.equal(boundary.reason,over?'budget':semantic?'semantic':'continue');
  if(over||semantic){expected.push([first,group.pieces[i].first]);first=group.pieces[i].first;}
 }
 expected.push([first,doc.units.length]);assert.deepEqual(saved.chunks.map(chunk=>[chunk.first,chunk.last]),expected);
}
assert.deepEqual(chunking.strategies.find(strategy=>strategy.id==='size32').chunks,ledger.chunks.filter(chunk=>chunk.budget===32));
assert.equal(chunking.tokenRows.length,chunking.strategies.reduce((sum,strategy)=>sum+strategy.chunks.length,0));
for(const strategy of chunking.strategies){
 let total=0;const unique=new Set();
 for(const doc of documents){const chunks=strategy.chunks.filter(chunk=>chunk.documentId===doc.documentId),coverage=Array(doc.units.length).fill(0);
  for(const chunk of chunks){assert.equal(chunk.representationId,doc.representationId);assert.equal(chunk.text,doc.text.slice(chunk.start,chunk.end));assert.equal(chunk.start,doc.units[chunk.first].start);assert.equal(chunk.end,doc.units[chunk.last-1].end);assert.ok(chunk.last-chunk.first<=32);const id=digest(JSON.stringify([doc.representationId,chunk.policy,chunk.first,chunk.last,chunk.start,chunk.end,chunk.text]));assert.equal(chunk.id,id);
   for(let i=chunk.first;i<chunk.last;i++){coverage[i]++;unique.add(doc.representationId+':'+i);total++;}
  }
  assert.ok(coverage.every(count=>count>=1));if(!strategy.id.startsWith('overlap'))assert.ok(coverage.every(count=>count===1));
  if(strategy.id.startsWith('overlap')){const overlap=Number(strategy.id.slice(7)),ranges=[];for(let first=0;;first+=32-overlap){const last=Math.min(first+32,doc.units.length);ranges.push([first,last]);if(last===doc.units.length)break;}assert.deepEqual(chunks.map(chunk=>[chunk.first,chunk.last]),ranges);}
 }
 const tokens=chunking.tokenRows.filter(row=>row.strategy===strategy.id);for(const row of tokens){const chunk=strategy.chunks.find(chunk=>chunk.id===row.chunkId);assert.equal(row.units,chunk.last-chunk.first);assert.equal(row.modelTokens,row.modelTokenIds.length);assert.ok(row.modelTokenIds.every(Number.isInteger));assert.ok(row.modelTokens<=128);}
 assert.deepEqual(chunking.summaries.find(row=>row.strategy===strategy.id),{strategy:strategy.id,chunks:strategy.chunks.length,totalUnits:total,uniqueUnits:unique.size,repeatedUnits:total-unique.size,unitInflation:total/unique.size,totalModelTokens:tokens.reduce((sum,row)=>sum+row.modelTokens,0),maxModelTokens:Math.max(...tokens.map(row=>row.modelTokens))});
}
// Independent set-based metric reconstruction, not a call to evidenceMetrics.
function expectedMetrics(chunks,gold){const context=new Set();let total=0;for(const chunk of chunks.slice(0,3))for(let id=chunk.first;id<chunk.last;id++){context.add(chunk.representationId+':'+id);total++;}
 const facts=gold.facts.map(fact=>{const alternatives=fact.alternatives.map(alt=>{const count=alt.requiredUnitIds.reduce((sum,id)=>sum+Number(context.has(alt.representationId+':'+id)),0);return{required:alt.requiredUnitIds.length,matched:count,coverage:count/alt.requiredUnitIds.length,complete:count===alt.requiredUnitIds.length};});return{coverage:Math.max(...alternatives.map(alt=>alt.coverage)),complete:alternatives.some(alt=>alt.complete),alternatives};});
 return{coverage:facts.length?facts.reduce((sum,fact)=>sum+fact.coverage,0)/facts.length:null,complete:facts.length?facts.every(fact=>fact.complete):null,factMetrics:facts,returned:Math.min(chunks.length,3),contextUnits:total,uniqueContextUnits:context.size,contextRedundancy:total?1-context.size/total:0};
}
assert.equal(retrieval.rows.length,chunking.strategies.length*inputs.goldQueries.length);
for(const strategy of chunking.strategies){const index=buildIndex(strategy.chunks.map(chunk=>({id:chunk.id,title:'',body:chunk.text})),analyzer('fold')),byId=new Map(strategy.chunks.map(chunk=>[chunk.id,chunk]));
 for(const query of inputs.goldQueries){const row=retrieval.rows.find(row=>row.strategy===strategy.id&&row.queryId===query.id),ranking=search(index,query.text,{method:'bm25',k1:1.2,b:.75});assert.deepEqual(row.ranking,ranking);assert.deepEqual(row.metrics,expectedMetrics(ranking.map(result=>byId.get(result.id)),query));}
}
for(const summary of retrieval.summaries){const rows=retrieval.rows.filter(row=>row.strategy===summary.strategy&&row.split===summary.split&&row.metrics.coverage!==null),mean=key=>rows.reduce((sum,row)=>sum+Number(row.metrics[key]),0)/rows.length;assert.deepEqual(summary,{split:summary.split,strategy:summary.strategy,answerable:rows.length,meanCoverage:mean('coverage'),completeRate:mean('complete'),meanContextRedundancy:mean('contextRedundancy'),meanReturned:mean('returned')});}
if(process.argv.includes('--tokenizer')){
 const{AutoTokenizer,env}=await import('@huggingface/transformers');env.allowRemoteModels=false;env.allowLocalModels=true;
 const tokenizer=await AutoTokenizer.from_pretrained(fileURLToPath(new URL('.cache/semantic-model',root)),{local_files_only:true});
 const sentenceIds=tokenizer(embedding.rows.map(row=>row.text),{padding:false,truncation:false,return_tensor:false}).input_ids;
 assert.deepEqual(sentenceIds,embedding.rows.map(row=>row.inputIds.filter((_,i)=>row.attentionMask[i])));
 const all=chunking.strategies.flatMap(strategy=>strategy.chunks),ids=tokenizer(all.map(chunk=>chunk.text),{padding:false,truncation:false,return_tensor:false,add_special_tokens:true}).input_ids;assert.deepEqual(ids,chunking.tokenRows.map(row=>row.modelTokenIds));
 console.log('Tokenizer reproduced all44 sentence inputs and87 chunk sequences without encoder inference.');
}
console.log('44real vectors,41boundaries,4partitions,80rankings and all evidence/overlap metrics independently verified; original outcomes preserved.');
