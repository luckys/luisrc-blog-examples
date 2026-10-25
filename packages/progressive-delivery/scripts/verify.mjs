import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hashes } from './hashes.mjs'
import { bucket, rolloutDecision } from '../src/rollout.ts'
const evidence = JSON.parse(await readFile('evidence/delivery.json'))
assert.deepEqual(evidence.sources, await hashes())
const e = (id) => evidence.events.find((v) => v.id === id).facts
const expected = ['pipeline_completed', 'baseline_schema', 'schema_expanded', 'candidate_deployed_dark', 'smoke_flag_off',
  'rolling_first_slot', 'rolling_all_slots', 'blue_green_switch', 'blue_restored', 'canary_exposed', 'canary_rollback',
  'forced_negative_release', 'flag_disabled', 'candidate_write', 'image_rollback', 'unsafe_contract_rejected', 'rollback_integrity', 'cleanup']
assert.deepEqual(evidence.events.map((v) => v.id), expected)
for (const [i, v] of evidence.events.entries()) {
  assert.equal(v.seq, i + 1); assert.equal(v.kind, 'observed')
  if (i) assert.ok(v.elapsedMs >= evidence.events[i - 1].elapsedMs)
}
assert.ok(e('pipeline_completed').stages.every((s) => s.status === 'passed'))
assert.equal(e('pipeline_completed').audit.metadata.vulnerabilities.high, 0)
assert.equal(e('pipeline_completed').audit.metadata.vulnerabilities.critical, 0)
assert.ok(e('blue_green_switch').beforeSwitch.every((r) => r.body.revision === 'v1'))
assert.ok(e('blue_green_switch').smoke.cases.every((c) => c.response.body.revision === 'v2-regression-fixture'))
assert.notEqual(e('blue_green_switch').blueImage, e('blue_green_switch').greenImage)
const canary = e('canary_exposed'); assert.equal(canary.samples.length, 200)
for (const sample of canary.samples) {
  assert.equal(sample.bucket, bucket(sample.key)); assert.equal(sample.status, 200)
  assert.equal(sample.slot === 'green', sample.bucket < 10)
  assert.equal(sample.bad, sample.priceCents !== 10000 || sample.id !== 'book-1')
}
for (const [key, candidate] of [['candidate', true], ['control', false]]) {
  const selected = canary.samples.filter((s) => (s.slot === 'green') === candidate)
  assert.deepEqual(canary[key], { total: selected.length, bad: selected.filter((s) => s.bad).length })
}
assert.equal(rolloutDecision(canary.candidate, canary.control), 'rollback')
assert.equal(e('forced_negative_release').smoke.ok, false)
assert.equal(e('flag_disabled').smoke.ok, true)
assert.notEqual(e('image_rollback').from, e('image_rollback').to)
assert.equal(e('image_rollback').runningImage, e('pipeline_completed').artifacts.stable.id)
assert.equal(e('image_rollback').smoke.ok, true)
assert.equal(e('rollback_integrity').smoke.ok, true)
assert.deepEqual(e('rollback_integrity').afterRows.filter((r) => r.id !== 'after-rollback'), e('rollback_integrity').beforeRows)
assert.equal(e('rollback_integrity').afterRows.length, 5)
assert.equal(e('unsafe_contract_rejected').sqlstate, '42703')
assert.deepEqual(e('cleanup').remaining, { container: '', volume: '', network: '' }); assert.equal(e('cleanup').routerClosed, true)
assert.deepEqual(JSON.parse(await readFile('replay.json')).events, evidence.events)
console.log('Dieciocho fases y 200 respuestas consistentes con los hashes; no se inició Docker.')
