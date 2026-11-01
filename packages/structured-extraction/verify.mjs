import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildMessages} from './prompts.mjs';
const root = new URL('.', import.meta.url);
const read = file => readFile(new URL(file, root));
const json = async file => JSON.parse(await read(file));
const digest = value => createHash('sha256').update(value).digest('hex');

export async function verifyCapture() {
  const [capture, validation, fixtures, protocol, schema, examples, documents, archive] = await Promise.all([
    'results/generations.json', 'results/validation.json', 'results/fixtures.json',
    'protocol.json', 'extraction.schema.json', 'few-shot.json', 'documents.json',
    'dependency-lock.capture.json',
  ].map(json));
  for (const saved of [capture, validation, fixtures]) {
    for (const [file, hash] of Object.entries(saved.sourceHashes)) {
      // The global lock is mutable as other laboratories are added. Check the
      // exact historical bytes, explicitly, without changing the original capture.
      if (file === '../../pnpm-lock.yaml') {
        assert.equal(archive.originalPath, file);
        assert.equal(archive.sha256, hash);
        assert.equal(digest(archive.content), hash);
      } else assert.equal(digest(await read(file)), hash, file);
    }
  }
  assert.deepEqual(capture.protocol, protocol);
  assert.equal(validation.capture, capture.capturedAt);
  assert.equal(documents.length, protocol.records);
  assert.equal(capture.runs.length, documents.length * protocol.variants.length);
  assert.equal(validation.rows.length, capture.runs.length);
  const expectedOrder = protocol.variants.flatMap(variant => documents.map(doc => `${variant}/${doc.id}`));
  assert.deepEqual(capture.runs.map(r => `${r.variant}/${r.documentId}`), expectedOrder);
  const totals = new Map(protocol.variants.map(v => [v, {tp: 0, fp: 0, fn: 0, stages: {parse: 0, schema: 0, evidence: 0, accepted: 0}}]));
  for (const [i, run] of capture.runs.entries()) {
    const doc = documents.find(d => d.id === run.documentId), row = validation.rows[i];
    assert.deepEqual(run.messages, buildMessages(run.variant, doc.source, schema, examples));
    assert.equal(row.documentId, run.documentId); assert.equal(row.variant, run.variant);
    assert.equal(typeof run.raw, 'string'); assert.equal(typeof run.renderedChat, 'string');
    assert.ok(run.renderedChat.includes(run.messages.at(-1).content));
    assert.ok(run.inputIds.length > 0 && run.inputIds.every(Number.isInteger));
    assert.ok(run.generatedIds.every(Number.isInteger));
    assert.equal(run.tokenCount, run.generatedIds.length);
    assert.ok(run.tokenCount > 0 && run.tokenCount <= protocol.decode.max_new_tokens);
    assert.equal(run.reason, 'eos');
    assert.equal(row.accepted, row.stage === 'accepted');
    const identity = e => JSON.stringify([e.type, e.text]);
    const pred = new Set((row.accepted ? row.data.entities : []).map(identity));
    const gold = new Set(doc.expected.map(identity));
    const counts = {tp: [...pred].filter(e => gold.has(e)).length, fp: [...pred].filter(e => !gold.has(e)).length, fn: [...gold].filter(e => !pred.has(e)).length};
    assert.deepEqual(row.counts, counts);
    const total = totals.get(run.variant); total.stages[row.stage]++;
    for (const key of ['tp', 'fp', 'fn']) total[key] += counts[key];
  }
  for (const saved of validation.summaries) {
    const {tp, fp, fn, stages} = totals.get(saved.variant);
    assert.deepEqual(saved, {variant: saved.variant, documents: documents.length, stages, tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null, f1: 2 * tp + fp + fn ? 2 * tp / (2 * tp + fp + fn) : null});
  }
  assert.equal(fixtures.rows.length, 18);
  for (const row of fixtures.rows) assert.equal(row.result.stage, row.expectedStage, row.id);
  return {capture, validation, fixtures};
}

export async function verifyPython() {
  const runtime = await json('runtime.json'), name = 'structured-verify-' + randomUUID();
  try {
    for (const [mode, saved] of [['validate', 'results/validation.json'], ['fixtures', 'results/fixtures.json'], ['schema', 'extraction.schema.json']]) {
      const r = spawnSync('docker', ['run', '--rm', '--name', name, '--pull=never', '--platform', runtime.platform, '--network', 'none', '--read-only', '--tmpfs', '/tmp', '--cpus', '2', '--memory', '2g', '--user', '1000:100', '--cap-drop', 'ALL', '--env', 'PYTHONDONTWRITEBYTECODE=1', '--mount', `type=bind,src=${fileURLToPath(root)},dst=/work,readonly`, '--workdir', '/work', '--entrypoint', 'python', runtime.image, 'contract.py', mode], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 60000});
      assert.ifError(r.error); assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(JSON.parse(r.stdout), await json(saved), mode + ' readonly revalidation');
    }
  } finally { spawnSync('docker', ['rm', '-f', name], {stdio: 'ignore', timeout: 10000}); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await verifyCapture(); await verifyPython();
  console.log('24 capturas, hashes históricos, mensajes, métricas, 18 controles y contrato Pydantic revalidados sin escribir resultados');
}
