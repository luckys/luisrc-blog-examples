export function eligible(document, principal) {
  return document.tenant === principal.tenant && document.accessLevel <= principal.maxLevel;
}

export function evaluateRetrieval(rows, goldIds, documents, principal) {
  const byId = new Map(documents.map(document => [document.id, document]));
  const ids = rows.map(row => row.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate returned ID');
  const exposedIds = ids.filter(id => !byId.has(id) || !eligible(byId.get(id), principal));
  const relevant = new Set(goldIds);
  const found = ids.filter(id => relevant.has(id)).length;
  return {ids, exposedIds, eligibleRecallAt3: relevant.size ? found / relevant.size : null,
    unexpectedIds: ids.filter(id => !relevant.has(id))};
}
