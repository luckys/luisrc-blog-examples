import { fork } from 'node:child_process'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
export async function withFixture(work) {
  const child = fork(new URL('../src/server.ts', import.meta.url), [], {
    env: { PATH: process.env.PATH, LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  let output = ''
  child.stdout.on('data', (data) => { output += data }); child.stderr.on('data', (data) => { output += data })
  const exited = once(child, 'exit')
  const pending = new Map()
  child.on('message', (message) => {
    const rpc = pending.get(message.rpcId)
    if (rpc) { clearTimeout(rpc.timer); pending.delete(message.rpcId); rpc.resolve(message) }
  })
  try {
    const ready = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('API startup timeout: ' + output)), 10000)
      child.once('message', (m) => { clearTimeout(timer); resolve(m) })
      child.once('error', (e) => { clearTimeout(timer); reject(e) })
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`API exited ${code}: ${output}`)) })
    })
    const control = (action, input, target = ready.instanceId) => new Promise((resolve, reject) => {
      const rpcId = randomUUID()
      const timer = setTimeout(() => { pending.delete(rpcId); reject(new Error('control timeout')) }, 6000)
      pending.set(rpcId, { resolve, timer })
      child.send({ type: 'control', rpcId, instanceId: target, action, input })
    })
    return await work({ origin: ready.origin, instanceId: ready.instanceId, pid: child.pid, control })
  } finally {
    if (child.connected) child.send({ type: 'shutdown' })
    const killer = setTimeout(() => child.kill('SIGTERM'), 5000)
    await exited; clearTimeout(killer)
    for (const rpc of pending.values()) clearTimeout(rpc.timer)
    if (child.exitCode !== 0) throw new Error('fixture failed: ' + output)
  }
}
export async function waitUntil(origin, predicate) {
  const deadline = performance.now() + 10000
  while (performance.now() < deadline) {
    const response = await fetch(origin + '/state')
    if (response.ok) { const state = await response.json(); if (predicate(state)) return state }
    await delay(10)
  }
  throw new Error('expected fixture state not reached')
}
