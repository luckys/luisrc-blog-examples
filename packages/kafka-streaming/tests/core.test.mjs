import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeEvent, shipmentProjection } from '../src/projection.ts'
import { nextOffset, offsetLag } from '../src/offsets.ts'
import { shipmentEvents } from '../src/fixtures.ts'

test('schema: JSON y key válidos generan evento inmutable, sin coerción', () => {
  const event = decodeEvent(Buffer.from('s-1'), Buffer.from(JSON.stringify(shipmentEvents[0])))
  assert.deepEqual(event, shipmentEvents[0])
  assert.equal(Object.isFrozen(event), true)
})

test('schema: tombstone, key contradictoria, versión o tipo inválidos se rechazan', () => {
  const good = shipmentEvents[0]
  for (const value of [null, Buffer.from('{'), Buffer.alloc(4097), Buffer.from([0xff])])
    assert.throws(() => decodeEvent(Buffer.from('s-1'), value))
  for (const event of [{ ...good, schemaVersion: 2 }, { ...good, version: '1' }, { ...good, status: 'lost' }, { ...good, eventId: '' }])
    assert.throws(() => decodeEvent(Buffer.from('s-1'), Buffer.from(JSON.stringify(event))))
  assert.throws(() => decodeEvent(Buffer.from('s-2'), Buffer.from(JSON.stringify(good))))
})

test('replay: seis eventos reconstruyen dos envíos entregados, sin volver a producir efectos', () => {
  const view = shipmentProjection()
  for (const event of shipmentEvents) view.apply(event)
  assert.deepEqual(view.snapshot(), [
    { shipmentId: 's-1', version: 3, status: 'delivered' },
    { shipmentId: 's-2', version: 3, status: 'delivered' },
  ])
  for (const event of shipmentEvents) assert.equal(view.apply(event), false)
  const rebuilt = shipmentProjection()
  for (const event of shipmentEvents) rebuilt.apply(event)
  assert.deepEqual(rebuilt.snapshot(), view.snapshot())
})

test('proyección: hueco, regresión o eventId contradictorio no cambian el estado', () => {
  const view = shipmentProjection()
  assert.throws(() => view.apply(shipmentEvents[2]), /unexpected_version/)
  view.apply(shipmentEvents[0])
  assert.throws(() => view.apply({ ...shipmentEvents[0], status: 'delivered' }), /conflicting_event/)
  assert.throws(() => view.apply({ ...shipmentEvents[2], version: 2, status: 'created' }), /invalid_transition/)
  assert.deepEqual(view.snapshot(), [{ shipmentId: 's-1', version: 1, status: 'created' }])
})

test('proyección: copias, instancias y validación antes del cambio', () => {
  const view = shipmentProjection()
  const input = { ...shipmentEvents[0] }
  view.apply(input)
  input.status = 'delivered'
  const result = view.snapshot()
  result.pop()
  assert.equal(view.snapshot()[0].status, 'created')
  assert.equal(shipmentProjection().snapshot().length, 0)
  assert.throws(() => view.apply({ ...shipmentEvents[2], version: 0 }))
})

test('offsets: se confirma la siguiente posición con BigInt, no el offset leído', () => {
  assert.equal(nextOffset('41'), '42')
  assert.equal(nextOffset('9007199254740993'), '9007199254740994')
})

test('offsets: rechaza valores no canónicos, negativos y desbordamiento', () => {
  for (const value of ['-1', '01', '1.5', 3, '', '9223372036854775807'])
    assert.throws(() => nextOffset(value))
})

test('lag: diferencia de posiciones; sin commit no inventa un origen cero', () => {
  assert.equal(offsetLag('6', '2'), '4')
  assert.equal(offsetLag('6', '6'), '0')
  assert.equal(offsetLag('6', null), null)
  assert.throws(() => offsetLag('2', '3'))
})
