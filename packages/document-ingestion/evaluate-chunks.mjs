import {readFile,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {digest} from './ledger.mjs';
import {evidenceMetrics} from './chunking.mjs';
import {buildIndex,search} from '../lexical-search/retrieval.mjs';
import {analyzer} from '../lexical-search/analysis.mjs';
const root=new URL('.',import.meta.url),read=file=>readFile(new URL(file,root)),json=async file=>JSON.parse(await read(file));
try{await access(new URL('results/retrieval.json',root));throw Error('Retrieval capture exists: preserve/version first');}catch(error){if(error.code!=='ENOENT')throw error;}
const chunks=await json('results/chunking.json'),inputs=await json('results/chunk-inputs.json'),config=inputs.protocol.retrieval;
for(const capture of [chunks,inputs])for(const[file,hash]of Object.entries(capture.sourceHashes))assert.equal(digest(await read(file)),hash,file);
const rows=[],indexStats=[];
for(const strategy of chunks.strategies){
 const index=buildIndex(strategy.chunks.map(chunk=>({id:chunk.id,title:'',body:chunk.text})),analyzer('fold')),byId=new Map(strategy.chunks.map(chunk=>[chunk.id,chunk]));
 indexStats.push({strategy:strategy.id,documents:index.documents.length,averageTokenLength:index.avgLength,vocabulary:index.df.size});
 for(const query of inputs.goldQueries){const ranking=search(index,query.text,{method:config.method,k1:config.k1,b:config.b}),retrieved=ranking.map(row=>byId.get(row.id));
  rows.push({strategy:strategy.id,queryId:query.id,split:query.split,category:query.category,ranking,metrics:evidenceMetrics(retrieved,query,config.k)});
 }
}
const summaries=[];
for(const split of ['dev','test'])for(const strategy of chunks.strategies){const selected=rows.filter(row=>row.strategy===strategy.id&&row.split===split&&row.metrics.coverage!==null),mean=key=>selected.reduce((sum,row)=>sum+Number(row.metrics[key]),0)/selected.length;
 summaries.push({split,strategy:strategy.id,answerable:selected.length,meanCoverage:mean('coverage'),completeRate:mean('complete'),meanContextRedundancy:mean('contextRedundancy'),meanReturned:mean('returned')});
}
const files=['evaluate-chunks.mjs','chunking.mjs','chunking-protocol.json','retrieval-queries.json','results/chunk-inputs.json','results/chunking.json','../lexical-search/analysis.mjs','../lexical-search/retrieval.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,digest(await read(file))])));
await writeFile(new URL('results/retrieval.json',root),JSON.stringify({capturedAt:new Date().toISOString(),kind:'actual_bm25_indexes_over_four_fixed_chunk_partitions',sourceHashes,config,indexStats,queries:inputs.goldQueries,rows,summaries},null,2)+'\n');
console.log(JSON.stringify({indexStats,summaries,negativeQueries:inputs.goldQueries.filter(query=>!query.facts.length).map(query=>query.id)},null,2));
