import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApi } from '../app/server.mjs'
test('HTTP: salud, configuración y fallo sin exponer el valor del Secret', async () => {
  let message = 'hello'
  const server = createApi({ readMessage: async () => { if (message === null) throw Error('unavailable'); return message }, credentialConfigured: true, podName: 'pod-local' })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const request = (path, method = 'GET') => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method })
  try {
    const response = await request('/catalogue'); assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { message: 'hello', pod: 'pod-local', credentialConfigured: true })
    message = null
    assert.equal((await request('/ready')).status, 503)
    assert.equal((await request('/live')).status, 200)
    const bad = await request('/catalogue', 'POST'); assert.equal(bad.status, 405); assert.equal(bad.headers.get('allow'), 'GET')
    assert.equal((await request('/missing')).status, 404)
  } finally { await new Promise((resolve) => server.close(resolve)) }
})

test('cliente de integración: envía el Host que selecciona la regla Ingress', async () => {
  const { createServer } = await import('node:http')
  const { requestCatalogue } = await import('../scripts/request.mjs')
  const server = createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ host: req.headers.host })) })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  try {
    const result = await requestCatalogue('http://127.0.0.1:' + server.address().port)
    assert.equal(result.status, 200); assert.equal(result.body.host, 'catalogue.lab.test')
    await assert.rejects(requestCatalogue('http://example.com'), /loopback/)
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
