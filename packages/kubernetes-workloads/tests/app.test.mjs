import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { parseSettings, startupDelay, createApi } from '../app/server.mjs'

test('configuración: exige mensaje y flags explícitos, sin coerción de strings', () => {
  assert.deepEqual(parseSettings('{"message":"hello","ready":true,"live":false}'), { message: 'hello', ready: true, live: false })
  for (const input of ['{}', '{"message":"x","ready":"false","live":true}', '[]', 'not json']) assert.throws(() => parseSettings(input))
  assert.equal(startupDelay('8000'), 8000)
  for (const value of ['-1', 'Infinity', '12001', 'abc']) assert.throws(() => startupDelay(value))
})

test('probes: startup, readiness y liveness expresan estados diferentes', async () => {
  let initialized = false, settings = { message: 'volume-v1', ready: true, live: true }
  const server = createApi({ settings: async () => settings, initialized: () => initialized, envMessage: 'env-v1', credentialConfigured: true, version: 'v1', pod: 'test-pod' })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const get = (path) => fetch('http://127.0.0.1:' + server.address().port + path)
  try {
    assert.equal((await get('/startup')).status, 503); assert.equal((await get('/live')).status, 503)
    initialized = true
    assert.equal((await get('/startup')).status, 200)
    settings.ready = false
    assert.equal((await get('/ready')).status, 503); assert.equal((await get('/live')).status, 200)
    settings.ready = true; settings.live = false
    assert.equal((await get('/live')).status, 503)
    settings.live = true
    const result = await get('/catalogue'); assert.equal(result.status, 200)
    assert.deepEqual(await result.json(), { message: 'volume-v1', envMessage: 'env-v1', version: 'v1', pod: 'test-pod', credentialConfigured: true })
    assert.equal((await get('/work?ms=41')).status, 400)
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
