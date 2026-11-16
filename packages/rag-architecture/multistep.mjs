function validateBudget(value, minimum, maximum, name) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid ${name}`);
  }
}

export async function retrieveInSteps({
  principal, query, requiredKeys, references,
  maxCalls, maxSources, maxQueuedReferences,
  search, loadReference,
}) {
  validateBudget(maxCalls, 0, 6, 'maxCalls');
  validateBudget(maxSources, 1, 8, 'maxSources');
  validateBudget(maxQueuedReferences, 1, 32, 'maxQueuedReferences');
  if (!requiredKeys.length || new Set(requiredKeys).size !== requiredKeys.length) {
    throw new Error('Requirements must be nonempty and unique');
  }
  const documents = new Map();
  const attempted = new Set();
  const queued = new Set();
  const frontier = [];
  const trace = [];
  let calls = 0;
  let saturated = false;

  const finish = stop => ({stop, calls, documents: [...documents.values()], trace});
  const satisfied = () => requiredKeys.every(key =>
    [...documents.values()].some(document => document.document_key === key));

  function remember(document) {
    if (document.tenant !== principal.tenant || document.access_level > principal.maxLevel) {
      throw new Error('Source escaped the authorized scope');
    }
    if (documents.has(document.id)) return;
    documents.set(document.id, document);
    attempted.add(document.id);
    for (const id of references[document.id] ?? []) {
      if (attempted.has(id) || queued.has(id)) {
        trace.push({phase: 'reference-skipped', id, reason: 'already_seen'});
        continue;
      }
      if (queued.size >= maxQueuedReferences) {
        saturated = true;
        trace.push({phase: 'frontier-full', id});
        break;
      }
      frontier.push(id);
      queued.add(id);
      trace.push({phase: 'reference-queued', id, from: document.id});
    }
  }

  if (maxCalls === 0) return finish('call_budget');
  calls += 1;
  const seed = await search(query, Math.min(3, maxSources));
  if (seed.length > Math.min(3, maxSources)) throw new Error('Search ignored its limit');
  trace.push({phase: 'search', call: calls, query, ids: seed.map(row => row.id)});
  for (const document of seed) remember(document);
  if (satisfied()) return finish('requirements_met');
  if (!seed.length) return finish('no_results');

  while (true) {
    if (saturated) return finish('frontier_budget');
    if (!frontier.length) return finish('no_progress');
    if (calls >= maxCalls) return finish('call_budget');
    if (documents.size >= maxSources) return finish('source_budget');
    const id = frontier.shift();
    attempted.add(id);
    calls += 1;
    const row = await loadReference(id);
    trace.push({phase: 'reference-read', call: calls, id, returnedId: row?.id ?? null});
    if (!row) continue;
    if (row.id !== id) throw new Error('Reference loader changed identity');
    remember(row);
    if (satisfied()) return finish('requirements_met');
  }
}
