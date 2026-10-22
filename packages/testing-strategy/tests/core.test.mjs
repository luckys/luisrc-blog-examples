import test from 'node:test'
import assert from 'node:assert/strict'
import { transition, apply, newJob, assertJob, parseCommand } from '../src/machine.ts'

test('terminal: succeed repetido conserva el éxito; fail no lo revierte', () => {
  assert.equal(transition('succeeded', 'succeed'), 'succeeded')
  assert.throws(() => transition('succeeded', 'fail'), /invalid_transition/)
})

// Especificación de producto: null significa comando rechazado.
const cases = [
  ['queued', 'start', 'running'], ['queued', 'succeed', null],
  ['queued', 'fail', null], ['queued', 'cancel', 'cancelled'],
  ['running', 'start', null], ['running', 'succeed', 'succeeded'],
  ['running', 'fail', 'failed'], ['running', 'cancel', null],
  ['succeeded', 'start', null], ['succeeded', 'succeed', 'succeeded'],
  ['succeeded', 'fail', null], ['succeeded', 'cancel', null],
  ['failed', 'start', null], ['failed', 'succeed', null],
  ['failed', 'fail', 'failed'], ['failed', 'cancel', null],
  ['cancelled', 'start', null], ['cancelled', 'succeed', null],
  ['cancelled', 'fail', null], ['cancelled', 'cancel', 'cancelled'],
]
for (const [state, command, expected] of cases) {
  test(`matriz: ${state} + ${command} -> ${expected ?? 'rechazo'}`, () => {
    if (expected === null) assert.throws(() => transition(state, command), /invalid_transition/)
    else assert.equal(transition(state, command), expected)
  })
}

test('apply: no muta el original, incrementa una versión y no incrementa un duplicado', () => {
  const queued = newJob('j-1')
  const running = apply(queued, 'start')
  const succeeded = apply(running, 'succeed')
  assert.deepEqual(queued, { id: 'j-1', state: 'queued', version: 0 })
  assert.deepEqual(succeeded, { id: 'j-1', state: 'succeeded', version: 2 })
  assert.equal(apply(succeeded, 'succeed'), succeeded)
  assert.ok(Object.isFrozen(queued) && Object.isFrozen(running))
  assert.throws(() => { running.state = 'queued' }, TypeError)
})

test('entrada: tipos runtime, IDs y versiones fuera de rango se rechazan', () => {
  for (const id of ['', 'j-', '../j-1', 'j-a'.repeat(40), 1, null]) assert.throws(() => newJob(id))
  for (const version of [-1, 0.5, NaN, '0', Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => assertJob({ id: 'j-1', state: 'queued', version }))
  for (const value of [null, [], {}, { id: 'j-1', state: 'lost', version: 0 }])
    assert.throws(() => assertJob(value))
  assert.throws(() => apply({ id: 'j-1', state: 'queued', version: Number.MAX_SAFE_INTEGER }, 'start'), /version_overflow/)
})

test('comandos: no se aceptan propiedades heredadas ni coerción', () => {
  for (const value of ['constructor', 'toString', '__proto__', '', 1, null, {}])
    assert.throws(() => parseCommand(value), /invalid_input/)
  assert.throws(() => transition('constructor', 'start'), /invalid_transition/)
  assert.throws(() => transition('queued', 'toString'), /invalid_transition/)
  assert.equal(parseCommand('cancel'), 'cancel')
})
