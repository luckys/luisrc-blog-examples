import test from 'node:test'
import assert from 'node:assert/strict'
import { priceForResponse, parseProduct } from '../src/product.ts'
import { bucket, chooseSlot, rolloutDecision, validateRoute } from '../src/rollout.ts'
import { checkSmoke, imagePolicy } from '../src/gates.ts'

test('productos: no acepta centimos ambiguos, extras ni identificadores ajenos al contrato', () => {
  assert.deepEqual(parseProduct({ id: 'book-1', name: 'Libro', priceCents: 10000 }), { id: 'book-1', name: 'Libro', priceCents: 10000 })
  for (const value of [null, [], {}, { id: 'ok', name: 'Libro', priceCents: 0.1 },
    { id: '../etc', name: 'Libro', priceCents: 100 }, { id: 'ok', name: 'Libro', priceCents: -1 },
    { id: 'ok', name: 'Libro', priceCents: 100, admin: true }]) assert.throws(() => parseProduct(value))
})

test('flag: baseline conserva unidades y candidato contiene una regresión deliberada solo al activarlo', () => {
  assert.equal(priceForResponse(10000, false, 1), 10000)
  assert.equal(priceForResponse(10000, false, 100), 10000)
  assert.equal(priceForResponse(10000, true, 100), 100)
})

test('smoke: 200 y shape correcto no bastan si las unidades son incorrectas', () => {
  assert.equal(checkSmoke({ status: 200, body: { id: 'book-1', priceCents: 10000 } }, 'book-1', 10000), true)
  for (const response of [{ status: 500, body: {} }, { status: 200, body: { id: 'other', priceCents: 10000 } },
    { status: 200, body: { id: 'book-1', priceCents: 100 } }, { status: 200, body: { id: 'book-1', priceCents: '10000' } }])
    assert.equal(checkSmoke(response, 'book-1', 10000), false)
})

test('routing: cohortes estables, control round robin y porcentajes acotados', () => {
  const route = validateRoute({ slots: ['a', 'b'], canaryPercent: 10, featureEnabled: true })
  for (const key of ['alice', 'bob', 'carol']) {
    assert.equal(bucket(key), bucket(key)); assert.ok(bucket(key) >= 0 && bucket(key) < 100)
    const chosen = chooseSlot(route, key, 0)
    assert.equal(chosen === 'green', bucket(key) < 10)
  }
  assert.equal(chooseSlot({ ...route, canaryPercent: 0 }, 'alice', 0), 'a')
  assert.equal(chooseSlot({ ...route, canaryPercent: 0 }, 'alice', 1), 'b')
  for (const value of [{ ...route, canaryPercent: -1 }, { ...route, canaryPercent: 101 },
    { ...route, canaryPercent: 1.5 }, { ...route, slots: [] }, { ...route, slots: ['evil'] },
    { ...route, featureEnabled: 'yes' }]) assert.throws(() => validateRoute(value))
})

test('canary: no promueve con muestras escasas ni con un control que también falla', () => {
  assert.equal(rolloutDecision({ total: 0, bad: 0 }, { total: 180, bad: 0 }), 'insufficient')
  assert.equal(rolloutDecision({ total: 20, bad: 20 }, { total: 180, bad: 0 }), 'rollback')
  assert.equal(rolloutDecision({ total: 20, bad: 0 }, { total: 180, bad: 0 }), 'eligible_for_review')
  assert.equal(rolloutDecision({ total: 20, bad: 20 }, { total: 180, bad: 10 }), 'control_unhealthy')
})

test('política de image: un gate local rechaza root y bases no fijadas', () => {
  assert.equal(imagePolicy({ user: 'node', base: 'node:24@sha256:' + 'a'.repeat(64), high: 0, critical: 0 }), true)
  assert.equal(imagePolicy({ user: 'root', base: 'node:24@sha256:' + 'a'.repeat(64), high: 0, critical: 0 }), false)
  assert.equal(imagePolicy({ user: 'node', base: 'node:latest', high: 0, critical: 0 }), false)
  assert.equal(imagePolicy({ user: 'node', base: 'node:24@sha256:' + 'a'.repeat(64), high: 1, critical: 0 }), false)
})
