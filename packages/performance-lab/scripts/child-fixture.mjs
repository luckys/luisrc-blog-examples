import { fork } from 'node:child_process'
import { once } from 'node:events'
import assert from 'node:assert/strict'

export const cleanEnv = () => ({ PATH: process.env.PATH, LANG: 'C',
  K6_NO_USAGE_REPORT: 'true', K6_AUTO_EXTENSION_RESOLUTION: 'false', K6_WEB_DASHBOARD: 'false',
  NO_PROXY: '127.0.0.1,localhost' })

export async function withServer(action) {
  const child = fork(new URL('server-child.mjs', import.meta.url), [], {
    env: cleanEnv(), stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  })
  try {
    const [ready] = await once(child, 'message', { signal: AbortSignal.timeout(5000) })
    assert.equal(ready.type, 'ready')
    assert.match(ready.url, /^http:\/\/127\.0\.0\.1:[0-9]+$/)
    const metrics = async () => {
      const pending = once(child, 'message', { signal: AbortSignal.timeout(5000) })
      child.send({ type: 'metrics' })
      const [message] = await pending
      assert.equal(message.type, 'metrics')
      return message.metrics
    }
    return await action({ url: ready.url, pid: child.pid, metrics })
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const ended = once(child, 'exit', { signal: AbortSignal.timeout(5000) })
      if (child.connected) child.send({ type: 'close' })
      try { await ended } catch { child.kill('SIGKILL'); await once(child, 'exit') }
    }
  }
}
