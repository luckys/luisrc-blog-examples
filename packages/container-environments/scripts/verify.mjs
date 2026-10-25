import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hashes } from './hashes.mjs'
const evidence = JSON.parse(await readFile('evidence/compose.json'))
assert.deepEqual(evidence.sources, await hashes())
const ids = ['built', 'fresh_setup', 'persisted_and_cached', 'api_recreated', 'redis_unavailable',
  'postgres_unavailable', 'postgres_recovered', 'volume_reused', 'second_fresh_setup', 'cleanup']
assert.deepEqual(evidence.events.map((e) => e.id), ids)
const event = (id) => evidence.events.find((e) => e.id === id).facts
for (const [i, e] of evidence.events.entries()) {
  assert.equal(e.seq, i + 1); assert.equal(e.kind, 'observed')
  if (i) assert.ok(e.elapsedMs >= evidence.events[i - 1].elapsedMs)
}
assert.equal(event('built').sourceChangeInstallCached, true)
assert.equal(event('fresh_setup').security.uid, 1000)
assert.equal(event('fresh_setup').security.compiler, false)
assert.equal(event('persisted_and_cached').second.body.source, 'redis')
assert.notEqual(event('api_recreated').before, event('api_recreated').after)
assert.equal(event('redis_unavailable').fallback.body.source, 'postgres')
assert.equal(event('postgres_unavailable').live.status, 200)
assert.equal(event('postgres_unavailable').ready.status, 503)
assert.equal(event('volume_reused').rows, 1)
assert.equal(event('second_fresh_setup').initialRows, 0)
assert.equal(event('second_fresh_setup').gone.status, 404)
assert.deepEqual(event('cleanup').remaining, { container: '', volume: '', network: '' })
assert.deepEqual(JSON.parse(await readFile('replay.json')).events, evidence.events)
console.log('Diez fases y hashes verificados; no se ha iniciado Docker ni repetido el ejercicio.')
