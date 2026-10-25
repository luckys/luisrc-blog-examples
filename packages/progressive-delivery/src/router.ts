import { createServer } from 'node:http'
import { chooseSlot, validateRoute } from './rollout.ts'
import type { Slot } from './rollout.ts'

function validateUpstreams(input: Record<Slot, string>) {
  const normalized = {} as Record<Slot, string>
  for (const slot of ['a', 'b', 'green'] as const) {
    const url = new URL(input[slot])
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.pathname !== '/' || url.username || url.password) throw Error('loopback_upstream_required')
    normalized[slot] = url.origin
  }
  return normalized
}
let upstreams = validateUpstreams(JSON.parse(process.env.LAB_UPSTREAMS ?? '{}'))
let route = validateRoute({ slots: ['a', 'b'], canaryPercent: 0, featureEnabled: false })
let revision = 0, sequence = 0
const server = createServer(async (req, res) => {
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
  const snapshot = route, currentRevision = revision
  const key = String(req.headers['x-lab-key'] ?? 'anonymous')
  const slot = chooseSlot(snapshot, key, sequence++)
  try {
    const path = new URL(req.url ?? '/', 'http://router')
    const response = await fetch(upstreams[slot] + path.pathname + path.search, {
      method: 'GET', signal: AbortSignal.timeout(2000),
      headers: { 'x-lab-price-v2': snapshot.featureEnabled ? '1' : '0' },
    })
    res.writeHead(response.status, { 'Content-Type': 'application/json', 'X-Lab-Slot': slot, 'X-Lab-Route': currentRevision })
    res.end(await response.text())
  } catch { res.writeHead(502); res.end(JSON.stringify({ error: 'upstream_unavailable' })) }
})
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (!address || typeof address === 'string') throw Error('address')
  process.send?.({ type: 'ready', origin: `http://127.0.0.1:${address.port}` })
})
process.on('message', (message: { id: string; type: string; route?: unknown; upstreams?: Record<Slot, string>; expectedRevision?: number }) => {
  if (message.type === 'stop') { server.close(() => process.exit(0)); return }
  if (message.type !== 'route') return
  try {
    if (message.expectedRevision !== revision) throw Error('stale_route')
    const nextRoute = validateRoute(message.route)
    const nextUpstreams = message.upstreams ? validateUpstreams(message.upstreams) : upstreams
    route = nextRoute; upstreams = nextUpstreams; revision++; sequence = 0
    process.send?.({ id: message.id, ok: true, revision, route })
  } catch { process.send?.({ id: message.id, ok: false, revision, route }) }
})
process.on('disconnect', () => server.close(() => process.exit(0)))
