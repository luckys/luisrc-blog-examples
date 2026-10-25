export type HttpEvent = {
  id: string; route: string; traffic: 'user' | 'synthetic'; requestValid: boolean;
  status: number | null; bodyValid: boolean; expectedNotFound: boolean; durationMs: number | null;
}
export function classifyHttp(events: readonly HttpEvent[], thresholdMs: number) {
  if (!Number.isFinite(thresholdMs) || thresholdMs < 0) throw new RangeError('threshold')
  const seen = new Set<string>()
  const excluded = { synthetic: 0, route: 0, invalid: 0 }
  let eligible = 0, available = 0, fastAndAvailable = 0
  const rows = events.map((event) => {
    if (seen.has(event.id)) throw new Error('duplicate observation')
    seen.add(event.id)
    if (event.durationMs !== null && (!Number.isFinite(event.durationMs) || event.durationMs < 0)) throw new RangeError('duration')
    const reason = event.traffic === 'synthetic' ? 'synthetic'
      : event.route !== 'GET /reports/{id}' ? 'route' : !event.requestValid ? 'invalid' : null
    if (reason) { excluded[reason]++; return { id: event.id, reason, available: false, fastAndAvailable: false } }
    eligible++
    const correct = (event.status === 200 && event.bodyValid) || (event.status === 404 && event.expectedNotFound && event.bodyValid)
    const fast = correct && event.durationMs !== null && event.durationMs <= thresholdMs
    if (correct) available++
    if (fast) fastAndAvailable++
    return { id: event.id, reason: null, available: correct, fastAndAvailable: fast }
  })
  return { eligible, available, fastAndAvailable, excluded, rows }
}
