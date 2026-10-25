import test from 'node:test'
import assert from 'node:assert/strict'
import { withServer, waitForJobs } from '../scripts/fixture.mjs'

test('HTTP + IPC: contexto sobrevive tres spans; worker asíncrono y PID distinto', async () => {
  await withServer(async ({ origin, pid }) => {
    const response = await fetch(`${origin}/jobs`, { method: 'POST', headers: { traceparent: '00-11111111111111111111111111111111-2222222222222222-01' }, body: JSON.stringify({ scenario: 'ok' }) })
    assert.equal(response.status, 202)
    const body = await response.json()
    assert.equal(body.status, 'accepted')
    const state = await waitForJobs(origin, 1)
    assert.notEqual(state.workerPid, pid)
    assert.equal(state.apiPid, pid)
    assert.equal(state.jobs[0].status, 'ok')
    assert.equal(state.spans.length, 3)
    const server = state.spans.find((span) => span.name === 'POST /jobs')
    const publish = state.spans.find((span) => span.name === 'jobs publish')
    const worker = state.spans.find((span) => span.name === 'jobs process')
    assert.equal(server.parentSpanId, '2222222222222222')
    assert.equal(publish.parentSpanId, server.spanId)
    assert.equal(worker.parentSpanId, publish.spanId)
    assert.ok(state.spans.every((span) => span.traceId === '11111111111111111111111111111111'))
    assert.equal(worker.parentRemote, true)
    assert.equal(state.logs.length, 2)
    assert.equal(state.logs[0].request_id, state.logs[1].request_id)
    assert.notEqual(state.logs[0].span_id, state.logs[1].span_id)
    assert.equal(state.metrics.histogram[0].value.count, 1)
    assert.equal(state.metrics.exemplars[0].spanId, worker.spanId)
    assert.equal((await fetch(origin + '/jobs')).status, 405)
    assert.equal((await fetch(origin + '/unknown')).status, 404)
  })
})

test('fallo, carrier perdido, link y sampling dejan evidencias diferentes', async () => {
  await withServer(async ({ origin }) => {
    for (const scenario of ['fail', 'broken', 'link', 'unsampled']) {
      const response = await fetch(origin + '/jobs', { method: 'POST', body: JSON.stringify({ scenario }), headers: { traceparent: `00-11111111111111111111111111111111-2222222222222222-${scenario === 'unsampled' ? '00' : '01'}` } })
      assert.equal(response.status, 202)
    }
    const state = await waitForJobs(origin, 4)
    const byOperation = (id) => state.spans.filter((span) => span.attributes['lab.operation_id'] === id)
    const failed = byOperation('op-001').find((span) => span.name === 'jobs process')
    assert.equal(failed.status.code, 2)
    assert.equal(state.jobs[0].status, 'error')
    const broken = byOperation('op-002')
    assert.equal(new Set(broken.map((span) => span.traceId)).size, 2)
    const linked = byOperation('op-003').find((span) => span.name === 'jobs process')
    assert.equal(linked.parentSpanId, null)
    assert.equal(linked.links[0].traceId, '11111111111111111111111111111111')
    assert.deepEqual(byOperation('op-004'), [])
    assert.equal(state.logs.filter((log) => log.operation_id === 'op-004').length, 2)
    assert.equal(state.metrics.histogram.reduce((n, point) => n + point.value.count, 0), 4)
    const metrics = await fetch(origin + '/metrics')
    assert.match(metrics.headers.get('content-type'), /application\/openmetrics-text/)
    assert.match(await metrics.text(), /# EOF/)
  })
})

test('dos solicitudes concurrentes no comparten contexto ni registran entradas sensibles', async () => {
  await withServer(async ({ origin }) => {
    await Promise.all(['1', '3'].map((digit) => fetch(origin + '/jobs', {
      method: 'POST', headers: { authorization: 'fixture-secret-not-real', traceparent: `00-${digit.repeat(32)}-2222222222222222-01` },
      body: JSON.stringify({ scenario: 'ok', email: 'private@example.invalid' }),
    })))
    const state = await waitForJobs(origin, 2)
    for (const job of state.jobs) {
      const spans = state.spans.filter((span) => span.attributes['lab.operation_id'] === job.operationId)
      assert.equal(new Set(spans.map((span) => span.traceId)).size, 1)
      assert.equal(spans.length, 3)
    }
    assert.equal(new Set(state.spans.map((span) => span.traceId)).size, 2)
    assert.doesNotMatch(JSON.stringify(state), /fixture-secret-not-real|private@example/)
  })
})
