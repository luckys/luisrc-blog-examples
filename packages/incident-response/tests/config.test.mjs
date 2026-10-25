import test from 'node:test'
import assert from 'node:assert/strict'
import { legacyBatchSize, validatedBatchSize, applyConfig, requireScope, selectBatch } from '../src/config.ts'

test('regresión: cero pasa legacy y selecciona vacío aunque haya trabajo pendiente', () => {
  assert.equal(legacyBatchSize(0), 0)
  assert.deepEqual(selectBatch(['job-001', 'job-002'], legacyBatchSize(0)), [])
  assert.deepEqual(selectBatch(['job-001', 'job-002'], legacyBatchSize(1)), ['job-001'])
})
test('corrección: solo enteros1..16; cero no es valor operativo válido', () => {
  for (const size of [1, 2, 16]) assert.equal(validatedBatchSize(size), size)
  for (const size of [0, -1, 1.5, NaN, Infinity, 17]) assert.throws(() => validatedBatchSize(size))
})
test('aplicar candidata primero valida: rechazo no cambia configuración ni revision', () => {
  const before = { batchSize: 2, revision: 4, guarded: true }
  assert.throws(() => applyConfig(before, { batchSize: 0, expectedRevision: 4 }))
  assert.deepEqual(before, { batchSize: 2, revision: 4, guarded: true })
  assert.deepEqual(applyConfig(before, { batchSize: 1, expectedRevision: 4 }), { batchSize: 1, revision: 5, guarded: true })
})
test('scope y optimistic precondition impiden actuar en otra instancia o sobre estado atrasado', () => {
  assert.throws(() => requireScope('expected', 'another'))
  assert.doesNotThrow(() => requireScope('expected', 'expected'))
  assert.throws(() => applyConfig({ batchSize: 2, revision: 4, guarded: false }, { batchSize: 0, expectedRevision: 3 }))
  assert.throws(() => applyConfig({ batchSize: 0, revision: 4, guarded: false }, { guarded: true, expectedRevision: 4 }))
})
