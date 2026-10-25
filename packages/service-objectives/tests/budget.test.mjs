import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeBudget, burnRate, thresholdFor, projectedHoursToExhaustion } from '../src/budget.ts'

test('budget: fracciones, deuda, target y ausencia de datos explícitos', () => {
  const r = summarizeBudget(1000000, 1200, 999000)
  assert.deepEqual([r.allowed, r.remaining, r.spentFraction, r.compliant], [1000, -200, 1.2, false])
  assert.equal(summarizeBudget(5, 1, 990000).allowed, 0.05)
  assert.equal(summarizeBudget(0, 0, 999000).sli, null)
  assert.equal(summarizeBudget(0, 0, 999000).compliant, null)
  assert.throws(() => summarizeBudget(1, 2, 999000))
  assert.throws(() => summarizeBudget(1, 0, 1000000))
})
test('burn: ratios y proyecciones de tiempo no son la misma magnitud', () => {
  assert.equal(burnRate(1000, 10, 999000), 10)
  assert.equal(burnRate(0, 0, 999000), null)
  assert.equal(thresholdFor(0.02, 720, 1), 14.4)
  assert.equal(thresholdFor(0.02, 672, 1), 13.44)
  assert.equal(projectedHoursToExhaustion(800, 10000, 0.01), 8)
  assert.equal(projectedHoursToExhaustion(800, 0, 0.01), null)
  assert.equal(projectedHoursToExhaustion(-20, 10000, 0.01), 0)
})
