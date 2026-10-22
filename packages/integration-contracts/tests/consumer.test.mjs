import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { rm } from 'node:fs/promises'
import { fetchReceipt } from '../src/consumer.ts'

process.env.PACT_DO_NOT_TRACK = '1'
const { Pact, Matchers } = await import('@pact-foundation/pact')
// Solo este artefacto generado, no contratos de otros consumidores.
await rm(new URL('../contracts/ReceiptWidget-OrdersApi.json', import.meta.url), { force: true })

const pact = new Pact({
  consumer: 'ReceiptWidget', provider: 'OrdersApi', host: '127.0.0.1',
  dir: fileURLToPath(new URL('../contracts/', import.meta.url)), logLevel: 'error',
})

test('consumidor real contra mock Pact: importe requerido y estado paid', async () => {
  await pact.addInteraction()
    .given('a paid order exists')
    .uponReceiving('the receipt widget requests order o-1')
    .withRequest('GET', '/orders/o-1')
    .willRespondWith(200, (builder) => {
      builder.headers({ 'Content-Type': 'application/json' })
      builder.jsonBody({ id: 'o-1', amountMinor: Matchers.integer(1250), currency: 'EUR', status: 'paid' })
    })
    .executeTest(async (mock) => {
      assert.deepEqual(await fetchReceipt(mock.url), { id: 'o-1', amountMinor: 1250, currency: 'EUR', status: 'paid' })
    })
})

test('consumidor real contra mock Pact: ausencia no es un recibo vacío', async () => {
  await pact.addInteraction()
    .given('no orders exist')
    .uponReceiving('the receipt widget requests missing order o-2')
    .withRequest('GET', '/orders/o-2')
    .willRespondWith(404, (builder) => {
      builder.headers({ 'Content-Type': 'application/json' })
      builder.jsonBody({ error: 'not_found' })
    })
    .executeTest(async (mock) => {
      assert.equal(await fetchReceipt(mock.url, 'o-2'), null)
    })
})
