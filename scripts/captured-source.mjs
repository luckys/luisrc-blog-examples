import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash = content => createHash('sha256').update(content).digest('hex');
// A monorepo's global lock evolves independently of a saved experiment. Only
// this exact dependency path may use verified historical bytes; code/data must
// still match their live canonical source. Captures are never rewritten here.
export async function readCapturedSource(root, file, expectedHash) {
  const current = await readFile(root + file);
  if (file !== '../../pnpm-lock.yaml' || hash(current) === expectedHash) return current;
  assert.match(expectedHash, /^[a-f0-9]{64}$/);
  const saved = JSON.parse(await readFile(new URL('../metadata/dependency-locks/' + expectedHash + '.json', import.meta.url)));
  assert.equal(saved.kind, 'historical_dependency_evidence_not_an_active_lockfile');
  assert.equal(saved.originalPath, file); assert.equal(saved.sha256, expectedHash);
  const content = Buffer.from(saved.content, 'utf8'); assert.equal(hash(content), expectedHash);
  return content;
}
