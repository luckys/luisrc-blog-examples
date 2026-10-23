import test from 'node:test'
import assert from 'node:assert/strict'
import { withServer } from '../scripts/child-fixture.mjs'

test('HTTP real: proceso distinto, cuerpo y rutas limitadas', async () => {
  await withServer(async ({ url, pid, metrics }) => {
    assert.notEqual(pid, process.pid)
    const response = await fetch(`${url}/work`)
    assert.equal(response.status, 200)
    assert.equal(await response.text(), 'ok')
    const a = await (await fetch(`${url}/cpu/slow`)).json()
    const b = await (await fetch(`${url}/cpu/indexed`)).json()
    assert.equal(a.checksum, b.checksum)
    assert.equal((await fetch(`${url}/missing`)).status, 404)
    assert.equal((await fetch(`${url}/work`, { method: 'POST' })).status, 405)
    assert.equal((await metrics()).active, 0)
  })
})

test('admisión: cap ocho se respeta y recupera tras una ráfaga', async () => {
  await withServer(async ({ url, metrics }) => {
    const statuses = await Promise.all(Array.from({ length: 24 }, async () => {
      const response = await fetch(`${url}/work`)
      await response.text()
      return response.status
    }))
    assert.ok(statuses.includes(503))
    const current = await metrics()
    assert.equal(current.maxActive, 8)
    assert.equal(current.active, 0)
    assert.equal(current.accepted + current.rejected, 24)
    const response = await fetch(`${url}/work`)
    assert.equal(response.status, 200)
    await response.text()
  })
})
