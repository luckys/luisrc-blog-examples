import test from 'node:test'
import assert from 'node:assert/strict'
import { logicalClock } from '../src/clock.ts'
import { bucketFor, routingTable } from '../src/routing.ts'

test('Lamport: recibir un mensaje avanza por encima del emisor y del estado local', () => {
  const sender = logicalClock()
  const receiver = logicalClock(8)
  const sent = sender.tick()
  assert.equal(sent, 1)
  assert.equal(receiver.receive(sent), 9)
  assert.equal(receiver.tick(), 10)
})

test('Lamport: números ordenados pueden pertenecer a eventos sin mensajes entre sí', () => {
  const a = logicalClock()
  const b = logicalClock()
  assert.equal(a.tick(), 1)
  b.tick()
  assert.equal(b.tick(), 2)
})

test('Lamport: timestamp inválido o desbordado no cambia el contador', () => {
  const clock = logicalClock(2)
  for (const value of [-1, '3', NaN, Number.MAX_SAFE_INTEGER])
    assert.throws(() => clock.receive(value))
  assert.equal(clock.value(), 2)
  assert.throws(() => logicalClock(Number.MAX_SAFE_INTEGER).tick())
})

test('routing: la misma clave conserva bucket y valida los límites', () => {
  assert.equal(bucketFor('shipment-1', 8), bucketFor('shipment-1', 8))
  for (const key of ['', null, 42]) assert.throws(() => bucketFor(key, 8))
  for (const count of [0, -1, 1.5, 65537]) assert.throws(() => bucketFor('x', count))
})

test('routing: mover un bucket invalida el mapa viejo, no mueve los datos', () => {
  const table = routingTable(['east', 'west', 'east', 'west'])
  const previous = table.route('shipment-1')
  const destination = previous.owner === 'east' ? 'west' : 'east'
  table.move(previous.bucket, destination, previous.revision)
  assert.throws(() => table.validate(previous), /stale_route/)
  const current = table.route('shipment-1')
  assert.equal(current.owner, destination)
  assert.equal(current.bucket, previous.bucket)
  assert.equal(current.revision, 2)
  table.validate(current)
})

test('routing: revisión contradictoria y entrada inválida no cambian el mapa', () => {
  const table = routingTable(['east', 'west'])
  assert.throws(() => table.move(0, 'north', 2), /stale_revision/)
  assert.throws(() => table.move(2, 'north', 1))
  assert.throws(() => table.move(0, '', 1))
  assert.equal(table.route('x').revision, 1)
})

test('routing: hash modulo cambia rutas al cambiar el número de buckets', () => {
  const keys = Array.from({ length: 1000 }, (_, index) => `shipment-${index}`)
  const moved = keys.filter((key) => bucketFor(key, 2) !== bucketFor(key, 3)).length
  assert.equal(moved, 679)
})
