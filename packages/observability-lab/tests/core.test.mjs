import test from 'node:test'
import assert from 'node:assert/strict'
import { ROOT_CONTEXT, trace, SpanKind, TraceFlags } from '@opentelemetry/api'
import { createTracing, inject, extract, within } from '../src/tracing.ts'
import { operationLog } from '../src/logging.ts'

test('spans: árbol, eventos, recurso y cierre aun cuando falla la operación', async () => {
  const runtime = createTracing('test')
  try {
    await assert.rejects(within(runtime.tracer, 'parent', ROOT_CONTEXT, async (span) => {
      span.addEvent('job.accepted')
      await within(runtime.tracer, 'child', trace.setSpan(ROOT_CONTEXT, span), async () => {
        throw new Error('controlled failure')
      })
    }), /controlled failure/)
    await runtime.provider.forceFlush()
    const [child, parent] = runtime.spans
    assert.equal(child.parentSpanId, parent.spanId)
    assert.equal(child.traceId, parent.traceId)
    assert.equal(child.status.code, 2)
    assert.equal(parent.events[0].name, 'job.accepted')
    assert.equal(parent.service, 'test')
    assert.equal(runtime.spans.length, 2)
  } finally { await runtime.provider.shutdown() }
})

test('propagación: carrier W3C válido conserva trace y marca parent remoto', async () => {
  const runtime = createTracing('test')
  try {
    await within(runtime.tracer, 'send', ROOT_CONTEXT, async (span) => {
      const carrier = inject(trace.setSpan(ROOT_CONTEXT, span))
      assert.match(carrier.traceparent, /^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/)
      const parent = extract(carrier)
      assert.equal(trace.getSpanContext(parent).isRemote, true)
      const child = runtime.tracer.startSpan('receive', { kind: SpanKind.CONSUMER }, parent)
      assert.equal(child.spanContext().traceId, span.spanContext().traceId)
      child.end()
    })
    assert.equal(trace.getSpanContext(extract({ traceparent: 'invalid' })), undefined)
    assert.equal(trace.getSpanContext(extract({ traceparent: '00-' + '0'.repeat(32) + '-' + '0'.repeat(16) + '-01' })), undefined)
  } finally { await runtime.provider.shutdown() }
})

test('sampling: ParentBased respeta padre remoto no muestreado; sigue habiendo IDs', async () => {
  const runtime = createTracing('test')
  try {
    const parent = extract({ traceparent: '00-11111111111111111111111111111111-2222222222222222-00' })
    await within(runtime.tracer, 'not-exported', parent, async (span) => {
      assert.equal(span.isRecording(), false)
      assert.equal(span.spanContext().traceFlags, TraceFlags.NONE)
      const log = operationLog('job.finished', 'op-001', 'req-001', 'ok', trace.setSpan(parent, span))
      assert.equal(log.trace_id, '11111111111111111111111111111111')
    })
    await runtime.provider.forceFlush()
    assert.deepEqual(runtime.spans, [])
  } finally { await runtime.provider.shutdown() }
})

test('logs: allowlist, IDs validados y contexto explícito, sin body o secretos', () => {
  const ctx = extract({ traceparent: '00-11111111111111111111111111111111-2222222222222222-01' })
  const log = operationLog('job.finished', 'op-001', 'req-001', 'ok', ctx)
  assert.deepEqual(Object.keys(log).toSorted(), ['event', 'operation_id', 'request_id', 'result', 'span_id', 'trace_id'])
  assert.equal(log.span_id, '2222222222222222')
  assert.throws(() => operationLog('job.finished', 'contains-secret', 'req-001', 'ok', ctx))
  assert.equal(operationLog('job.finished', 'op-001', 'req-001', 'ok', ROOT_CONTEXT).trace_id, undefined)
})
