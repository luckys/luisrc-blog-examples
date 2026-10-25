import { createServer } from 'node:http'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { requireScope } from './config.ts'
const instanceId = randomUUID()
const jobs = new Map<string, any>()
let admissionOpen = true, rejectedDuringPause = 0
const worker = fork(new URL('./worker.ts', import.meta.url), [], {
  env: { PATH: process.env.PATH ?? '', LANG: 'C.UTF-8' }, stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
})
const workerExit = once(worker, 'exit')
await Promise.race([once(worker, 'message'), new Promise((_, reject) => { const t = setTimeout(() => reject(new Error('worker startup timeout')), 5000); t.unref() })])
const pending = new Map<string, { resolve: (reply: any) => void; timer: ReturnType<typeof setTimeout> }>()
worker.on('message', (message: any) => {
  if (message.type === 'completed') { jobs.set(message.job.id, message.job); return }
  const rpc = pending.get(message.rpcId)
  if (!rpc) return
  clearTimeout(rpc.timer); pending.delete(message.rpcId); rpc.resolve(message)
})
function workerRpc(action: string, input: unknown = {}) {
  return new Promise<any>((resolve, reject) => {
    const rpcId = randomUUID()
    const timer = setTimeout(() => { pending.delete(rpcId); reject(new Error('worker RPC timeout')) }, 5000)
    pending.set(rpcId, { resolve, timer })
    worker.send({ type: 'rpc', rpcId, action, input })
  })
}
const server = createServer((request, response) => {
  const json = (status: number, body: unknown) => { response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify(body)) }
  void (async () => {
    if (request.url === '/jobs' && request.method === 'POST') {
      request.resume()
      if (!admissionOpen) { rejectedDuringPause++; json(503, { error: 'admission paused' }); return }
      if (jobs.size >= 20) { json(429, { error: 'fixture capacity' }); return }
      const id = `job-${String(jobs.size + 1).padStart(3, '0')}`
      jobs.set(id, { id, status: 'queued', result: null, attempts: 0 })
      worker.send({ type: 'submit', id })
      json(202, { id, status: 'queued' }); return
    }
    if (request.method !== 'GET') { json(405, { error: 'method' }); return }
    if (request.url === '/live') { json(200, { api: 'live' }); return }
    if (request.url === '/state') {
      const reply = await workerRpc('stats')
      if (!reply.ok) throw new Error('stats unavailable')
      const list = [...jobs.values()]
      json(200, { instanceId, apiPid: process.pid, worker: reply.worker, admissionOpen, rejectedDuringPause,
        accepted: list.length, completed: list.filter((j) => j.status === 'completed').length,
        queued: list.filter((j) => j.status === 'queued').length, jobs: list }); return
    }
    const match = request.url?.match(/^\/jobs\/(job-\d{3})$/)
    if (match && jobs.has(match[1]!)) { json(200, jobs.get(match[1]!)); return }
    json(404, { error: 'not found' })
  })().catch(() => json(503, { error: 'fixture unavailable' }))
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('port')
process.send?.({ type: 'ready', origin: `http://127.0.0.1:${address.port}`, instanceId })
let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  const closed = new Promise<void>((resolve) => server.close(() => resolve()))
  if (worker.connected) worker.send({ type: 'shutdown' })
  const killer = setTimeout(() => worker.kill('SIGTERM'), 3000)
  await workerExit; clearTimeout(killer); await closed
  process.disconnect?.()
}
process.on('message', (message: any) => {
  if (message.type === 'shutdown') { void shutdown(); return }
  if (message.type !== 'control') return
  void (async () => {
    requireScope(instanceId, message.instanceId)
    if (message.action === 'admission') {
      if (typeof message.input.open !== 'boolean') throw new TypeError('admission boolean')
      admissionOpen = message.input.open
      return { ok: true, admissionOpen }
    }
    if (message.action !== 'config') throw new TypeError('control action')
    return workerRpc('config', message.input)
  })().then((reply) => process.send?.({ ...reply, type: 'control-reply', rpcId: message.rpcId }))
    .catch((error) => process.send?.({ type: 'control-reply', rpcId: message.rpcId, ok: false, error: String(error) }))
})
process.on('SIGTERM', () => { void shutdown() })
process.on('disconnect', () => { void shutdown() })
