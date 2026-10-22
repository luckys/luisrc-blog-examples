import test from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import { parsePayment } from '../src/parser.ts'
import { assertRecovery } from './recovery-fixture.mjs'

test('parser: ejemplos válidos, límites y entradas adversas explícitas', () => {
  const bytes = Buffer.from('{"id":"payment-1","amountMinor":1250}')
  assert.deepEqual(parsePayment(bytes), { id: 'payment-1', amountMinor: 1250 })
  for (const raw of ['null', '[]', '{}', '{', '{"id":"payment-1","amountMinor":0}',
    '{"id":"payment-1","amountMinor":1e309}', '{"id":"payment-1","amountMinor":"1"}'])
    assert.equal(parsePayment(Buffer.from(raw)), null)
  assert.equal(parsePayment(new Uint8Array([0xc3, 0x28])), null)
  assert.equal(parsePayment(new Uint8Array(257)), null)
})

test('fuzzing de bytes acotado: el parser no lanza y todo éxito satisface el contrato', () => {
  fc.assert(fc.property(fc.uint8Array({ maxLength: 300 }), (bytes) => {
    const parsed = parsePayment(bytes)
    if (parsed === null) return
    assert.ok(bytes.length <= 256)
    assert.match(parsed.id, /^payment-[0-9]{1,3}$/)
    assert.ok(Number.isInteger(parsed.amountMinor) && parsed.amountMinor >= 1 && parsed.amountMinor <= 1_000_000)
    assert.deepEqual(parsePayment(Buffer.from(JSON.stringify(parsed))), parsed)
  }), { seed: 5704, numRuns: 1000 })
})

test('generador estructurado entra en el camino válido, no solo rechazo de ruido', () => {
  fc.assert(fc.property(fc.record({
    id: fc.integer({ min: 0, max: 999 }).map((id) => `payment-${id}`),
    amountMinor: fc.integer({ min: 1, max: 1_000_000 }),
  }), (input) => {
    assert.deepEqual(parsePayment(Buffer.from(JSON.stringify(input))), {
      id: input.id, amountMinor: input.amountMinor,
    })
  }), { seed: 5705, numRuns: 300 })
})

test('fault injection: un objeto servicio nuevo conserva clave y evidencia del proveedor', () => {
  fc.assert(fc.property(fc.array(
    fc.constantFrom('before-effect', 'after-effect', 'after-confirm', 'none'),
    { maxLength: 12 },
  ), (faults) => assertRecovery(faults)), { seed: 5706, numRuns: 500 })
})

test('respuesta perdida: retry tras efecto no duplica y recuperación confirma', () => {
  assertRecovery(['after-effect', 'after-effect', 'none'])
  assert.throws(() => assertRecovery(['after-effect'], false), assert.AssertionError)
})
