export type Sample = { ms: number; status: number }

export function percentile(values: readonly number[], p: number): number | null {
  if (!Number.isFinite(p) || p <= 0 || p > 1) throw new RangeError('percentile')
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new RangeError('sample')
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil(p * sorted.length) - 1]!
}

export function summarize(samples: readonly Sample[], seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new RangeError('seconds')
  const distribution = (values: number[]) => ({ n: values.length,
    p50: percentile(values, 0.5), p95: percentile(values, 0.95), p99: percentile(values, 0.99) })
  const success = samples.filter((sample) => sample.status === 200)
  const failed = samples.filter((sample) => sample.status !== 200)
  return { requests: samples.length, successes: success.length, errors: failed.length,
    completedRps: samples.length / seconds, successfulRps: success.length / seconds,
    all: distribution(samples.map((s) => s.ms)), success: distribution(success.map((s) => s.ms)),
    failed: distribution(failed.map((s) => s.ms)) }
}

export type Histogram = { bounds: number[]; counts: number[] }
export function histogram(values: readonly number[], bounds: readonly number[]): Histogram {
  if (bounds.some((bound, i) => !Number.isFinite(bound) || bound < 0 || (i > 0 && bound <= bounds[i - 1]!)))
    throw new RangeError('bounds')
  percentile(values, 1)
  const counts = Array.from({ length: bounds.length + 1 }, () => 0)
  for (const value of values) {
    const index = bounds.findIndex((bound) => value <= bound)
    counts[index === -1 ? bounds.length : index]!++
  }
  return { bounds: [...bounds], counts }
}

export function mergeHistograms(a: Histogram, b: Histogram): Histogram {
  if (JSON.stringify(a.bounds) !== JSON.stringify(b.bounds)) throw new RangeError('different bounds')
  if ([a, b].some((h) => h.counts.length !== h.bounds.length + 1 || h.counts.some((n) => !Number.isInteger(n) || n < 0)))
    throw new RangeError('counts')
  return { bounds: [...a.bounds], counts: a.counts.map((count, i) => count + b.counts[i]!) }
}
