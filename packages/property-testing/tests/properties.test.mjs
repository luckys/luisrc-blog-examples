import test from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import { amountMinor, splitAmount } from '../src/money.ts'
import { Payment } from '../src/payment.ts'
import { assertSequence, sequenceArbitrary } from './sequence.mjs'

test('importe: ejemplos de frontera y rechazo explícito', () => {
  assert.equal(amountMinor(1), 1)
  assert.equal(amountMinor(1_000_000), 1_000_000)
  for (const value of [0, -1, 1.5, NaN, Infinity, 1_000_001, '1'])
    assert.throws(() => amountMinor(value), RangeError)
  assert.deepEqual(splitAmount(5, 2), [3, 2])
})

test('generador constructivo: repartir conserva cada céntimo y equilibrio', () => {
  const pair = fc.record({
    total: fc.integer({ min: 1, max: 1_000_000 }),
    parts: fc.integer({ min: 1, max: 20 }),
  })
  fc.assert(fc.property(pair, ({ total, parts }) => {
    const result = splitAmount(total, parts)
    assert.equal(result.length, parts)
    assert.equal(result.reduce((sum, value) => sum + value, 0), total)
    assert.ok(result.every((value) => Number.isInteger(value) && value >= 0))
    assert.ok(Math.max(...result) - Math.min(...result) <= 1)
  }), { seed: 5701, numRuns: 500 })
})

test('modelo: secuencias generadas contrastan estado y número de capturas', () => {
  fc.assert(fc.property(sequenceArbitrary, (events) => {
    assertSequence(events, () => new Payment())
  }), { seed: 5702, numRuns: 500 })
})

test('regresión explícita: un rechazo atrasado no revierte una confirmación', () => {
  const payment = new Payment()
  for (const event of ['submit', 'confirm', 'decline']) payment.apply(event)
  assert.equal(payment.state, 'succeeded')
  assert.equal(payment.captures, 1)
})

test('regresión explícita: repetir confirmación no duplica captura', () => {
  const payment = new Payment()
  for (const event of ['submit', 'confirm', 'confirm']) payment.apply(event)
  assert.equal(payment.state, 'succeeded')
  assert.equal(payment.captures, 1)
})
