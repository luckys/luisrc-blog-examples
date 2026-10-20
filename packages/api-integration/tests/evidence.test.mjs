import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { experiment } from '../demo.mjs'
import { timeline } from '../timeline.mjs'

test('evidencia: HTTP/SSE/gRPC actuales reproducen el JSON archivado', async () => {
  const archived = JSON.parse(
    await readFile(new URL('../results/experiment.json', import.meta.url)),
  )
  assert.deepEqual(await experiment(), archived)
})

test('simulación: 3s detecta cambios en 3, 6 y 9; no mide red', () => {
  const result = timeline(3)
  assert.deepEqual(
    result.polls.map((p) => p.time),
    [0, 3, 6, 9, 12],
  )
  assert.deepEqual(result.observations, [
    { changedAt: 2, observedAt: 3 },
    { changedAt: 5, observedAt: 6 },
    { changedAt: 9, observedAt: 9 },
  ])
})

test('simulación: un intervalo puede ocultar estados intermedios y agotar la ventana', () => {
  assert.deepEqual(
    timeline(6).polls.map((p) => p.version),
    [1, 3, 4],
  )
  assert.equal(timeline(7).observations[2].observedAt, null)
  for (const value of [0, 11, 1.5, NaN]) assert.throws(() => timeline(value))
})
