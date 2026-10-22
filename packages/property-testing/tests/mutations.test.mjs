import test from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import { Payment } from '../src/payment.ts'
import { sequenceArbitrary } from './sequence.mjs'
import { paymentProperty } from './search-fixture.mjs'
import { assertRecovery, faultsArbitrary } from './recovery-fixture.mjs'

test('tres mutaciones seleccionadas son detectadas por propiedades, no por errores de import', () => {
  const properties = [
    paymentProperty('late-decline'),
    paymentProperty('duplicate-capture'),
    fc.property(faultsArbitrary, (faults) => assertRecovery(faults, false)),
  ]
  for (const property of properties) {
    const result = fc.check(property, { seed: 5702, numRuns: 500 })
    assert.equal(result.failed, true)
    assert.ok(result.errorInstance instanceof assert.AssertionError)
    assert.ok(result.counterexample)
  }
})

test('una propiedad de estado terminal deja sobrevivir capturas duplicadas', () => {
  fc.assert(fc.property(sequenceArbitrary, (events) => {
    const payment = new Payment('duplicate-capture')
    for (const event of events) {
      const previous = payment.state
      payment.apply(event)
      if (previous === 'succeeded' || previous === 'failed') assert.equal(payment.state, previous)
    }
  }), { seed: 5702, numRuns: 500 })
  const payment = new Payment('duplicate-capture')
  for (const event of ['submit', 'confirm', 'confirm']) payment.apply(event)
  assert.equal(payment.captures, 2)
})
