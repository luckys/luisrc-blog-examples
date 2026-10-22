import test from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import { Payment } from '../src/payment.ts'
import { assertSequence } from './sequence.mjs'
import { runRace } from '../src/concurrency.ts'
import { paymentProperty } from './search-fixture.mjs'

test('shrinking real y replay conservan el rechazo atrasado', () => {
  const failure = fc.check(paymentProperty('late-decline'), { seed: 5702, numRuns: 500 })
  assert.equal(failure.failed, true)
  assert.ok(failure.errorInstance instanceof assert.AssertionError)
  assert.ok(failure.numShrinks > 0)
  assert.deepEqual(failure.counterexample, [['submit', 'confirm', 'decline']])
  const replay = fc.check(paymentProperty('late-decline'), {
    seed: failure.seed, path: failure.counterexamplePath, endOnFailure: true,
  })
  assert.equal(replay.failed, true)
  assert.deepEqual(replay.counterexample, failure.counterexample)
  assert.throws(() => assertSequence(failure.counterexample[0], () => new Payment('late-decline')), assert.AssertionError)
  assertSequence(failure.counterexample[0], () => new Payment())
})

test('scheduler generado detecta una actualización perdida y el fix conserva dos', async () => {
  const unsafe = await fc.check(fc.asyncProperty(fc.scheduler(), async (scheduler) => {
    assert.equal((await runRace(scheduler, false)).value, 2)
  }), { seed: 5703, numRuns: 100 })
  assert.equal(unsafe.failed, true)
  assert.ok(unsafe.errorInstance instanceof assert.AssertionError)
  await fc.assert(fc.asyncProperty(fc.scheduler(), async (scheduler) => {
    assert.equal((await runRace(scheduler, true)).value, 2)
  }), { seed: 5703, numRuns: 100 })
})

test('regresión de carrera: liberar ambas lecturas antes de escribir pierde un incremento', async () => {
  const lost = await runRace(fc.schedulerFor([1, 2, 3, 4]), false)
  assert.equal(lost.value, 1)
  assert.deepEqual(lost.report.map((entry) => entry.label), ['read', 'read', 'write', 'write'])
  const fixed = await runRace(fc.schedulerFor([1, 2]), true)
  assert.equal(fixed.value, 2)
})
