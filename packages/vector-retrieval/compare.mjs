import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {buildIndex,search} from '../lexical-search/retrieval.mjs';
import {analyzer} from '../lexical-search/analysis.mjs';
import {metrics,summarize} from '../lexical-search/evaluation.mjs';
import {cosineRanking,normalizeVector,squaredL2,dot} from './vectors.mjs';
const root=new URL('.',import.meta.url),json=async f=>JSON.parse(await readFile(new URL(f,root)));
try{await access(new URL('results/quality.json',root));throw Error('Quality capture exists; preserve/version it before replacing');}catch(e){if(e.code!=='ENOENT')throw e;}
const embedded=await json('results/embeddings.json'),corpus=await json('corpus.json'),queries=await json('queries.json'),protocol=await json('protocol.json');
for(const[file,hash]of Object.entries(embedded.sourceHashes))assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash,file);
const byId=new Map(embedded.rows.map(r=>[r.id,r]));assert.equal(byId.size,1020);
const index=buildIndex(corpus,analyzer('fold')),vectors=corpus.map(d=>byId.get(d.id).rawVector),rows=[];
for(const query of queries){
 const q=byId.get(query.id).rawVector,bm25=search(index,query.text,{k1:1.2,b:.75}),dense=cosineRanking(corpus,vectors,q);
 rows.push({queryId:query.id,split:query.split,category:query.category,relevant:query.relevant,rankings:{bm25,dense},metrics:{bm25:metrics(bm25,query.relevant,3),dense:metrics(dense,query.relevant,3)}});
}
const summaries=[];
for(const split of ['dev','test'])for(const method of ['bm25','dense'])summaries.push({split,method,...summarize(rows.filter(r=>r.split===split).map(r=>({metrics:r.metrics[method]})))});
const a=normalizeVector(vectors[0]),b=normalizeVector(vectors[1]),norms=embedded.rows.map(r=>Math.hypot(...r.rawVector));
const controls={documents:corpus.length,queries:queries.length,indexOnlyDocuments:embedded.rows.filter(r=>r.kind==='index-control').length,dimensions:384,rawNorm:{min:Math.min(...norms),max:Math.max(...norms)},truncated:embedded.rows.filter(r=>r.untruncatedTokenCount>protocol.encoder.maxTokens).map(r=>r.id),geometryPair:{a:'D01',b:'D02',dot:dot(a,b),squaredL2:squaredL2(a,b),twoMinusTwoDot:2-2*dot(a,b),normalizationRoundingResidual:squaredL2(a,b)-(2-2*dot(a,b))}};
const files=['compare.mjs','vectors.mjs','results/embeddings.json','protocol.json','corpus.json','queries.json','../lexical-search/analysis.mjs','../lexical-search/retrieval.mjs','../lexical-search/evaluation.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,root))).digest('hex')])));
await writeFile(new URL('results/quality.json',root),JSON.stringify({capturedAt:new Date().toISOString(),encodingCapturedAt:embedded.capturedAt,kind:'labelled_semantic_retrieval_comparison_not_general_benchmark',sourceHashes,rows,summaries,controls},null,2)+'\n');
console.log(JSON.stringify({summaries,controls},null,2));
