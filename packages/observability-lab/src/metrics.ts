import { trace, TraceFlags, isSpanContextValid } from '@opentelemetry/api'
import type { Context } from '@opentelemetry/api'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { MeterProvider, MetricReader, AggregationType, DataPointType, createAllowListAttributesProcessor } from '@opentelemetry/sdk-metrics'
import type { HistogramMetricData } from '@opentelemetry/sdk-metrics'

export const boundaries = [0.01, 0.025, 0.05, 0.1]
type Result = 'ok' | 'error'
type Exemplar = { result: Result; bucket: number; value: number; traceId: string; spanId: string }
class SnapshotReader extends MetricReader {
  protected async onForceFlush() {}
  protected async onShutdown() {}
}

export function createMetrics(service: string) {
  const reader = new SnapshotReader()
  const provider = new MeterProvider({
    resource: resourceFromAttributes({ 'service.name': service }), readers: [reader],
    views: [{
      instrumentName: 'job.duration',
      attributesProcessors: [createAllowListAttributesProcessor(['result'])],
      aggregation: { type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM, options: { boundaries } },
    }],
  })
  const histogram = provider.getMeter('observability-lab').createHistogram('job.duration', { unit: 's' })
  // El SDK JS 3.0.0 no exporta exemplars. Este reservoir es propio y explícito.
  // Última observación sampled por bucket/resultado: como máximo diez entradas.
  const reservoir = new Map<string, Exemplar>()
  function record(seconds: number, result: Result, ctx: Context) {
    if (!Number.isFinite(seconds) || seconds < 0 || !['ok', 'error'].includes(result)) {
      throw new TypeError('invalid measurement')
    }
    histogram.record(seconds, { result }, ctx)
    const span = trace.getSpanContext(ctx)
    if (!span || !isSpanContextValid(span) || !(span.traceFlags & TraceFlags.SAMPLED)) return
    const found = boundaries.findIndex((upper) => seconds <= upper)
    const bucket = found < 0 ? boundaries.length : found
    reservoir.set(`${result}:${bucket}`, { result, bucket, value: seconds, traceId: span.traceId, spanId: span.spanId })
  }
  async function snapshot() {
    const collected = await reader.collect()
    if (collected.errors.length) throw new Error('metrics collection failed')
    const data = collected.resourceMetrics.scopeMetrics.flatMap((scope) => scope.metrics)
      .find((metric): metric is HistogramMetricData => metric.descriptor.name === 'job.duration' && metric.dataPointType === DataPointType.HISTOGRAM)
    return { histogram: data?.dataPoints ?? [], exemplars: [...reservoir.values()] }
  }
  function openMetrics(data: Awaited<ReturnType<typeof snapshot>>) {
    const lines = ['# TYPE job_duration_seconds histogram', '# UNIT job_duration_seconds seconds']
    for (const point of data.histogram) {
      const result = String(point.attributes.result)
      let cumulative = 0
      for (const [bucket, count] of point.value.buckets.counts.entries()) {
        cumulative += count
        const upper = boundaries[bucket] ?? '+Inf'
        const exemplar = data.exemplars.find((entry) => entry.result === result && entry.bucket === bucket)
        const suffix = exemplar ? ` # {trace_id="${exemplar.traceId}",span_id="${exemplar.spanId}"} ${exemplar.value}` : ''
        lines.push(`job_duration_seconds_bucket{result="${result}",le="${upper}"} ${cumulative}${suffix}`)
      }
      lines.push(`job_duration_seconds_count{result="${result}"} ${point.value.count}`)
      lines.push(`job_duration_seconds_sum{result="${result}"} ${point.value.sum}`)
    }
    return [...lines, '# EOF', ''].join('\n')
  }
  return { provider, record, snapshot, openMetrics }
}
