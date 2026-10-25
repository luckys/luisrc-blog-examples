import test from 'node:test'
import assert from 'node:assert/strict'
import { ROOT_CONTEXT, trace } from '@opentelemetry/api'
import { createMetrics } from '../src/metrics.ts'
import { createTracing, within, extract } from '../src/tracing.ts'

test('métricas OTel: cien observaciones no crean series adicionales', async () => {
  const m = createMetrics('test')
  try {
    for (let i = 0; i < 100; i++) m.record(i % 2 ? 0.02 : 0.06, 'ok', ROOT_CONTEXT)
    m.record(0.1, 'error', ROOT_CONTEXT)
    const snapshot = await m.snapshot()
    assert.equal(snapshot.histogram.length, 2)
    const ok = snapshot.histogram.find((point) => point.attributes.result === 'ok')
    assert.deepEqual(ok.value.buckets.counts, [0, 50, 0, 50, 0])
    assert.equal(ok.value.count, 100)
    assert.deepEqual(Object.keys(ok.attributes), ['result'])
    assert.equal(snapshot.exemplars.length, 0)
    assert.ok(Math.abs(ok.value.sum - 4) < 1e-10)
    assert.throws(() => m.record(-1, 'ok', ROOT_CONTEXT))
    assert.throws(() => m.record(0.01, 'arbitrary', ROOT_CONTEXT))
  } finally { await m.provider.shutdown() }
})

test('exemplar: último sampled por bucket/resultado; nunca un label de identidad', async () => {
  const m = createMetrics('test')
  const t = createTracing('test')
  try {
    await within(t.tracer, 'sample', ROOT_CONTEXT, async (span) => {
      const ctx = trace.setSpan(ROOT_CONTEXT, span)
      m.record(0.02, 'ok', ctx)
      m.record(0.025, 'ok', ctx)
      m.record(0.06, 'error', ctx)
    })
    const unsampled = extract({ traceparent: '00-11111111111111111111111111111111-2222222222222222-00' })
    m.record(0.02, 'ok', unsampled)
    const snapshot = await m.snapshot()
    assert.equal(snapshot.exemplars.length, 2)
    assert.equal(snapshot.exemplars[0].value, 0.025)
    assert.equal(snapshot.exemplars[0].spanId, t.spans[0].spanId)
    const text = m.openMetrics(snapshot)
    assert.match(text, /job_duration_seconds_bucket\{result="ok",le="0.025"\} 3 # \{trace_id="[a-f0-9]{32}",span_id="[a-f0-9]{16}"\} 0.025/)
    assert.match(text, /job_duration_seconds_count\{result="ok"\} 3/)
    assert.ok(text.endsWith('# EOF\n'))
    assert.doesNotMatch(text, /bucket\{[^\n}]*trace_id/)
  } finally { await m.provider.shutdown(); await t.provider.shutdown() }
})
