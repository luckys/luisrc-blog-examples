import test from 'node:test'
import assert from 'node:assert/strict'
import { WindowIndex } from '../src/windows.ts'
import { evaluateAlerts, rules } from '../src/alerts.ts'
import { scenarios, expand } from '../src/simulation.ts'

test('ventanas semiabiertas: rolling y calendario tienen denominadores diferentes', () => {
  const index = new WindowIndex(Array.from({ length: 6 }, (_, minute) => ({ minute, total: 100, bad: minute === 2 ? 10 : 0, present: true })))
  assert.equal(index.read(1, 5).bad, 10)
  assert.equal(index.read(4, 5).bad, 0)
  assert.equal(index.read(1, 5).total, 400)
  assert.equal(index.read(4, 5).total, 100)
  assert.throws(() => index.read(-1, 5))
  assert.throws(() => new WindowIndex([{ minute: 1, total: 1, bad: 0, present: true }]))
})
test('ventanas: tráfico cero conocido no equivale a telemetría ausente', () => {
  const index = new WindowIndex([{ minute: 0, total: 0, bad: 0, present: true }, { minute: 1, total: 0, bad: 0, present: false }])
  assert.equal(index.read(0, 1).complete, true)
  assert.equal(index.read(0, 2).complete, false)
})
test('ventanas: ponderar por eventos, no promediar porcentajes de intervalos', () => {
  const index = new WindowIndex([{ minute: 0, total: 10, bad: 1, present: true }, { minute: 1, total: 1000, bad: 0, present: true }])
  const combined = index.read(0, 2)
  assert.equal(combined.bad / combined.total, 1 / 1010)
  assert.notEqual(combined.bad / combined.total, (0.1 + 0) / 2)
})
test('alertas: degradación, recuperación, volumen bajo y huecos tienen estados distintos', () => {
  const byId = (id) => evaluateAlerts(new WindowIndex(expand(scenarios.find((s) => s.id === id))), 43200, 999000)
  assert.equal(byId('baseline').severity, 'none')
  assert.equal(byId('fast-burn').severity, 'page')
  assert.equal(byId('slow-burn').pairs.find((p) => p.id === 'slow').state, 'firing')
  assert.equal(byId('recovered').pairs[0].longBurn > 14.4, true)
  assert.equal(byId('recovered').pairs[0].shortBurn, 0)
  assert.equal(byId('recovered').severity, 'none')
  assert.equal(byId('low-traffic').pairs[0].state, 'insufficient_volume')
  assert.equal(byId('no-traffic').pairs[0].state, 'no_traffic')
  assert.equal(byId('missing-data').pairs[0].state, 'missing_data')
})
test('alertas: threshold estricto no dispara en igualdad', () => {
  const index = new WindowIndex(Array.from({ length: 360 }, (_, minute) => ({ minute, total: 1000, bad: 6, present: true })))
  const slow = evaluateAlerts(index, 360, 999000, rules.filter((r) => r.id === 'slow')).pairs[0]
  assert.equal(slow.longBurn, 6)
  assert.equal(slow.state, 'ok')
})
