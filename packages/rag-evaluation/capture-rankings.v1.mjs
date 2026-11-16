import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readDataset} from './verify.mjs';
import {validateDataset} from './dataset.mjs';
import {runRetrieval} from './retrieval-runner.v1.mjs';
import {evaluateRanking, summarizeMetrics} from './ranking-metrics.v1.mjs';
const root = new URL('./', import.meta.url);
const read = file => readFile(new URL(file, root));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
for (const file of ['results/rankings.v1.json', 'results/rankings.v1.failure.json']) {
  try { await access(new URL(file, root)); throw Error('Existing capture: preserve and version instead of rerunning'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await mkdir(new URL('results/', root), {recursive: true});
const files = ['capture-rankings.v1.mjs', 'retrieval-runner.v1.mjs', 'ranking-metrics.v1.mjs', 'ranking-protocol.v1.json', 'ranking-controls.v1.json', 'comparison-plan.v1.json', 'comparison-system.v1.txt', 'corpus.json', 'queries.json', 'gold.json', 'dataset-manifest.json', 'dataset.mjs', 'verify.mjs', '../lexical-search/retrieval.mjs', '../lexical-search/analysis.mjs'];
const sourceHashes = Object.fromEntries(await Promise.all(files.map(async file => [file, digest(await read(file))])));
try {
  const data = await readDataset();
  validateDataset(data);
  const protocol = JSON.parse(await read('ranking-protocol.v1.json'));
  const raw = runRetrieval(data.corpus.documents, data.queries.rows, protocol.retriever);
  const rows = raw.map(row => {
    const label = data.gold.rows.find(g => g.queryId === row.queryId);
    return {...row, evaluations: protocol.cutoffs.map(k => evaluateRanking(row.ranking.map(r => r.id), label.qrels, k))};
  });
  const summaries = ['dev', 'test', 'all'].flatMap(split => protocol.cutoffs.map(k => ({
    split, k, ...summarizeMetrics(rows.filter(r => split === 'all' || r.split === split).map(row => ({metrics: row.evaluations.find(m => m.k === k)}))),
  })));
  const result = {kind: 'actual_fixed_in_process_bm25_search_and_offline_metrics', capturedAt: new Date().toISOString(), sourceHashes, runtime: {node: process.version, icu: process.versions.icu, platform: process.platform, arch: process.arch}, protocol, searchExecutions: raw.length, cutoffEvaluations: rows.length * protocol.cutoffs.length, modelExecutions: 0, rows, summaries};
  await writeFile(new URL('results/rankings.v1.json', root), JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({searches: result.searchExecutions, cutoffEvaluations: result.cutoffEvaluations, modelExecutions: 0, summaries}, null, 2));
} catch (error) {
  await writeFile(new URL('results/rankings.v1.failure.json', root), JSON.stringify({kind: 'failed_ranking_capture', sourceHashes, error: {name: error.name, message: error.message}}, null, 2) + '\n', {flag: 'wx'});
  throw error;
}
