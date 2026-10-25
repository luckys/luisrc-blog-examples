export type Operation = { id: string; createdAt: number; finishedAt: number | null; outcome: 'completed' | 'rejected' | 'failed' | null }
export function classifyCohorts(operations: readonly Operation[], now: number, deadlineMinutes: number) {
  if (!Number.isFinite(now) || !Number.isFinite(deadlineMinutes) || deadlineMinutes <= 0) throw new RangeError('clock')
  const seen = new Set<string>()
  let eligible = 0, good = 0, immature = 0, future = 0
  const rows = operations.map((operation) => {
    if (seen.has(operation.id)) throw new Error('duplicate operation')
    seen.add(operation.id)
    if (!Number.isFinite(operation.createdAt) || (operation.finishedAt !== null &&
      (!Number.isFinite(operation.finishedAt) || operation.finishedAt < operation.createdAt))) throw new RangeError('operation clock')
    const deadline = operation.createdAt + deadlineMinutes
    if (operation.createdAt > now) { future++; return { id: operation.id, deadline, classification: 'future' } }
    if (deadline > now) { immature++; return { id: operation.id, deadline, classification: 'immature' } }
    eligible++
    const onTime = operation.finishedAt !== null && operation.finishedAt <= now && operation.finishedAt <= deadline
    const resolved = operation.outcome === 'completed' || operation.outcome === 'rejected'
    const success = onTime && resolved
    if (success) good++
    return { id: operation.id, deadline, classification: success ? 'good' : 'bad' }
  })
  return { eligible, good, immature, future, rows }
}
