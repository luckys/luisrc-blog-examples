import test from 'node:test'
import assert from 'node:assert/strict'
import { withFixture, waitUntil } from '../scripts/fixture.mjs'

test('incidente real del fixture: vivo no significa progreso; contiene, drena y verifica payloads', async () => {
  await withFixture(async ({ origin, control, pid }) => {
    const submit = async () => { const r = await fetch(origin + '/jobs', { method: 'POST' }); assert.equal(r.status, 202); return r.json() }
    await submit(); await submit()
    const baseline = await waitUntil(origin, (s) => s.completed === 2)
    assert.notEqual(baseline.worker.pid, pid)
    const introduced = await control('config', { batchSize: 0, expectedRevision: baseline.worker.config.revision })
    assert.equal(introduced.ok, true)
    await submit(); await submit(); await submit()
    const stalled = await waitUntil(origin, (s) => s.worker.ticks >= introduced.worker.ticks + 3 && s.queued === 3)
    assert.equal(stalled.completed, 2)
    assert.equal(stalled.worker.attempts, 2)
    assert.equal((await fetch(origin + '/live')).status, 200)
    await control('admission', { open: false })
    assert.equal((await fetch(origin + '/jobs', { method: 'POST' })).status, 503)
    assert.equal((await control('config', { batchSize: 2, expectedRevision: stalled.worker.config.revision })).ok, true)
    const drained = await waitUntil(origin, (s) => s.completed === 5 && s.queued === 0)
    assert.equal(drained.admissionOpen, false)
    assert.equal(drained.rejectedDuringPause, 1)
    for (const job of drained.jobs) { assert.equal(job.result, `report:${job.id}`); assert.equal(job.attempts, 1) }
  })
})

test('ruta corregida rechaza cero y mantiene trabajo nuevo; scope incorrecto no modifica estado', async () => {
  await withFixture(async ({ origin, control, instanceId }) => {
    const state = await waitUntil(origin, () => true)
    assert.equal((await control('config', { guarded: true, expectedRevision: state.worker.config.revision })).ok, true)
    const guarded = await waitUntil(origin, () => true)
    const rejected = await control('config', { batchSize: 0, expectedRevision: guarded.worker.config.revision })
    assert.equal(rejected.ok, false)
    assert.equal((await control('config', { batchSize: 1, expectedRevision: guarded.worker.config.revision }, instanceId + '-wrong')).ok, false)
    const after = await waitUntil(origin, () => true)
    assert.deepEqual(after.worker.config, guarded.worker.config)
    const request = await fetch(origin + '/jobs', { method: 'POST' })
    const job = await request.json()
    assert.equal(request.status, 202)
    const completed = await waitUntil(origin, (s) => s.completed === 1)
    assert.equal(completed.jobs[0].id, job.id)
    assert.equal(completed.jobs[0].result, `report:${job.id}`)
    assert.equal((await fetch(origin + '/no-route')).status, 404)
  })
})
