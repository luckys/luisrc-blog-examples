import faiss from 'faiss-napi';
import assert from 'node:assert/strict';
// The generic factory has Flat storage but no typed ef setters. The bare
// IndexHNSW constructor has no storage. Restore the factory buffer with its
// documented typed reader to obtain both properties before inserting vectors.
export function createHnsw(dimensions, m, efConstruction) {
  const factory=faiss.Index.fromFactory(dimensions,`HNSW${m},Flat`,faiss.MetricType.METRIC_L2);
  let index;
  try{index=faiss.IndexHNSW.fromBuffer(factory.toBuffer());}finally{factory.dispose();}
  index.efConstruction=efConstruction;
  assert.equal(index.getEfConstruction(),efConstruction);
  assert.equal(typeof Object.getOwnPropertyDescriptor(Object.getPrototypeOf(index),'efSearch').set,'function');
  return index;
}
