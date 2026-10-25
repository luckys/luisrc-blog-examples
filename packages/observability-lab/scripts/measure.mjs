import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { chromium } from '@playwright/test'
import { withServer, waitForJobs } from './fixture.mjs'
import './build-ui.mjs'

async function sourceHashes() {
  const hashes = {}
  for (const dir of ['src', 'web', 'scripts', 'tests']) {
    for (const file of (await readdir(new URL(`../${dir}/`, import.meta.url))).toSorted()) {
      const path = `${dir}/${file}`
      hashes[path] = createHash('sha256').update(await readFile(new URL(`../${path}`, import.meta.url))).digest('hex')
    }
  }
  return hashes
}
const sources = await sourceHashes()
const result = await withServer(async ({ origin, pid }) => {
  const browser = await chromium.launch({ headless: true })
  const errors = []
  const requests = []
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 900 } })
    page.on('pageerror', (error) => errors.push(String(error)))
    page.on('request', (request) => {
      assert.equal(new URL(request.url()).origin, origin)
      if (new URL(request.url()).pathname === '/jobs') requests.push(request.headers().traceparent)
    })
    await page.goto(origin)
    await page.getByRole('heading', { name: 'Seguir una operación desde React hasta el worker' }).waitFor()
    const cases = []
    for (const [index, scenario] of ['ok', 'fail', 'broken', 'link', 'unsampled'].entries()) {
      await page.getByRole('button', { name: scenario, exact: true }).click()
      await page.getByRole('button', { name: scenario, exact: true }).waitFor({ state: 'visible' })
      await page.waitForFunction(() => !document.querySelector('button').disabled)
      const state = await waitForJobs(origin, index + 1)
      const job = state.jobs[index]
      const spans = state.spans.filter((span) => span.attributes['lab.operation_id'] === job.operationId)
      assert.equal(spans.length, scenario === 'unsampled' ? 0 : 5)
      assert.equal(state.jobs[index].status, scenario === 'fail' ? 'error' : 'ok')
      if (scenario === 'ok' || scenario === 'fail') {
        assert.equal(new Set(spans.map((span) => span.traceId)).size, 1)
        const names = ['ui.submit', 'POST /jobs client', 'POST /jobs', 'jobs publish', 'jobs process']
        const chain = names.map((name) => spans.find((span) => span.name === name))
        for (let i = 1; i < chain.length; i++) assert.equal(chain[i].parentSpanId, chain[i - 1].spanId)
        assert.equal(chain[4].parentRemote, true)
      }
      if (scenario === 'broken') assert.equal(new Set(spans.map((span) => span.traceId)).size, 2)
      if (scenario === 'link') {
        const worker = spans.find((span) => span.name === 'jobs process')
        const producer = spans.find((span) => span.name === 'jobs publish')
        assert.equal(worker.parentSpanId, null)
        assert.equal(worker.links[0].spanId, producer.spanId)
        assert.notEqual(worker.traceId, producer.traceId)
      }
      assert.equal(state.metrics.histogram.reduce((n, point) => n + point.value.count, 0), index + 1)
      cases.push({ scenario, job, spans, logs: state.logs.filter((log) => log.operation_id === job.operationId), metrics: state.metrics })
    }
    assert.equal(requests.length, 5)
    assert.match(requests[4], /-00$/)
    assert.ok(requests.slice(0, 4).every((value) => value.endsWith('-01')))
    assert.deepEqual(errors, [])
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await mkdir(new URL('../.artifacts/', import.meta.url), { recursive: true })
    await page.screenshot({ path: new URL('../.artifacts/react-mobile.png', import.meta.url).pathname, fullPage: true })
    const final = await waitForJobs(origin, 5)
    assert.notEqual(pid, final.workerPid)
    assert.equal(final.spans.length, 20)
    assert.equal(final.logs.length, 10)
    const text = await (await fetch(origin + '/metrics')).text()
    for (const exemplar of final.metrics.exemplars) {
      assert.ok(final.spans.some((span) => span.spanId === exemplar.spanId && span.traceId === exemplar.traceId))
    }
    return { measuredAt: new Date().toISOString(), node: process.version, otel: '3.0.0', api: '1.10.0',
      transport: 'HTTP loopback + child_process IPC', apiPid: pid, workerPid: final.workerPid,
      sources, cases, spans: final.spans, logs: final.logs, metrics: final.metrics, openMetrics: text,
      browser: { width: 360, clicks: 5, pageErrors: errors },
      limits: { durableBroker: false, otlpExporter: false, collector: false, backend: false, nativeSdkExemplars: false,
        asyncContextBrowser: 'explicit Context at every boundary', reservoir: 'last sampled per bucket/result, at most 10' } }
  } finally { await browser.close() }
})
assert.deepEqual(await sourceHashes(), sources, 'sources changed while measuring')
await mkdir(new URL('../evidence/', import.meta.url), { recursive: true })
await writeFile(new URL('../evidence/browser.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ cases: result.cases.map((entry) => ({ scenario: entry.scenario, spans: entry.spans.length, traces: new Set(entry.spans.map((span) => span.traceId)).size })), metrics: result.metrics, pids: [result.apiPid, result.workerPid] }, null, 2))
