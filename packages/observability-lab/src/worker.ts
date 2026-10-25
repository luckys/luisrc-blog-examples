import { context, trace, ROOT_CONTEXT, SpanKind } from '@opentelemetry/api'
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'
import { setTimeout as delay } from 'node:timers/promises'
import { createTracing, within, extract } from './tracing.ts'
import { operationLog } from './logging.ts'
import { createMetrics } from './metrics.ts'

export type Envelope = { operationId: string; requestId: string; scenario: string; metadata: Record<string, string> }
const manager = new AsyncLocalStorageContextManager().enable()
context.setGlobalContextManager(manager)
const telemetry = createTracing('jobs-worker')
const metrics = createMetrics('jobs-worker')
const logs: ReturnType<typeof operationLog>[] = []
let queue = Promise.resolve()

async function processJob(message: Envelope) {
  const extracted = extract(message.metadata)
  const linked = message.scenario === 'link'
  const spanContext = trace.getSpanContext(extracted)
  let result: 'ok' | 'error' = 'ok'
  await within(telemetry.tracer, 'jobs process', linked ? ROOT_CONTEXT : extracted, async (span) => {
    const started = performance.now()
    try {
      await delay(20)
      if (message.scenario === 'fail') throw new Error('controlled failure')
    } catch (error) {
      result = 'error'
      throw error
    } finally {
      const ctx = trace.setSpan(extracted, span)
      metrics.record((performance.now() - started) / 1000, result, ctx)
      logs.push(operationLog('job.finished', message.operationId, message.requestId, result, ctx))
    }
  }, {
    kind: SpanKind.CONSUMER,
    attributes: { 'lab.operation_id': message.operationId },
    links: linked && spanContext ? [{ context: spanContext }] : [],
  }).catch(() => { /* Fallo controlado: se informa como resultado del job. */ })
  await telemetry.provider.forceFlush()
  const snapshot = await metrics.snapshot()
  process.send?.({ type: 'finished', operationId: message.operationId, result,
    spans: telemetry.spans.splice(0), logs: logs.splice(0), metrics: snapshot,
    openMetrics: metrics.openMetrics(snapshot), workerPid: process.pid })
}

process.on('message', (message: Envelope | { type: 'shutdown' }) => {
  if ('type' in message) {
    queue.finally(async () => {
      await telemetry.provider.shutdown(); await metrics.provider.shutdown()
      manager.disable(); process.disconnect?.()
    })
    return
  }
  queue = queue.then(() => processJob(message)).catch((error) => { console.error(error); process.exitCode = 1 })
})
process.send?.({ type: 'ready', workerPid: process.pid })
