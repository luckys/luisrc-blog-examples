import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { lambdaAdapter } from '../src/catalogue.ts'
import { createCatalogueServer } from '../src/http.ts'

test('misma lectura en HTTP loopback real y evento Lambda v2 local, sin invocar AWS', async () => {
  const item = { id: 'book-1', name: 'Libro ficticio', priceCents: 10000 }
  const read = async (id) => id === item.id ? item : null
  const invoke = lambdaAdapter(read), server = createCatalogueServer(read)
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    for (const [method, path] of [['GET', '/catalogue/book-1'], ['GET', '/catalogue/missing'], ['POST', '/catalogue/book-1']]) {
      const event = await invoke({ rawPath: path, requestContext: { http: { method } } })
      const http = await fetch(origin + path, { method })
      assert.equal(http.status, event.statusCode); assert.deepEqual(await http.json(), JSON.parse(event.body))
      assert.equal(event.isBase64Encoded, false)
      if (http.status === 405) {
        assert.equal(http.headers.get('allow'), 'GET')
        assert.equal(event.headers.allow, 'GET')
      }
    }
  } finally { await new Promise((resolve) => server.close(resolve)) }
})

test('fallo del reader: ambos adaptadores responden 503, no un falso 404', async () => {
  const read = async () => { throw Error('fake_dependency_offline') }
  const invoke = lambdaAdapter(read), server = createCatalogueServer(read)
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  try {
    const event = await invoke({ rawPath: '/catalogue/book-1', requestContext: { http: { method: 'GET' } } })
    const http = await fetch(`http://127.0.0.1:${server.address().port}/catalogue/book-1`)
    assert.equal(event.statusCode, 503); assert.equal(http.status, 503)
    assert.deepEqual(await http.json(), JSON.parse(event.body))
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
