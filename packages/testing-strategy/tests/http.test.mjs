import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApi } from '../src/http.ts'
import { SqliteJobs } from '../src/sqlite.ts'

async function fixture(t, override) {
  const repository = new SqliteJobs(':memory:')
  await repository.insert('j-1')
  const server = createApi(override ?? repository)
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    repository.close()
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  const request = (path, command, expectedVersion) => fetch(origin + path, command === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command, expectedVersion }),
  })
  return { origin, request }
}

test('HTTP + SQLite: start, succeed, repetir y leer el estado confirmado', async (t) => {
  const { request } = await fixture(t)
  const started = await request('/jobs/j-1', 'start', 0)
  assert.equal(started.status, 200)
  assert.match(started.headers.get('content-type'), /^application\/json/)
  assert.deepEqual(await started.json(), { id: 'j-1', state: 'running', version: 1 })
  await request('/jobs/j-1', 'succeed', 1)
  const repeated = await request('/jobs/j-1', 'succeed', 2)
  assert.equal(repeated.status, 200)
  assert.deepEqual(await repeated.json(), { id: 'j-1', state: 'succeeded', version: 2 })
  assert.equal((await request('/jobs/j-1', 'fail', 2)).status, 409)
  assert.deepEqual(await (await request('/jobs/j-1')).json(), { id: 'j-1', state: 'succeeded', version: 2 })
})

test('HTTP: validación, ausencia, versión atrasada y método tienen respuestas distintas', async (t) => {
  const { request, origin } = await fixture(t)
  assert.equal((await request('/jobs/j-2')).status, 404)
  assert.equal((await request('/other')).status, 404)
  assert.equal((await request('/jobs/j-1', 'start', 99)).status, 409)
  for (const [command, version] of [['lose', 0], ['start', '0'], ['start', -1]])
    assert.equal((await request('/jobs/j-1', command, version)).status, 422)
  assert.equal((await fetch(origin + '/jobs/j-1', { method: 'DELETE' })).status, 405)
  const post = (body, type = 'application/json') => fetch(origin + '/jobs/j-1', {
    method: 'POST', headers: { 'content-type': type }, body,
  })
  assert.equal((await post('{')).status, 400)
  for (const body of ['null', '[]', '{}', '{"command":"start","expectedVersion":0,"state":"succeeded"}'])
    assert.equal((await post(body)).status, 422)
  assert.equal((await post('{}', 'text/plain')).status, 415)
  assert.equal((await post('x'.repeat(1025))).status, 413)
  assert.equal((await (await request('/jobs/j-1')).json()).state, 'queued')
})

test('HTTP: dos comandos con versión cero no reciben ambos éxito', async (t) => {
  const { request } = await fixture(t)
  const responses = await Promise.all([
    request('/jobs/j-1', 'start', 0), request('/jobs/j-1', 'cancel', 0),
  ])
  assert.deepEqual(responses.map((r) => r.status).toSorted(), [200, 409])
  const winner = await (await request('/jobs/j-1')).json()
  assert.equal(winner.version, 1)
  assert.ok(['running', 'cancelled'].includes(winner.state))
})

test('HTTP: fallo de almacenamiento devuelve error público sin detalles internos', async (t) => {
  const { request } = await fixture(t, {
    read: async () => { throw new Error('private database path') },
    compareAndSet: async () => false,
  })
  const response = await request('/jobs/j-1')
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'unexpected' })
})
