import { summarize, type Sample } from './statistics.ts'
export type TimedSample = Sample & { at: string }

export function groupWindows(samples: readonly TimedSample[], seconds = 10) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new RangeError('window')
  if (samples.length === 0) return []
  const times = samples.map((sample) => Date.parse(sample.at))
  if (times.some((time) => !Number.isFinite(time))) throw new RangeError('time')
  const first = Math.min(...times)
  const last = Math.max(...times)
  const groups = new Map<number, TimedSample[]>()
  for (let i = 0; i < samples.length; i++) {
    const bucket = Math.floor((times[i]! - first) / (seconds * 1000))
    const group = groups.get(bucket) ?? []
    group.push(samples[i]!)
    groups.set(bucket, group)
  }
  return [...groups].sort(([a], [b]) => a - b).map(([bucket, rows]) => ({
    fromSecond: bucket * seconds, complete: last >= first + (bucket + 1) * seconds * 1000,
    ...summarize(rows, seconds),
  }))
}
