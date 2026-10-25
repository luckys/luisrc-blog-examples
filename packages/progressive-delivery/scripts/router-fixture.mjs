import { fork } from 'node:child_process'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
export async function startRouter(upstreams) {
  const child = fork(new URL('../src/router.ts', import.meta.url), [], {
    env: { PATH: process.env.PATH, LAB_UPSTREAMS: JSON.stringify(upstreams) }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  const exited = once(child, 'exit'); let output = ''
  child.stdout.on('data', (b) => { output += b }); child.stderr.on('data', (b) => { output += b })
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('router_start_timeout: ' + output)), 10000)
    child.once('message', (m) => { clearTimeout(timer); resolve(m) })
    child.once('error', (e) => { clearTimeout(timer); reject(e) })
    child.once('exit', () => { clearTimeout(timer); reject(Error('router_exit: ' + output)) })
  }).catch((error) => { child.kill('SIGTERM'); throw error })
  const pending = new Map(); let revision = 0
  child.on('message', (m) => {
    const task = pending.get(m.id)
    if (task) { clearTimeout(task.timer); pending.delete(m.id); task.resolve(m) }
  })
  return {
    origin: ready.origin, pid: child.pid,
    route: (route, nextUpstreams, expectedRevision = revision) => new Promise((resolve, reject) => {
      const id = randomUUID()
      const timer = setTimeout(() => { pending.delete(id); reject(Error('router_control_timeout')) }, 4000)
      pending.set(id, { timer, resolve: (m) => { if (m.ok) revision = m.revision; resolve(m) } })
      child.send({ type: 'route', id, route, upstreams: nextUpstreams, expectedRevision })
    }),
    close: async () => {
      if (child.connected) child.send({ type: 'stop' })
      const killer = setTimeout(() => child.kill('SIGTERM'), 4000)
      await exited; clearTimeout(killer)
      for (const task of pending.values()) clearTimeout(task.timer)
      if (child.exitCode !== 0) throw Error('router_failed: ' + output)
    },
  }
}
