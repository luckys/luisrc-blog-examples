import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { requestJson } from '../scripts/request.mjs'
test('cliente: Host explícito, parseo y límites a origen loopback', async () => {
  const server = createServer((req, res) => res.end(JSON.stringify({ host: req.headers.host })))
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  try {
    const origin = 'http://127.0.0.1:' + server.address().port
    assert.equal((await requestJson(origin)).body.host, 'catalogue.lab.test')
    assert.equal((await requestJson(origin, '/catalogue', 'wrong.lab.test')).body.host, 'wrong.lab.test')
    await assert.rejects(requestJson('http://example.com'), /loopback/)
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
