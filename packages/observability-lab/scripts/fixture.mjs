import { fork } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'

export async function withServer(work) {
  const child = fork(new URL('../src/server.ts', import.meta.url), [], {
    env: { PATH: process.env.PATH, LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  let output = ''
  child.stdout.on('data', (data) => { output += data })
  child.stderr.on('data', (data) => { output += data })
  const exited = once(child, 'exit')
  try {
    const message = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`server startup timed out: ${output}`)), 10000)
      child.once('message', (message) => { clearTimeout(timer); resolve(message) })
      child.once('error', (error) => { clearTimeout(timer); reject(error) })
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`server exited ${code}: ${output}`)) })
    })
    return await work({ origin: message.origin, pid: child.pid })
  } finally {
    if (child.connected) child.send({ type: 'shutdown' })
    const killer = setTimeout(() => child.kill('SIGTERM'), 5000)
    await exited
    clearTimeout(killer)
    if (child.exitCode !== 0) throw new Error(`server failed: ${output}`)
  }
}

export async function waitForJobs(origin, count) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const state = await (await fetch(origin + '/state')).json()
    if (state.jobs.length >= count && state.jobs.slice(0, count).every((job) => job.status !== 'accepted')) return state
    await delay(20)
  }
  throw new Error('worker did not finish')
}
