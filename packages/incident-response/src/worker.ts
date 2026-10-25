import { applyConfig, selectBatch } from './config.ts'
import type { Config } from './config.ts'
type Job = { id: string; createdMs: number; attempts: number; status: 'queued' | 'completed'; result: string | null }
const pending: string[] = []
const jobs = new Map<string, Job>()
let config: Config = { batchSize: 2, revision: 1, guarded: false }
let ticks = 0, attempts = 0
const timer = setInterval(() => {
  ticks++
  const batch = selectBatch(pending, config.batchSize)
  pending.splice(0, batch.length)
  for (const id of batch) {
    const job = jobs.get(id)!
    attempts++; job.attempts++
    job.result = `report:${id}`
    job.status = 'completed'
    process.send?.({ type: 'completed', job })
  }
}, 10)
process.on('message', (message: any) => {
  if (message.type === 'submit') {
    if (jobs.has(message.id)) return
    jobs.set(message.id, { id: message.id, createdMs: performance.now(), attempts: 0, status: 'queued', result: null })
    pending.push(message.id)
    return
  }
  if (message.type === 'shutdown') { clearInterval(timer); process.disconnect?.(); return }
  if (message.type !== 'rpc') return
  try {
    if (message.action === 'config') config = applyConfig(config, message.input)
    const first = pending[0] ? jobs.get(pending[0]) : undefined
    process.send?.({ type: 'reply', rpcId: message.rpcId, ok: true, worker: {
      pid: process.pid, config, ticks, attempts, queued: pending.length,
      oldestAgeMs: first ? performance.now() - first.createdMs : 0,
    } })
  } catch (error) {
    process.send?.({ type: 'reply', rpcId: message.rpcId, ok: false, error: String(error) })
  }
})
process.on('disconnect', () => clearInterval(timer))
process.send?.({ type: 'ready', pid: process.pid })
