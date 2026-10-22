import test from 'node:test'
import assert from 'node:assert/strict'
import { orderFixture, isRecent } from '../src/fixtures.ts'
import { readOrder, readMissing, readV2 } from '../src/consumer.ts'
import { represent } from '../src/representation.ts'

test('factory: valores estables, copias independientes y overrides validados', () => {
  const first = orderFixture()
  const second = orderFixture({ id: 'o-2', amountMinor: 9900 })
  assert.deepEqual(first, orderFixture())
  assert.equal(first.id, 'o-1')
  assert.equal(first.amountMinor, 1250)
  assert.equal(second.amountMinor, 9900)
  assert.ok(Object.isFrozen(first))
  assert.throws(() => { first.amountMinor = 0 }, TypeError)
  for (const override of [{ amountMinor: 0 }, { amountMinor: '1250' }, { id: '../x' }, { status: 'refunded' }, { createdAt: 'today' }])
    assert.throws(() => orderFixture(override), /invalid_fixture/)
})

test('consumidor: campos nuevos tolerados, importe y estado esperado conservados', () => {
  const body = represent(orderFixture(), 'additive')
  assert.deepEqual(readOrder(body), { id: 'o-1', amountMinor: 1250, currency: 'EUR', status: 'paid' })
  assert.deepEqual(readOrder({ ...body, ignored: true }), readOrder(body))
  assert.equal(readV2(represent(orderFixture(), 'v2')).amountMinor, 1250)
})

test('consumidor: renombrado y enum desconocido se rechazan, no se convierten en cero', () => {
  assert.throws(() => readOrder(represent(orderFixture(), 'renamed')), /consumer_contract/)
  assert.throws(() => readOrder({ ...represent(orderFixture()), status: 'refunded' }), /consumer_contract/)
  assert.throws(() => readOrder({ id: 'o-1', amountMinor: 12.5, currency: 'EUR', status: 'paid' }), /consumer_contract/)
  assert.deepEqual(readMissing({ error: 'not_found' }), { error: 'not_found' })
  assert.throws(() => readMissing({ error: 'database_private' }), /consumer_contract/)
})

test('tiempo explícito: siete días incluidos, un milisegundo más y fechas futuras excluidos', () => {
  const order = orderFixture()
  assert.equal(isRecent(order, new Date('2026-01-22T10:00:00.000Z')), true)
  assert.equal(isRecent(order, new Date('2026-01-22T10:00:00.001Z')), false)
  assert.equal(isRecent(order, new Date('2026-01-15T09:59:59.999Z')), false)
  assert.throws(() => isRecent(order, new Date('invalid')), /invalid_clock/)
})
