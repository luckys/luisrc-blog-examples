import test from 'node:test'
import assert from 'node:assert/strict'
import { replicaPair } from '../src/replication.ts'

test('replicación: escritura confirmada y lectura posterior obsoleta', () => {
  const pair = replicaPair()
  const receipt = pair.write('shipped')
  assert.deepEqual(receipt, { version: 1, value: 'shipped' })
  assert.deepEqual(pair.readPrimary(), receipt)
  assert.deepEqual(pair.readFollower(), { version: 0, value: 'pending' })
  assert.equal(pair.pending(), 1)
  pair.deliver(0)
  assert.deepEqual(pair.readFollower(), receipt)
})

test('replicación: entregar una versión antigua después no hace retroceder', () => {
  const pair = replicaPair()
  pair.write('packed')
  pair.write('shipped')
  pair.deliver(1)
  pair.deliver(0)
  assert.deepEqual(pair.readFollower(), { version: 2, value: 'shipped' })
  assert.equal(pair.pending(), 0)
})

test('frescura: el token exige la versión propia sin inventar una respuesta actual', () => {
  const pair = replicaPair()
  const receipt = pair.write('shipped')
  assert.throws(() => pair.readFollower(receipt.version), /not_caught_up/)
  assert.deepEqual(pair.readFollower(), { version: 0, value: 'pending' })
  pair.deliver(0)
  assert.deepEqual(pair.readFollower(receipt.version), receipt)
})

test('modelo: sin entrega no hay progreso automático ni efectos en otra instancia', () => {
  const pair = replicaPair()
  pair.write('packed')
  for (let i = 0; i < 10; i++) assert.equal(pair.readFollower().version, 0)
  assert.equal(replicaPair().pending(), 0)
  assert.equal(Object.isFrozen(pair.readPrimary()), true)
})

test('validación: entrada, índice y token inválidos no cambian el modelo', () => {
  const pair = replicaPair()
  for (const value of ['', 42, null]) assert.throws(() => pair.write(value))
  pair.write('packed')
  for (const index of [-1, 1, 0.5]) assert.throws(() => pair.deliver(index))
  for (const token of [-1, NaN, '1']) assert.throws(() => pair.readFollower(token))
  assert.equal(pair.pending(), 1)
})
