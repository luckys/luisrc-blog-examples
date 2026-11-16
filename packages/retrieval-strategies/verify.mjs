// Read-only audit: reconstruct scores/partitions/metrics, never rerun encoder or rewrite evidence.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {buildIndex,search} from '../lexical-search/retrieval.mjs';
import {analyzer} from '../lexical-search/analysis.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file)),digest=data=>createHash('sha256').update(data).digest('hex');
const inputs=await json('results/inputs.json'),embeddings=await json('results/embeddings.json'),saved=await json('results/retrieval.json'),previous=await json('../document-ingestion/results/retrieval.json'),partitions=await json('../document-ingestion/results/chunking.json');
for(const capture of [inputs,embeddings,saved])for(const[file,hash]of Object.entries(capture.sourceHashes))assert.equal(digest(await read(file)),hash,file);
assert.ok(Date.parse(inputs.preparedAt)<Date.parse(embeddings.capturedAt));assert.ok(Date.parse(embeddings.capturedAt)<Date.parse(saved.capturedAt));
assert.equal(embeddings.encoderProfile,inputs.encoderProfile);assert.equal(digest(JSON.stringify(inputs.protocol.encoder)),inputs.encoderProfile);
assert.deepEqual(inputs.chunks,partitions.strategies.find(s=>s.id==='size32').chunks);assert.deepEqual(inputs.queries,previous.queries);
assert.equal(inputs.chunks.length,13);assert.equal(inputs.queries.length,20);assert.equal(embeddings.rows.length,33);assert.equal(new Set(embeddings.rows.map(r=>r.id)).size,33);
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-12,message+': '+actual+'/'+expected);
const order=(a,b)=>b.score-a.score||(a.id<b.id?-1:a.id>b.id?1:0),byId=new Map(inputs.chunks.map(c=>[c.id,c])),vectors=new Map(embeddings.rows.map(row=>[row.id,row.rawVector]));
for(const [i,row]of embeddings.rows.entries()){
 assert.equal(row.id,inputs.texts[i].id);assert.equal(row.text,inputs.texts[i].text);assert.equal(row.rawVector.length,384);assert.ok(row.rawVector.every(Number.isFinite));assert.ok(row.rawVector.some(n=>n!==0));
 assert.equal(row.inputIds.length,row.attentionMask.length);assert.ok(row.inputIds.every(Number.isInteger));assert.ok(row.attentionMask.every(n=>n===0||n===1));assert.equal(row.modelTokens,row.attentionMask.reduce((s,n)=>s+n,0));assert.ok(row.modelTokens>1&&row.modelTokens<=128);
}
function cosine(a,b){let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return dot/Math.sqrt(aa*bb);}
function fuse(lists,constant=60,window=10){
 const candidates=new Set(lists.flatMap(list=>list.slice(0,window).map(row=>row.id)));
 return [...candidates].map(id=>{const contributions=[];for(let listIndex=0;listIndex<lists.length;listIndex++){const position=lists[listIndex].slice(0,window).findIndex(row=>row.id===id);if(position>=0)contributions.push({listIndex,rank:position+1,contribution:1/(constant+position+1)});}return {id,score:contributions.reduce((s,c)=>s+c.contribution,0),contributions};}).sort(order);
}
function metrics(ranking,query){
 const chunks=ranking.slice(0,3).map(r=>byId.get(r.id)),context=new Set();let total=0;
 for(const c of chunks)for(let ordinal=c.first;ordinal<c.last;ordinal++){total++;context.add(c.representationId+':'+ordinal);}
 const factMetrics=query.facts.map(fact=>{
  const alternatives=fact.alternatives.map(a=>{const matched=a.requiredUnitIds.reduce((s,n)=>s+Number(context.has(a.representationId+':'+n)),0),required=a.requiredUnitIds.length;return {required,matched,coverage:matched/required,complete:matched===required};});
  return {coverage:Math.max(...alternatives.map(a=>a.coverage)),complete:alternatives.some(a=>a.complete),alternatives};
 });
 return {coverage:factMetrics.length?factMetrics.reduce((s,f)=>s+f.coverage,0)/factMetrics.length:null,complete:factMetrics.length?factMetrics.every(f=>f.complete):null,factMetrics,returned:chunks.length,contextUnits:total,uniqueContextUnits:context.size,contextRedundancy:total?1-context.size/total:0};
}
function rankings(actual,expected){assert.equal(actual.length,expected.length);for(let i=0;i<actual.length;i++){assert.equal(actual[i].id,expected[i].id);close(actual[i].score,expected[i].score,'score');if(expected[i].terms)assert.deepEqual(actual[i].terms,expected[i].terms);if(expected[i].contributions)assert.deepEqual(actual[i].contributions,expected[i].contributions);}}
const index=buildIndex(inputs.chunks.map(c=>({id:c.id,title:'',body:c.text})),analyzer('fold')),lexical=text=>search(index,text,{method:'bm25',k1:1.2,b:.75});
assert.deepEqual(saved.indexStats,{documents:index.documents.length,averageLength:index.avgLength,vocabulary:index.df.size});
assert.equal(saved.rows.length,60);
for(const query of inputs.queries){
 const bm25=lexical(query.text),dense=inputs.chunks.map(c=>({id:c.id,score:cosine(vectors.get('query:'+query.id),vectors.get('chunk:'+c.id))})).sort(order);
 const expected={bm25,dense,rrf:fuse([bm25,dense])};
 for(const method of ['bm25','dense','rrf']){const row=saved.rows.find(r=>r.queryId===query.id&&r.method===method);rankings(row.ranking,expected[method]);assert.deepEqual(row.metrics,metrics(row.ranking,query));}
 const baseline=previous.rows.find(r=>r.queryId===query.id&&r.strategy==='size32');assert.deepEqual(bm25,baseline.ranking);
}
assert.equal(saved.filters.length,36);
for(const row of saved.filters){
 const filter=inputs.filters.find(f=>f.id===row.filterId),query=inputs.queries.find(q=>q.id===row.queryId),original=saved.rows.find(r=>r.queryId===query.id&&r.method===row.method).ranking,allowed=new Set(inputs.metadata.filter(m=>m[filter.field]===filter.value).map(m=>m.id));
 const expected=row.placement==='before'?original.filter(r=>allowed.has(r.id)).slice(0,3):original.slice(0,3).filter(r=>allowed.has(r.id));rankings(row.ranking,expected);assert.equal(row.eligibleChunks,allowed.size);
 const gold={...query,facts:query.facts.map(f=>({alternatives:f.alternatives.filter(a=>inputs.metadata.some(m=>m.documentId===a.documentId&&allowed.has(m.id)))}))};
 assert.equal(row.goldCompatible,gold.facts.every(f=>f.alternatives.length));assert.deepEqual(row.metrics,row.goldCompatible?metrics(row.ranking,gold):null);
}
assert.equal(saved.multi.length,7);
for(const row of saved.multi){const spec=inputs.variants.find(v=>v.queryId===row.queryId),query=inputs.queries.find(q=>q.id===row.queryId),texts=[...new Set([query.text,...spec.variants])],lists=texts.map(lexical);assert.deepEqual(row.texts,texts);assert.equal(row.searches,3);assert.deepEqual(row.lists,lists);rankings(row.ranking,fuse(lists));assert.deepEqual(row.metrics,metrics(row.ranking,query));assert.deepEqual(row.baseline,metrics(lists[0],query));}
assert.equal(saved.rewrites.length,16);
const fold=text=>text.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es');
for(const row of saved.rewrites){
 const spec=inputs.rewriteCases.find(s=>s.queryId===row.queryId),query=inputs.queries.find(q=>q.id===row.queryId),candidate=spec[row.kind],tokens=new Set(fold(candidate).match(/[\p{L}\p{N}]+/gu)??[]),missing=spec.protected.filter(t=>!tokens.has(fold(t))),accepted=!missing.length;
 assert.deepEqual(row.guard,{original:query.text,candidate,protectedTerms:spec.protected,missing,accepted,text:accepted?candidate:query.text});rankings(row.ranking,lexical(row.guard.text));assert.deepEqual(row.metrics,metrics(row.ranking,query));assert.deepEqual(row.baseline,metrics(lexical(query.text),query));assert.equal(row.authoredEquivalent,row.kind==='safe');
}
for(const summary of saved.summaries){const rows=saved.rows.filter(r=>r.split===summary.split&&r.method===summary.method&&r.metrics.coverage!==null);assert.equal(summary.answerable,rows.length);for(const [key,metric]of [['meanCoverage','coverage'],['completeRate','complete'],['meanReturned','returned']])close(summary[key],rows.reduce((s,r)=>s+Number(r.metrics[metric]),0)/rows.length,key);}
assert.equal(saved.rewrites.filter(r=>r.kind==='unsafe'&&r.guard.accepted).length,1);assert.equal(saved.rewrites.find(r=>r.kind==='unsafe'&&r.guard.accepted).queryId,'Q13');
assert.equal(saved.multi.find(r=>r.queryId==='Q08').metrics.coverage,0);
if(process.argv.includes('--tokenizer')){
 const {AutoTokenizer,env}=await import('@huggingface/transformers');env.allowRemoteModels=false;const tokenizer=await AutoTokenizer.from_pretrained(fileURLToPath(new URL('.cache/model',root)),{local_files_only:true});
 for(const row of embeddings.rows){const encoded=tokenizer([row.text],{padding:false,truncation:false,return_tensor:false});assert.deepEqual(row.inputIds.filter((id,i)=>row.attentionMask[i]===1),encoded.input_ids[0]);}
 console.log('Reproduced33 full tokenizer sequences without encoder inference.');
}
console.log('Verified33 real vectors,60rankings,36filter outcomes,7multi-query cases and16rewrite proposals; preserved all regressions and negatives.');
