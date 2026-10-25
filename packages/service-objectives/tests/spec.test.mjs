import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { thresholdFor } from '../src/budget.ts'
import { rules } from '../src/alerts.ts'
import { buildReport } from '../src/report.ts'

test('contrato: documento, thresholds y límites coinciden con el modelo simulado', async () => {
  const spec = JSON.parse(await readFile(new URL('../spec/objectives.json', import.meta.url)))
  const policy = JSON.parse(await readFile(new URL('../spec/budget-policy.json', import.meta.url)))
  assert.equal(spec.format, 'lab-v1-not-openslo')
  assert.equal(spec.targetPpm, 999000); assert.equal(spec.latencyThresholdMs, 300)
  assert.equal(spec.window.minutes, 43200)
  assert.equal(policy.automatedEnforcement, false)
  assert.deepEqual(rules.map((r) => r.threshold), [thresholdFor(.02, 720, 1), thresholdFor(.05, 720, 6), thresholdFor(.10, 720, 72)])
  const report = buildReport()
  const fast = report.scenarios.find((s) => s.id === 'fast-burn')
  const recovered = report.scenarios.find((s) => s.id === 'recovered')
  assert.deepEqual([fast.budget.bad, fast.budget.allowed, fast.budget.remaining], [1500, 43200, 41700])
  assert.deepEqual(recovered.budget, fast.budget)
  assert.equal(fast.alerts.pairs[0].longBurn, 25)
  assert.equal(fast.alerts.pairs[0].shortBurn, 150)
  assert.equal(report.scenarios.find((s) => s.id === 'missing-data').budget, null)
  assert.equal(report.scenarios.find((s) => s.id === 'no-traffic').budget.compliant, null)
})
