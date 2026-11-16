import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {partitionAtThreshold,contextEvidence,coverageCounts,coverageDiagram} from '../chunk-explorer.mjs';
const json=async name=>JSON.parse(await readFile(new URL('../results/'+name+'.json',import.meta.url)));
const ledger=await json('ledger'),inputs=await json('chunk-inputs'),saved=await json('chunking'),retrieval=await json('retrieval');
test('viewer counterfactual preserves source coverage/budget and original threshold exactly',()=>{
 for(const segment of inputs.segments){
  const doc=ledger.documents.find(d=>d.documentId===segment.documentId),actual=saved.semanticDocuments.find(d=>d.documentId===doc.documentId);
  assert.deepEqual(partitionAtThreshold(doc,segment.pieces,actual.boundaries,.35),actual.chunks.map(({first,last})=>({first,last})));
  for(const threshold of [0,.35,.5,1,2]){
   const chunks=partitionAtThreshold(doc,segment.pieces,actual.boundaries,threshold);
   assert.ok(chunks.every(c=>c.last>c.first&&c.last-c.first<=32));assert.deepEqual(coverageCounts(doc,chunks),doc.units.map(()=>1));
   assert.equal(chunks[0].first,0);assert.equal(chunks.at(-1).last,doc.units.length);
  }
 }
 assert.throws(()=>partitionAtThreshold(null,[],[],NaN));
});
test('browser metric inspector matches all80 archived metrics and preserves negative/null results',()=>{
 for(const row of retrieval.rows){
  const chunks=saved.strategies.find(s=>s.id===row.strategy).chunks,query=retrieval.queries.find(q=>q.id===row.queryId),byId=new Map(chunks.map(c=>[c.id,c])),metric=contextEvidence(row.ranking.slice(0,3).map(r=>byId.get(r.id)),query);
  for(const key of ['coverage','complete','returned','contextUnits','uniqueContextUnits','contextRedundancy'])assert.equal(metric[key],row.metrics[key],row.queryId+'/'+row.strategy+'/'+key);
  assert.deepEqual(metric.facts.map(f=>f.coverage),row.metrics.factMetrics.map(f=>f.coverage));
 }
 const empty=contextEvidence([],{facts:[]});assert.equal(empty.coverage,null);assert.equal(empty.returned,0);
 const query={facts:[{alternatives:[{documentId:'D',quote:'a b',representationId:'v1',requiredUnitIds:[0,1]}]}]};
 assert.equal(contextEvidence([{representationId:'v2',first:0,last:2}],query).coverage,0);
 const repeated=contextEvidence([{representationId:'v1',first:0,last:2},{representationId:'v1',first:1,last:2}],query);
 assert.equal(repeated.coverage,1);assert.equal(repeated.contextUnits,3);assert.equal(repeated.uniqueContextUnits,2);
});
test('overlap grid records every canonical unit and all repetition counts without double identity',()=>{
 for(const strategy of saved.strategies.filter(s=>s.id!=='semantic32'))for(const id of ledger.indexDocumentIds){
  const doc=ledger.documents.find(d=>d.documentId===id),chunks=strategy.chunks.filter(c=>c.documentId===id),counts=coverageCounts(doc,chunks);
  assert.ok(counts.every(n=>n>=1&&n<=2));assert.equal(counts.reduce((s,n)=>s+n,0),chunks.reduce((s,c)=>s+c.last-c.first,0));
  const svg=coverageDiagram(counts,chunks[0]);assert.equal([...svg.matchAll(/data-unit=/g)].length,doc.units.length);
  for(const [i,n]of counts.entries())assert.ok(svg.includes(`data-unit="${i}" data-count="${n}"`));
 }
});
