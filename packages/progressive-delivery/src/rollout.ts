import { createHash } from 'node:crypto'
export type Slot = 'a' | 'b' | 'green'
export type Route = { slots: Slot[]; canaryPercent: number; featureEnabled: boolean }
export type Sample = { total: number; bad: number }

export function validateRoute(value: unknown): Route {
  if (!value || typeof value !== 'object') throw Error('invalid_route')
  const route = value as Route
  if (!Array.isArray(route.slots) || !route.slots.length || route.slots.length > 3
    || route.slots.some((s) => !['a', 'b', 'green'].includes(s))
    || new Set(route.slots).size !== route.slots.length || !Number.isInteger(route.canaryPercent)
    || route.canaryPercent < 0 || route.canaryPercent > 100 || typeof route.featureEnabled !== 'boolean') throw Error('invalid_route')
  return { slots: [...route.slots], canaryPercent: route.canaryPercent, featureEnabled: route.featureEnabled }
}

export function bucket(key: string) {
  return createHash('sha256').update(key).digest().readUInt32BE(0) % 100
}

export function chooseSlot(route: Route, key: string, sequence: number): Slot {
  if (bucket(key) < route.canaryPercent) return 'green'
  return route.slots[sequence % route.slots.length]!
}

export function rolloutDecision(candidate: Sample, control: Sample) {
  for (const sample of [candidate, control])
    if (!Number.isSafeInteger(sample.total) || !Number.isSafeInteger(sample.bad)
      || sample.bad < 0 || sample.total < sample.bad) throw Error('invalid_sample')
  if (candidate.total < 20 || control.total < 20) return 'insufficient'
  if (control.bad / control.total > 0.01) return 'control_unhealthy'
  return candidate.bad / candidate.total > 0.01 ? 'rollback' : 'eligible_for_review'
}
