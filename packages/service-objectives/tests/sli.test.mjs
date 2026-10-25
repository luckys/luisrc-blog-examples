import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyHttp } from '../src/sli.ts'
import { classifyCohorts } from '../src/cohorts.ts'
import { httpEvents, operations } from '../src/fixtures.ts'

test('endpoint: disponibilidad, latencia y elegibilidad son filtros distintos', () => {
  const report = classifyHttp(httpEvents, 300)
  assert.equal(report.eligible, 6)
  assert.equal(report.available, 3)
  assert.equal(report.fastAndAvailable, 2)
  assert.deepEqual(report.excluded, { synthetic: 1, route: 1, invalid: 1 })
  assert.equal(report.rows.find((r) => r.id === 'http-03').fastAndAvailable, false)
  assert.equal(report.rows.find((r) => r.id === 'http-05').available, true)
  assert.equal(report.rows.find((r) => r.id === 'http-06').available, false)
})
test('endpoint: umbral inclusivo, duración inválida y duplicado rechazados', () => {
  const event = { ...httpEvents[0], durationMs: 300 }
  assert.equal(classifyHttp([event], 300).fastAndAvailable, 1)
  assert.equal(classifyHttp([{ ...event, durationMs: 301 }], 300).fastAndAvailable, 0)
  assert.throws(() => classifyHttp([{ ...event, durationMs: -1 }], 300))
  assert.throws(() => classifyHttp([event, event], 300))
})
test('cohortes: no seleccionar éxitos recientes y excluir pendientes de la misma edad', () => {
  const r = classifyCohorts(operations, 10, 5)
  assert.deepEqual([r.eligible, r.good, r.immature, r.future], [4, 1, 2, 1])
  assert.equal(r.rows.find((r) => r.id === 'op-02').classification, 'bad')
  assert.equal(r.rows.find((r) => r.id === 'op-05').classification, 'immature')
  assert.equal(r.rows.find((r) => r.id === 'op-06').classification, 'immature')
  assert.equal(classifyCohorts(operations, 5, 5).eligible, 1)
})
test('cohortes: deadline inclusivo; finalización tardía no borra el incumplimiento', () => {
  const base = { id: 'op-01', createdAt: 0, finishedAt: 5, outcome: 'completed' }
  assert.equal(classifyCohorts([base], 5, 5).good, 1)
  assert.equal(classifyCohorts([{ ...base, outcome: 'rejected' }], 5, 5).good, 1)
  assert.equal(classifyCohorts([{ ...base, finishedAt: 6 }], 10, 5).good, 0)
  assert.throws(() => classifyCohorts([{ ...base, finishedAt: -1 }], 10, 5))
})
