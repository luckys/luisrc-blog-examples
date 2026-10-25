import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { sourceHashes } from './hashes.mjs'
import { actionHasEvidence } from '../src/review.ts'
const root = new URL('../', import.meta.url)
const data = JSON.parse(await readFile(new URL('evidence/incident.json', root)))
assert.equal(data.syntheticIncident, true); assert.equal(data.realHttpAndProcesses, true)
assert.notEqual(data.apiPid, data.workerPid)
assert.deepEqual(await sourceHashes(), data.sources)
assert.equal(data.events.length, 11)
for (const [i, e] of data.events.entries()) {
  assert.equal(e.seq, i + 1)
  assert.equal(e.kind, 'observed')
  if (i) assert.ok(e.elapsedMs >= data.events[i - 1].elapsedMs)
}
const event = (id) => data.events.find((e) => e.id === id).facts
assert.equal(event('stalled_alive').liveStatus, 200)
assert.equal(event('stalled_alive').queued, 3)
assert.equal(event('stalled_alive').worker.attempts, 2)
assert.ok(event('stalled_alive').worker.ticks >= event('queued').worker.ticks + 3)
assert.equal(event('drained').completed, 5)
assert.equal(event('drained').admissionOpen, false)
assert.equal(event('guard_rejects_zero').rejected.ok, false)
assert.deepEqual(event('guard_rejects_zero').state.worker.config, event('candidate_enabled').worker.config)
assert.equal(data.final.completed, 7); assert.equal(data.final.queued, 0)
assert.equal(data.final.rejectedDuringPause, 1)
for (const job of data.final.jobs) { assert.equal(job.result, `report:${job.id}`); assert.equal(job.attempts, 1) }
assert.ok(data.actions.every((a) => actionHasEvidence(a, data.proofs)))
const replay = JSON.parse(await readFile(new URL('replay.json', root)))
assert.deepEqual(replay.events, data.events); assert.deepEqual(replay.actions, data.actions)
console.log('Fuentes, cronología, alcance y resultados archivados verificados')
