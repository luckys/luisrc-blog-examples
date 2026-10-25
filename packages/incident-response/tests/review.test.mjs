import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { actionHasEvidence, handoffHasContext } from '../src/review.ts'

test('acción: un owner y texto no prueban cierre; se exige resultado verdadero del fixture', () => {
  const action = { id: 'A01', owner: 'fixture-owner', criterion: 'zero rejected', state: 'verified_in_fixture', proof: 'guard_rejects_zero' }
  assert.equal(actionHasEvidence(action, {}), false)
  assert.equal(actionHasEvidence(action, { guard_rejects_zero: false }), false)
  assert.equal(actionHasEvidence(action, { guard_rejects_zero: true }), true)
  assert.equal(actionHasEvidence({ ...action, owner: '' }, { guard_rejects_zero: true }), false)
})
test('handoff: contexto completo es una condición de documento, no prueba de comunicación humana', async () => {
  const coordination = JSON.parse(await readFile(new URL('../docs/coordination.json', import.meta.url)))
  assert.equal(coordination.deliveredToPeople, false)
  assert.equal(handoffHasContext(coordination.handoff), true)
  assert.equal(handoffHasContext({ ...coordination.handoff, nextAction: '' }), false)
  const actions = JSON.parse(await readFile(new URL('../docs/actions.json', import.meta.url)))
  assert.equal(actions.filter((a) => a.state === 'open').length, 2)
  for (const action of actions) assert.ok(action.owner && action.criterion && action.reviewDate)
})
