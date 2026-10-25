import { burnRate, validateCounts } from './budget.ts'
import { WindowIndex } from './windows.ts'
export type Rule = { id: string; longMinutes: number; shortMinutes: number; threshold: number; severity: 'page' | 'ticket'; minLong: number; minShort: number }
export const rules: Rule[] = [
  { id: 'fast', longMinutes: 60, shortMinutes: 5, threshold: 14.4, severity: 'page', minLong: 1000, minShort: 50 },
  { id: 'slow', longMinutes: 360, shortMinutes: 30, threshold: 6, severity: 'page', minLong: 1000, minShort: 50 },
  { id: 'ticket', longMinutes: 4320, shortMinutes: 360, threshold: 1, severity: 'ticket', minLong: 1000, minShort: 50 },
]
export function evaluateAlerts(index: WindowIndex, now: number, targetPpm: number, selectedRules: readonly Rule[] = rules) {
  validateCounts(0, 0, targetPpm)
  const pairs = selectedRules.map((rule) => {
    if (!Number.isInteger(rule.longMinutes) || !Number.isInteger(rule.shortMinutes) || rule.shortMinutes <= 0 || rule.longMinutes < rule.shortMinutes || !Number.isFinite(rule.threshold) || rule.threshold <= 0) throw new RangeError('rule')
    if (now < rule.longMinutes) return { id: rule.id, severity: rule.severity, state: 'missing_data', longBurn: null, shortBurn: null }
    const long = index.read(now - rule.longMinutes, now)
    const short = index.read(now - rule.shortMinutes, now)
    const longBurn = long.complete ? burnRate(long.total, long.bad, targetPpm) : null
    const shortBurn = short.complete ? burnRate(short.total, short.bad, targetPpm) : null
    const state = !long.complete || !short.complete ? 'missing_data'
      : long.total === 0 || short.total === 0 ? 'no_traffic'
        : long.total < rule.minLong || short.total < rule.minShort ? 'insufficient_volume'
          : longBurn! > rule.threshold && shortBurn! > rule.threshold ? 'firing' : 'ok'
    return { id: rule.id, severity: rule.severity, state, longBurn, shortBurn }
  })
  const active = pairs.filter((pair) => pair.state === 'firing')
  const severity = active.some((pair) => pair.severity === 'page') ? 'page' : active.length ? 'ticket' : 'none'
  return { severity, pairs }
}
