export function softmax(logits) {
  if (!logits.length || logits.some(x => !Number.isFinite(x))) {
    throw Error('Necesitamos logits finitos');
  }
  const maximum = Math.max(...logits);
  const weights = logits.map(x => Math.exp(x - maximum));
  const total = weights.reduce((sum, x) => sum + x, 0);
  return weights.map(x => x / total);
}

export function nextLoss(logits, target) {
  if (!logits.length || logits.some(x => !Number.isFinite(x))) throw Error('Logits inválidos');
  if (!Number.isInteger(target) || target < 0 || target >= logits.length) throw Error('Target inválido');
  const maximum = Math.max(...logits);
  const sum = logits.reduce((total, x) => total + Math.exp(x - maximum), 0);
  return maximum + Math.log(sum) - logits[target];
}

export function rankDistribution(vocabulary, logits) {
  if (vocabulary.length !== logits.length) throw Error('Vocabulario desalineado');
  return softmax(logits).map((probability, id) => ({id, token:vocabulary[id], logit:logits[id], probability}))
    .sort((a,b) => b.probability - a.probability || a.id - b.id);
}

export function visible(kind, query, key) {
  if (![query,key].every(x => Number.isInteger(x) && x >= 0)) throw Error('Posición inválida');
  if (kind === 'causal') return key <= query;
  if (kind === 'encoder' || kind === 'cross') return true;
  throw Error('Tipo de atención desconocido');
}
