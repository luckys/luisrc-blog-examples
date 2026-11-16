import assert from 'node:assert/strict';

export function buildMessages(system, question, sources) {
  const publicSources = sources.map(({id, title, body}) => ({id, title, body}));
  return [{role: 'system', content: system}, {role: 'user', content: 'Pregunta:\n' + question + '\nFuentes:\n' + JSON.stringify(publicSources)}];
}

export function packSources({system, question, candidates, inputLimit}, measure) {
  assert.ok(Number.isSafeInteger(inputLimit) && inputLimit > 0, 'invalid input limit');
  assert.equal(new Set(candidates.map(s => s.id)).size, candidates.length, 'duplicate candidate');
  const baseMessages = buildMessages(system, question, []);
  const base = measure(baseMessages);
  if (base.inputIds.length > inputLimit) return {status: 'base_over_budget', selectedIds: [], messages: null, prompt: null, inputIds: [], diagnosticInputTokens: base.inputIds.length, attempts: []};
  const selected = [], attempts = [];
  let admitted = base, messages = baseMessages;
  for (const source of candidates) {
    const proposedMessages = buildMessages(system, question, [...selected, source]);
    const proposed = measure(proposedMessages);
    const accepted = proposed.inputIds.length <= inputLimit;
    attempts.push({sourceId: source.id, inputTokens: proposed.inputIds.length, accepted});
    if (accepted) { selected.push(source); admitted = proposed; messages = proposedMessages; }
  }
  return {status: selected.length ? 'ready' : 'empty_context', ...(selected.length ? {} : {emptyReason: candidates.length ? 'all_candidates_over_budget' : 'no_candidates'}), selectedIds: selected.map(s => s.id), messages, prompt: admitted.prompt, inputIds: admitted.inputIds, diagnosticInputTokens: null, attempts};
}

export function unionUnits(ranges) {
  const ordered = ranges.map(r => ({...r})).sort((a, b) => a.start - b.start || a.end - b.end);
  let total = 0, start = null, end = null;
  for (const range of ordered) {
    assert.ok(Number.isSafeInteger(range.start) && Number.isSafeInteger(range.end) && range.start >= 0 && range.end >= range.start, 'invalid evidence range');
    if (start === null) { start = range.start; end = range.end; }
    else if (range.start <= end) end = Math.max(end, range.end);
    else { total += end - start; start = range.start; end = range.end; }
  }
  return total + (start === null ? 0 : end - start);
}

export function contextEvidenceMetrics(selected, corpus, label) {
  assert.equal(new Set(selected.map(s => s.id)).size, selected.length, 'duplicate selected ID');
  const selectedIds = new Set(selected.map(s => s.id));
  assert.equal(new Set(label.requiredFactIds).size, label.requiredFactIds.length, 'duplicate required fact');
  const required = label.requiredFactIds.map(id => {
    const fact = corpus.facts.find(f => f.id === id);
    assert.ok(fact, 'unknown required fact');
    const source = corpus.documents.find(d => d.id === fact.documentId);
    assert.ok(source && Number.isSafeInteger(fact.start) && Number.isSafeInteger(fact.end) && fact.start >= 0 && fact.end > fact.start && fact.end <= source.body.length && source.body.slice(fact.start, fact.end) === fact.quote, 'invalid evidence range');
    return fact;
  });
  let relevantDocumentCount = 0, selectedBodyUnits = 0, requiredEvidenceUnits = 0;
  for (const source of selected) {
    const original = corpus.documents.find(d => d.id === source.id);
    assert.ok(original, 'unknown canonical source');
    for (const key of ['id', 'title', 'body', 'revision']) assert.equal(source[key], original[key], 'canonical source differs');
    const judgment = label.qrels.find(q => q.documentId === source.id);
    assert.ok(judgment, 'missing qrel');
    if (judgment.grade >= 1) relevantDocumentCount++;
    selectedBodyUnits += source.body.length;
    requiredEvidenceUnits += unionUnits(required.filter(f => f.documentId === source.id));
  }
  const coveredFactIds = required.filter(f => selectedIds.has(f.documentId)).map(f => f.id);
  return {
    offsetUnit: 'UTF-16 code units',
    selectedDocumentCount: selected.length,
    relevantDocumentCount,
    selectedDocumentRelevance: selected.length ? relevantDocumentCount / selected.length : null,
    requiredFactCount: required.length,
    coveredFactIds,
    requiredFactCoverage: required.length ? coveredFactIds.length / required.length : null,
    selectedBodyUnits,
    requiredEvidenceUnits,
    requiredEvidenceShareOfSourceText: selectedBodyUnits ? requiredEvidenceUnits / selectedBodyUnits : null,
  };
}
