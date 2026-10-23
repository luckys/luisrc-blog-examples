import test from 'node:test'
import assert from 'node:assert/strict'
import { percentile, summarize, histogram, mergeHistograms } from '../src/statistics.ts'
import { makeDataset, calculateSlow, calculateIndexed } from '../src/workload.ts'
import { LabCache } from '../src/cache.ts'

test('nearest-rank: muestra pequeña, límites y errores de contrato', () => {
  const values = [100, 10, 30, 20, 40]
  assert.equal(percentile(values, 0.5), 30)
  assert.equal(percentile(values, 0.95), 100)
  assert.equal(percentile([], 0.95), null)
  for (const p of [0, -1, 1.1, NaN]) assert.throws(() => percentile(values, p), RangeError)
  for (const input of [[NaN], [-1], [Infinity]]) assert.throws(() => percentile(input, 0.5), RangeError)
  assert.deepEqual(values, [100, 10, 30, 20, 40])
})

test('resultados: cuenta errores y conserva distribuciones separadas', () => {
  const report = summarize([{ ms: 80, status: 200 }, { ms: 100, status: 200 },
    ...Array.from({ length: 98 }, () => ({ ms: 1, status: 503 }))], 2)
  assert.equal(report.all.p50, 1)
  assert.equal(report.success.p50, 80)
  assert.equal(report.completedRps, 50)
  assert.equal(report.successfulRps, 1)
  assert.equal(report.errors, 98)
  assert.equal(summarize([], 1).success.p99, null)
  assert.throws(() => summarize([], 0), RangeError)
})

test('agregar histogramas exige mismos límites y no promedia percentiles', () => {
  const a = histogram([1, 2, 3], [2, 5])
  const b = histogram([100], [2, 5])
  assert.deepEqual(mergeHistograms(a, b), { bounds: [2, 5], counts: [2, 1, 1] })
  assert.throws(() => mergeHistograms(a, histogram([1], [3, 5])), RangeError)
  assert.throws(() => histogram([1], [5, 2]), RangeError)
  assert.equal(percentile([1, 2, 3, 100], 0.95), 100)
  assert.notEqual((percentile([1, 2, 3], 0.95) + percentile([100], 0.95)) / 2, 100)
})

test('workload: oráculo explícito y equivalencia sobre dataset determinista', () => {
  const rates = [{ currency: 'C0', basisPoints: 10000 }, { currency: 'C1', basisPoints: 12000 }]
  const payments = [{ currency: 'C0', minor: 2 }, { currency: 'C1', minor: 3 }]
  assert.equal(calculateSlow(payments, rates), 56000)
  assert.equal(calculateIndexed(payments, rates), 56000)
  const data = makeDataset()
  const expected = data.payments.reduce((sum, row, index) => sum + row.minor * (10000 + index % 1000), 0)
  assert.equal(calculateSlow(data.payments, data.rates), expected)
  assert.equal(calculateIndexed(data.payments, data.rates), expected)
  for (const fn of [calculateSlow, calculateIndexed]) assert.throws(() => fn([{ currency: 'missing', minor: 1 }], rates), /missing rate/)
})

test('workload: índice conserva primera tasa repetida y entrada vacía suma cero', () => {
  const rates = [{ currency: 'C0', basisPoints: 2 }, { currency: 'C0', basisPoints: 9 }]
  for (const fn of [calculateSlow, calculateIndexed]) {
    assert.equal(fn([{ currency: 'C0', minor: 3 }], rates), 6)
    assert.equal(fn([], rates), 0)
  }
})

test('cache: variante sin límite acumula y bounded conserva solo entradas recientes', () => {
  const leak = new LabCache(Infinity)
  const bounded = new LabCache(100)
  for (let i = 0; i < 500; i++) { leak.add(i); bounded.add(i) }
  assert.equal(leak.items.length, 500)
  assert.equal(bounded.items.length, 100)
  assert.equal(bounded.items[0].id, 400)
})
