import assert from 'node:assert/strict';

export function evaluateRanking(ranking, qrels, k) {
  assert.ok(Number.isSafeInteger(k) && k > 0, 'invalid cutoff');
  const judgments = new Map();
  for (const row of qrels) {
    assert.ok(typeof row.documentId === 'string' && row.documentId, 'empty qrel ID');
    assert.ok(!judgments.has(row.documentId), 'duplicate qrel');
    assert.ok(Number.isInteger(row.grade) && row.grade >= 0 && row.grade <= 2, 'invalid grade');
    judgments.set(row.documentId, row.grade);
  }
  assert.equal(new Set(ranking).size, ranking.length, 'duplicate ranking ID');
  for (const id of ranking) assert.ok(judgments.has(id), 'unjudged ranking ID');
  const position = (id, index) => {
    const grade = judgments.get(id);
    const rank = index + 1;
    const gain = 2 ** grade - 1;
    const discount = Math.log2(rank + 1);
    return {id, rank, grade, relevant: grade >= 1, gain, discount, contribution: gain / discount};
  };
  const positions = ranking.slice(0, k).map(position);
  const idealIds = [...judgments.keys()].sort((a, b) => judgments.get(b) - judgments.get(a) || (a < b ? -1 : a > b ? 1 : 0));
  const ideal = idealIds.slice(0, k).map(position);
  const hits = positions.filter(row => row.relevant).length;
  const relevantTotal = [...judgments.values()].filter(grade => grade >= 1).length;
  const firstRelevantRank = positions.find(row => row.relevant)?.rank ?? null;
  const dcg = positions.reduce((sum, row) => sum + row.contribution, 0);
  const idcg = ideal.reduce((sum, row) => sum + row.contribution, 0);
  const precision = hits / k;
  const recall = relevantTotal ? hits / relevantTotal : null;
  const rr = relevantTotal ? (firstRelevantRank === null ? 0 : 1 / firstRelevantRank) : null;
  const ndcg = idcg > 0 ? dcg / idcg : null;
  return {k, returned: positions.length, missingSlots: Math.max(0, k - positions.length), hits, relevantTotal, firstRelevantRank, precision, recall, rr, dcg, idcg, ndcg, positions, ideal};
}

export function summarizeMetrics(rows) {
  const answerable = rows.filter(row => row.metrics.relevantTotal > 0);
  const noAnswer = rows.filter(row => row.metrics.relevantTotal === 0);
  const mean = (subset, key) => subset.length ? subset.reduce((sum, row) => sum + row.metrics[key], 0) / subset.length : null;
  return {
    queries: rows.length,
    answerable: answerable.length,
    noAnswer: noAnswer.length,
    noAnswerWithResults: noAnswer.filter(row => row.metrics.returned > 0).length,
    meanAllPrecision: mean(rows, 'precision'),
    meanAnswerablePrecision: mean(answerable, 'precision'),
    meanRecall: mean(answerable, 'recall'),
    meanRr: mean(answerable, 'rr'),
    meanNdcg: mean(answerable, 'ndcg'),
  };
}
