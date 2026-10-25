import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { startRouter } from '../scripts/router-fixture.mjs'

test('router real: IPC con revisión, flag impuesta por política y destinos loopback', async () => {
  const upstream = createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ flag: req.headers['x-lab-price-v2'] })) })
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening')
  const origin = `http://127.0.0.1:${upstream.address().port}`
  const router = await startRouter({ a: origin, b: origin, green: origin })
  try {
    let response = await fetch(router.origin, { headers: { 'x-lab-price-v2': '1' } })
    assert.equal((await response.json()).flag, '0')
    const next = { slots: ['green'], canaryPercent: 0, featureEnabled: true }
    const accepted = await router.route(next); assert.equal(accepted.ok, true)
    const stale = await router.route({ ...next, featureEnabled: false }, undefined, 0)
    assert.equal(stale.ok, false); assert.equal(stale.revision, accepted.revision); assert.deepEqual(stale.route, next)
    response = await fetch(router.origin); assert.equal((await response.json()).flag, '1')
    assert.equal(response.headers.get('X-Lab-Slot'), 'green')
    const invalid = await router.route(next, { a: 'https://example.com', b: origin, green: origin })
    assert.equal(invalid.ok, false); assert.equal(invalid.revision, accepted.revision)
    assert.equal((await fetch(router.origin, { method: 'POST' })).status, 405)
  } finally { await router.close(); await new Promise((resolve) => upstream.close(resolve)) }
})
