export const SCALE = 1_000_000
export function validateCounts(total: number, bad: number, targetPpm: number) {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(total * SCALE) ||
    !Number.isSafeInteger(bad) || bad < 0 || bad > total ||
    !Number.isInteger(targetPpm) || targetPpm <= 0 || targetPpm >= SCALE) throw new RangeError('invalid budget inputs')
}
export function summarizeBudget(total: number, bad: number, targetPpm: number) {
  validateCounts(total, bad, targetPpm)
  const allowed = total * (SCALE - targetPpm) / SCALE
  return {
    total, bad, allowed, remaining: allowed - bad,
    sli: total === 0 ? null : (total - bad) / total,
    spentFraction: total === 0 ? null : bad / allowed,
    compliant: total === 0 ? null : bad * SCALE <= total * (SCALE - targetPpm),
  }
}
export function burnRate(total: number, bad: number, targetPpm: number): number | null {
  validateCounts(total, bad, targetPpm)
  if (total === 0) return null
  return (bad / total) / ((SCALE - targetPpm) / SCALE)
}
export function thresholdFor(fraction: number, periodHours: number, windowHours: number) {
  if (![fraction, periodHours, windowHours].every(Number.isFinite) || fraction <= 0 || fraction > 1 ||
    periodHours <= 0 || windowHours <= 0 || windowHours > periodHours) throw new RangeError('invalid threshold')
  return fraction * periodHours / windowHours
}
export function projectedHoursToExhaustion(remaining: number, requestsPerHour: number, errorRatio: number): number | null {
  if (![remaining, requestsPerHour, errorRatio].every(Number.isFinite) || requestsPerHour < 0 || errorRatio < 0 || errorRatio > 1) throw new RangeError('invalid projection')
  if (remaining <= 0) return 0
  const badPerHour = requestsPerHour * errorRatio
  return badPerHour === 0 ? null : remaining / badPerHour
}
