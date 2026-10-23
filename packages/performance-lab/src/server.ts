import { createServer } from 'node:http'
import { once } from 'node:events'
import { performance, monitorEventLoopDelay } from 'node:perf_hooks'
import { calculateSlow, calculateIndexed, makeDataset } from './workload.ts'

export async function startServer() {
  const data = makeDataset()
  const delay = monitorEventLoopDelay({ resolution: 10 })
  delay.enable()
  const cpuStart = process.cpuUsage()
  const started = performance.now()
  const stats = { active: 0, maxActive: 0, accepted: 0, rejected: 0 }
  const server = createServer((request, response) => {
    if (request.method !== 'GET') { response.writeHead(405).end(); return }
    if (request.url === '/work') {
      if (stats.active >= 8) { stats.rejected++; response.writeHead(503).end('overloaded'); return }
      stats.active++
      stats.maxActive = Math.max(stats.maxActive, stats.active)
      setTimeout(() => {
        stats.active--
        stats.accepted++
        response.writeHead(200, { 'content-type': 'text/plain' }).end('ok')
      }, 40)
      return
    }
    if (request.url === '/cpu/slow' || request.url === '/cpu/indexed') {
      const calculate = request.url === '/cpu/slow' ? calculateSlow : calculateIndexed
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ checksum: calculate(data.payments, data.rates) }))
      return
    }
    response.writeHead(404).end()
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('missing port')
  return { url: `http://127.0.0.1:${address.port}`, stats,
    metrics() { return { ...stats, cpu: process.cpuUsage(cpuStart), seconds: (performance.now() - started) / 1000,
      eventLoopP99Ms: delay.percentile(99) / 1e6, memory: process.memoryUsage() } },
    async close() { delay.disable(); server.closeIdleConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) } }
}
