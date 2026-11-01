import test from 'node:test';
import assert from 'node:assert/strict';
import {latencyStats,latencyDiagram,rankingDiagram,planLines} from '../saved-panels.mjs';

test('nearest rank uses the570th observation for600values without mutating input',()=>{
 const measurements=Array.from({length:600},(_,i)=>({elapsedMs:600-i}));
 const stats=latencyStats(measurements);
 assert.deepEqual({n:stats.requests,p50:stats.p50Ms,p95:stats.p95Ms,max:stats.maxMs},{n:600,p50:300,p95:570,max:600});
 assert.equal(measurements[0].elapsedMs,600);
 const svg=latencyDiagram(measurements);
 assert.ok(svg.includes('data-percentile="0.95" data-value="570"'));
 assert.ok(svg.includes('no cronología'));
});
test('one-query30sample subset uses29th observation and invalid times fail',()=>{
 assert.equal(latencyStats(Array.from({length:30},(_,i)=>({elapsedMs:i+1}))).p95Ms,29);
 for(const rows of [[],[{elapsedMs:NaN}],[{elapsedMs:-1}]])assert.throws(()=>latencyStats(rows));
 assert.doesNotMatch(latencyDiagram([{elapsedMs:0}]),/NaN|Infinity/);
});
test('relevance tiles preserve missing positions, author judgments and escaped IDs',()=>{
 const svg=rankingDiagram([{id:'D01'},{id:'<script>'}],['D01']);
 assert.equal((svg.match(/data-relevant="true"/g)||[]).length,1);
 assert.equal((svg.match(/data-relevant="false"/g)||[]).length,1);
 assert.ok(svg.includes('2 resultados disponibles'));
 assert.ok(!svg.includes('<script>'));
 assert.ok(rankingDiagram([],[]).includes('0 resultados disponibles'));
});

test('plan summary preserves actual counts,index and top-N method instead of estimates',()=>{
 const node={'Node Type':'Limit','Actual Rows':4,'Actual Loops':1,'Plan Rows':10,Plans:[{'Node Type':'Index Scan','Actual Rows':4,'Actual Loops':1,'Index Name':'documents_embedding_hnsw'}]};
 assert.deepEqual(planLines(node),['Limit | filas 4 | loops 1','  Index Scan | filas 4 | loops 1 | documents_embedding_hnsw']);
 assert.ok(planLines({'Node Type':'Sort','Actual Rows':10,'Actual Loops':1,'Sort Method':'top-N heapsort'})[0].includes('top-N heapsort'));
});
