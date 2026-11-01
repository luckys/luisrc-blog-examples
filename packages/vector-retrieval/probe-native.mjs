import faiss from 'faiss-napi';
import assert from 'node:assert/strict';
const factory=faiss.Index.fromFactory(2,'HNSW4,Flat',faiss.MetricType.METRIC_L2);
const index=faiss.IndexHNSW.fromBuffer(factory.toBuffer());
factory.dispose();
try{
 console.log('Class',index.constructor.name,'dimensions',index.dims,'initial ef',index.efSearch);
 index.efConstruction=40;index.efSearch=4;
 assert.equal(index.getEfConstruction(),40);assert.equal(index.getEfSearch(),4);
 assert.equal(typeof Object.getOwnPropertyDescriptor(Object.getPrototypeOf(index),'efSearch').set,'function');
 index.add([1,0,0,1]);const result=index.search([1,0],2);
 assert.deepEqual(result.labels.map(Number),[0,1]);assert.deepEqual(result.distances,[0,2]);
 console.log('HNSW squared L2 fixture',result);
 console.log('Serialized bytes',index.toBuffer().length);
 const restored=faiss.IndexHNSW.fromBuffer(index.toBuffer());
 try{
  assert.equal(restored.ntotal,2);assert.equal(restored.dims,2);
  assert.equal(restored.getEfConstruction(),40);assert.equal(restored.getEfSearch(),4);
  assert.deepEqual(restored.search([1,0],2),result);
  console.log('Typed serialization roundtrip preserves vectors, metric and ef');
 }finally{restored.dispose();}
}finally{index.dispose();}
