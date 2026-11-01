import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVector, dot, squaredL2, cosineRanking, neighborRecall} from '../vectors.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('normalization, cosine and squared L2 have independent numerical fixtures',()=>{
 const a=normalizeVector([3,4]),b=normalizeVector([0,2]);close(a[0],.6);close(a[1],.8);close(dot(a,a),1);close(dot(a,b),.8);close(squaredL2(a,b),.4);close(squaredL2(a,b),2-2*dot(a,b));
 close(dot(normalizeVector([6,8]),b),.8);
 assert.notEqual(dot([3,4],[0,2]),dot([6,8],[0,2]));
});
test('vectors reject zero, nonfinite values and dimension mismatch',()=>{
 for(const v of [[],[0,0],[NaN,1],[Infinity,1],['1',2]])assert.throws(()=>normalizeVector(v));
 assert.throws(()=>dot([1,2],[1]));assert.throws(()=>squaredL2([1],[1,2]));
});
test('cosine ranking retains negative candidates and breaks exact ties by ID',()=>{
 const docs=[{id:'B'},{id:'A'},{id:'C'}],vectors=[[0,1],[0,1],[-1,0]],query=[1,0];
 const rows=cosineRanking(docs,vectors,query);assert.deepEqual(rows.map(r=>r.id),['A','B','C']);assert.deepEqual(rows.map(r=>r.score),[0,0,-1]);
 assert.throws(()=>cosineRanking([{id:'A'},{id:'A'}],[[1,0],[0,1]],query));
});
test('ANN neighbor recall measures agreement with an exact ranking, not relevance',()=>{
 assert.equal(neighborRecall(['A','B','X'],['A','B','C']),2/3);
 assert.equal(neighborRecall(['Z','Y'],['A','B']),0);
 assert.throws(()=>neighborRecall(['A','A'],['A','B']));
 assert.throws(()=>neighborRecall([],[]));
});
