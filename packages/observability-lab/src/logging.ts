import { trace, isSpanContextValid } from '@opentelemetry/api'
import type { Context } from '@opentelemetry/api'

export function operationLog(event: 'job.accepted' | 'job.finished', operationId: string,
  requestId: string, result: 'accepted' | 'ok' | 'error', ctx: Context) {
  if (!/^op-\d{3,8}$/.test(operationId) || !/^req-\d{3,8}$/.test(requestId)) {
    throw new TypeError('fixture IDs required')
  }
  const span = trace.getSpanContext(ctx)
  const correlation = span && isSpanContextValid(span)
    ? { trace_id: span.traceId, span_id: span.spanId }
    : {}
  return { event, operation_id: operationId, request_id: requestId, result, ...correlation }
}
