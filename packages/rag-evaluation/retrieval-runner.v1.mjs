import assert from 'node:assert/strict';
import {buildIndex, search} from '../lexical-search/retrieval.mjs';
import {analyzer} from '../lexical-search/analysis.mjs';

// Deliberately accepts no labels or reference facts. The evaluator is a separate step.
export function runRetrieval(documents, queries, profile) {
  assert.equal(profile.method, 'bm25');
  assert.equal(profile.analyzer, 'fold');
  const index = buildIndex(documents, analyzer(profile.analyzer));
  return queries.map(query => ({
    queryId: query.id,
    split: query.split,
    question: query.question,
    queryTokens: index.analyze(query.question),
    ranking: search(index, query.question, {method: profile.method, k1: profile.k1, b: profile.b}),
  }));
}
