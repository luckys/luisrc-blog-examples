import { context, trace, ROOT_CONTEXT, SpanStatusCode } from '@opentelemetry/api'
import type { Context, Span, SpanOptions, Tracer } from '@opentelemetry/api'
import { W3CTraceContextPropagator, ExportResultCode } from '@opentelemetry/core'
import type { ExportResult } from '@opentelemetry/core'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { TracerProvider, SimpleSpanProcessor, ParentBasedSampler, AlwaysOnSampler, AlwaysOffSampler } from '@opentelemetry/sdk-trace'
import type { ReadableSpan } from '@opentelemetry/sdk-trace'

export type RecordedSpan = ReturnType<typeof serializeSpan>
const milliseconds = (time: readonly [number, number]) => time[0] * 1000 + time[1] / 1e6
function serializeSpan(span: ReadableSpan) {
  return {
    name: span.name, service: String(span.resource.attributes['service.name']),
    traceId: span.spanContext().traceId, spanId: span.spanContext().spanId,
    parentSpanId: span.parentSpanContext?.spanId ?? null,
    parentRemote: span.parentSpanContext?.isRemote ?? false,
    kind: span.kind, startMs: milliseconds(span.startTime), durationMs: milliseconds(span.duration),
    status: span.status, attributes: span.attributes,
    events: span.events.map((event) => ({ name: event.name, attributes: event.attributes ?? {} })),
    links: span.links.map((link) => ({ traceId: link.context.traceId, spanId: link.context.spanId })),
  }
}

export function createTracing(service: string, sampled = true) {
  const spans: RecordedSpan[] = []
  const exporter = {
    export(batch: ReadableSpan[], done: (result: ExportResult) => void) {
      spans.push(...batch.map(serializeSpan))
      done({ code: ExportResultCode.SUCCESS })
    },
    async shutdown() {},
  }
  const provider = new TracerProvider({
    resource: resourceFromAttributes({ 'service.name': service }),
    sampler: new ParentBasedSampler({ root: sampled ? new AlwaysOnSampler() : new AlwaysOffSampler() }),
    spanProcessors: [new SimpleSpanProcessor({ exporter })],
  })
  return { provider, tracer: provider.getTracer('observability-lab', '1.0.0'), spans }
}

const propagator = new W3CTraceContextPropagator()
const setter = { set: (carrier: Record<string, string>, key: string, value: string) => { carrier[key] = value } }
const getter = {
  keys: (carrier: Record<string, string>) => Object.keys(carrier),
  get: (carrier: Record<string, string>, key: string) => carrier[key],
}
export function inject(parent: Context): Record<string, string> {
  const carrier: Record<string, string> = {}
  propagator.inject(parent, carrier, setter)
  return carrier
}
export function extract(carrier: Record<string, string>): Context {
  return propagator.extract(ROOT_CONTEXT, carrier, getter)
}

export async function within<T>(tracer: Tracer, name: string, parent: Context,
  work: (span: Span) => Promise<T>, options: SpanOptions = {}): Promise<T> {
  const span = tracer.startSpan(name, options, parent)
  try {
    return await context.with(trace.setSpan(parent, span), () => work(span))
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR })
    // La causa pertenece al vocabulario del fixture, no a mensajes de error arbitrarios.
    span.addEvent('job.failure', { 'error.type': 'controlled_failure' })
    throw error
  } finally {
    span.end()
  }
}
