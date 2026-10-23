import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import assert from 'node:assert/strict'
import { withServer, cleanEnv } from './child-fixture.mjs'
import { summarize } from '../src/statistics.ts'
import { fingerprint, loadSources } from './measurement-hashes.mjs'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))
const sources = await fingerprint(loadSources)
await mkdir('.artifacts', { recursive: true })
const folder = await mkdtemp('.artifacts/load-')
const k6 = fileURLToPath(new URL('../.tools/k6', import.meta.url))
const plans = [
  { name: 'closed-4', mode: 'closed', rate: 1, vus: 4, seconds: 5, expected: 0 },
  { name: 'open-100', mode: 'open', rate: 100, vus: 40, seconds: 5, expected: 0 },
  { name: 'open-350-a', mode: 'open', rate: 350, vus: 40, seconds: 5, expected: 99 },
  { name: 'open-350-b', mode: 'open', rate: 350, vus: 40, seconds: 5, expected: 99 },
  { name: 'recovery-25', mode: 'open', rate: 25, vus: 40, seconds: 4, expected: 0 },
  { name: 'generator-starved', mode: 'open', rate: 100, vus: 1, seconds: 3, expected: 99 },
  { name: 'steady-60s', mode: 'open', rate: 25, vus: 40, seconds: 60, expected: 0 },
]
const stages = []
await withServer(async ({ url, metrics }) => {
  // Warm the HTTP path, deliberately excluded from stage samples.
  for (let i = 0; i < 10; i++) await (await fetch(`${url}/work`)).text()
  for (const plan of plans) {
    const before = await metrics()
    const rawFile = `${folder}/${plan.name}.jsonl`
    const summaryFile = `${folder}/${plan.name}-summary.json`
    const wallStart = performance.now()
    const child = spawn(k6, ['run', '--address', '127.0.0.1:0', '--quiet', '--out', `json=${rawFile}`, 'k6/load.js'], {
      env: { ...cleanEnv(), BASE_URL: url, MODE: plan.mode, RATE: String(plan.rate), VUS: String(plan.vus),
        SECONDS: String(plan.seconds), SUMMARY_FILE: summaryFile }, stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk })
    const exit = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('owned k6 timeout')) }, (plan.seconds + 15) * 1000)
      child.once('error', (error) => { clearTimeout(timer); reject(error) })
      child.once('exit', (code) => { clearTimeout(timer); resolve(code) })
    })
    assert.equal(exit, plan.expected, stderr)
    const summary = JSON.parse(await readFile(summaryFile))
    const points = (await readFile(rawFile, 'utf8')).trim().split('\n').map((line) => JSON.parse(line))
    const samples = points.filter((p) => p.type === 'Point' && p.metric === 'http_req_duration')
      .map((p) => ({ ms: p.data.value, status: Number(p.data.tags.status), at: p.data.time }))
    const dropped = summary.metrics.dropped_iterations?.values.count ?? 0
    const seconds = summary.state.testRunDurationMs / 1000
    const result = summarize(samples, seconds)
    assert.equal(samples.length, summary.metrics.http_reqs.values.count)
    if (plan.name.startsWith('open-350')) { assert.ok(result.errors > 0); assert.equal(dropped, 0) }
    if (plan.name === 'generator-starved') { assert.ok(dropped > 0); assert.equal(result.errors, 0) }
    if (plan.expected === 0) { assert.equal(result.errors, 0); assert.equal(dropped, 0) }
    const after = await metrics()
    assert.equal(after.active, 0)
    stages.push({ plan, exit, seconds, wallSeconds: (performance.now() - wallStart) / 1000, dropped,
      ...result, cpuMicroseconds: (after.cpu.user + after.cpu.system) - (before.cpu.user + before.cpu.system),
      maxActiveObserved: after.maxActive, k6Metrics: summary.metrics, samples })
    console.log(`${plan.name}: ${result.successes}/${result.requests} successes, dropped=${dropped}, expected exit=${exit}`)
  }
})
await mkdir('evidence', { recursive: true })
assert.deepEqual(await fingerprint(loadSources), sources, 'sources changed during measurement')
await writeFile('evidence/load.json', JSON.stringify({ node: process.version, k6: '2.3.0',
  topology: 'separate processes, same host, loopback', capacity: 8, syntheticWaitMs: 40,
  warmupRequests: 10, longSoakExecuted: false, sources, stages }, null, 2) + '\n')
