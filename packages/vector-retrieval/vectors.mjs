function checked(vector) {
  if (!vector || typeof vector === 'string') throw Error('Vector required');
  const values = Array.from(vector);
  if (!values.length || !values.every(x => typeof x === 'number' && Number.isFinite(x))) throw Error('Finite nonempty vector required');
  return values;
}
export function normalizeVector(vector) {
  const values = checked(vector), norm = Math.hypot(...values);
  if (!norm || !Number.isFinite(norm)) throw Error('Nonzero finite norm required');
  return Array.from(Float32Array.from(values, x => x / norm));
}
export function dot(a, b) {
  const x = checked(a), y = checked(b);
  if (x.length !== y.length) throw Error('Dimension mismatch');
  return x.reduce((sum, value, i) => sum + value * y[i], 0);
}
export function squaredL2(a, b) {
  const x = checked(a), y = checked(b);
  if (x.length !== y.length) throw Error('Dimension mismatch');
  return x.reduce((sum, value, i) => sum + (value - y[i]) ** 2, 0);
}
export function cosineRanking(documents, vectors, query) {
  if (documents.length !== vectors.length || new Set(documents.map(d => d.id)).size !== documents.length) throw Error('Unique document/vector mapping required');
  const q = normalizeVector(query);
  return documents.map((doc, i) => ({id: doc.id, score: dot(normalizeVector(vectors[i]), q)}))
    .sort((a,b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
export function neighborRecall(predictedIds, exactIds) {
  if (!exactIds.length || new Set(exactIds).size !== exactIds.length || new Set(predictedIds).size !== predictedIds.length) throw Error('Unique nonempty exact neighbors required');
  const exact = new Set(exactIds);
  return predictedIds.filter(id => exact.has(id)).length / exact.size;
}
