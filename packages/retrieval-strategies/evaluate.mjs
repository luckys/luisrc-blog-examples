import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {buildIndex,search} from '../lexical-search/retrieval.mjs';
import {analyzer} from '../lexical-search/analysis.mjs';
import {evidenceMetrics} from '../document-ingestion/chunking.mjs';
import {denseRanking,reciprocalRankFusion,filterTopK,guardedRewrite} from './ranking.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file)),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
try{await access(new URL('results/retrieval.json',root));throw Error('Evaluation exists; preserve/version first');}catch(error){if(error.code!=='ENOENT')throw error;}
const inputs=await json('results/inputs.json'),embeddings=await json('results/embeddings.json');
for(const saved of [inputs,embeddings])for(const[file,hash]of Object.entries(saved.sourceHashes))assert.equal(digest(await read(file)),hash,file);
const index=buildIndex(inputs.chunks.map(c=>({id:c.id,title:'',body:c.text})),analyzer('fold')),byChunk=new Map(inputs.chunks.map(c=>[c.id,c])),vectors=new Map(embeddings.rows.map(row=>[row.id,row.rawVector])),documents=inputs.chunks.map(c=>({id:c.id,vector:vectors.get('chunk:'+c.id)}));
const measure=(ranking,query)=>evidenceMetrics(ranking.map(row=>byChunk.get(row.id)),query,inputs.protocol.evaluation.k),lexical=text=>search(index,text,{method:'bm25',k1:inputs.protocol.bm25.k1,b:inputs.protocol.bm25.b});
const rows=[];
for(const query of inputs.queries){
 const bm25=lexical(query.text),dense=denseRanking(vectors.get('query:'+query.id),documents),rrf=reciprocalRankFusion([bm25,dense],inputs.protocol.fusion);
 for(const [method,ranking]of Object.entries({bm25,dense,rrf}))rows.push({queryId:query.id,method,split:query.split,ranking,metrics:measure(ranking,query)});
}
const filters=[];
for(const filter of inputs.filters)for(const method of inputs.protocol.retrievers)for(const placement of ['before','after']){
 const query=inputs.queries.find(q=>q.id===filter.queryId),original=rows.find(row=>row.queryId===query.id&&row.method===method),ranking=filterTopK(original.ranking,inputs.metadata,filter,inputs.protocol.evaluation.k,placement);
 const eligibleGold={...query,facts:query.facts.map(f=>({alternatives:f.alternatives.filter(a=>inputs.metadata.some(m=>m.documentId===a.documentId&&m[filter.field]===filter.value))}))};
 const goldCompatible=eligibleGold.facts.every(f=>f.alternatives.length>0),metrics=goldCompatible?measure(ranking,eligibleGold):null;
 filters.push({filterId:filter.id,queryId:query.id,method,placement,eligibleChunks:inputs.metadata.filter(m=>m[filter.field]===filter.value).length,goldCompatible,ranking,metrics});
}
const multi=inputs.variants.map(spec=>{
 const query=inputs.queries.find(q=>q.id===spec.queryId),texts=[...new Set([query.text,...spec.variants])],rankings=texts.map(lexical),ranking=reciprocalRankFusion(rankings,inputs.protocol.fusion);
 return {queryId:query.id,origin:'authored_paraphrases_not_llm',texts,searches:texts.length,lists:rankings,ranking,baseline:measure(rankings[0],query),metrics:measure(ranking,query)};
});
const rewrites=[];
for(const spec of inputs.rewriteCases)for(const kind of ['safe','unsafe']){
 const query=inputs.queries.find(q=>q.id===spec.queryId),guard=guardedRewrite(query.text,spec[kind],spec.protected),ranking=lexical(guard.text);
 rewrites.push({queryId:query.id,kind,authoredEquivalent:kind==='safe',guard,ranking,baseline:measure(lexical(query.text),query),metrics:measure(ranking,query)});
}
const summaries=[];
for(const split of ['dev','test'])for(const method of inputs.protocol.retrievers){
 const selected=rows.filter(r=>r.split===split&&r.method===method&&r.metrics.coverage!==null),mean=key=>selected.reduce((s,r)=>s+Number(r.metrics[key]),0)/selected.length;
 summaries.push({split,method,answerable:selected.length,meanCoverage:mean('coverage'),completeRate:mean('complete'),meanReturned:mean('returned')});
}
const files=['evaluate.mjs','ranking.mjs','results/inputs.json','results/embeddings.json','../lexical-search/retrieval.mjs','../lexical-search/analysis.mjs','../document-ingestion/chunking.mjs'],sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await read(file))])));
const result={capturedAt:new Date().toISOString(),kind:'actual_lexical_dense_rrf_rankings_and_fixed_query_controls',sourceHashes,indexStats:{documents:index.documents.length,averageLength:index.avgLength,vocabulary:index.df.size},rows,summaries,filters,multi,rewrites};
await writeFile(new URL('results/retrieval.json',root),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(summaries,null,2));
