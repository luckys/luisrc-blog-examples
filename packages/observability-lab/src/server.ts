import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { context, trace, SpanKind } from '@opentelemetry/api'
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'
import { createTracing, within, inject, extract } from './tracing.ts'
import type { RecordedSpan } from './tracing.ts'
import { operationLog } from './logging.ts'
import type { Envelope } from './worker.ts'

const manager = new AsyncLocalStorageContextManager().enable()
context.setGlobalContextManager(manager)
const telemetry = createTracing('jobs-api')
const worker = fork(new URL('./worker.ts', import.meta.url), [], {
  env: { PATH: process.env.PATH ?? '', LANG: 'C.UTF-8' }, stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
})
const workerExited = once(worker, 'exit')
await once(worker, 'message')
type Job = { operationId: string; requestId: string; scenario: string; status: string }
const jobs: Job[] = []
const workerSpans: RecordedSpan[] = []
const browserSpans: RecordedSpan[] = []
const logs: ReturnType<typeof operationLog>[] = []
let metrics: unknown = { histogram: [], exemplars: [] }
let openMetrics = '# EOF\n'
worker.on('message', (message: any) => {
  if (message.type !== 'finished') return
  const job = jobs.find((entry) => entry.operationId === message.operationId)
  if (!job) return
  job.status = message.result
  workerSpans.push(...message.spans)
  logs.push(...message.logs)
  metrics = message.metrics
  openMetrics = message.openMetrics
})

async function jsonBody(request: IncomingMessage): Promise<any> {
  let size = 0
  const parts: Buffer[] = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 128 * 1024) throw new Error('body limit')
    parts.push(chunk)
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8'))
}
function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}

async function acceptJob(request: IncomingMessage, response: ServerResponse) {
  if (jobs.length >= 100) { json(response, 429, { error: 'fixture limit' }); return }
  const body = await jsonBody(request)
  if (!body || !['ok', 'fail', 'broken', 'link', 'unsampled'].includes(body.scenario)) {
    json(response, 400, { error: 'unknown fixture scenario' }); return
  }
  const suffix = String(jobs.length + 1).padStart(3, '0')
  const job: Job = { operationId: `op-${suffix}`, requestId: `req-${suffix}`, scenario: body.scenario, status: 'accepted' }
  jobs.push(job)
  const remote = extract(typeof request.headers.traceparent === 'string' ? { traceparent: request.headers.traceparent } : {})
  await within(telemetry.tracer, 'POST /jobs', remote, async (serverSpan) => {
    const serverCtx = trace.setSpan(remote, serverSpan)
    await within(telemetry.tracer, 'jobs publish', serverCtx, async (publishSpan) => {
      const metadata = inject(trace.setSpan(serverCtx, publishSpan))
      const envelope: Envelope = { ...job, metadata: job.scenario === 'broken' ? {} : metadata }
      worker.send(envelope)
      publishSpan.addEvent('job.sent')
    }, { kind: SpanKind.PRODUCER, attributes: { 'lab.operation_id': job.operationId } })
    logs.push(operationLog('job.accepted', job.operationId, job.requestId, 'accepted', serverCtx))
    serverSpan.addEvent('job.accepted')
    json(response, 202, job)
  }, { kind: SpanKind.SERVER, attributes: { 'lab.operation_id': job.operationId, 'http.route': '/jobs', 'http.response.status_code': 202 } })
}

const server = createServer((request, response) => {
  void (async () => {
    const path = request.url ?? ''
    if (path === '/jobs') {
      if (request.method !== 'POST') { json(response, 405, { error: 'POST required' }); return }
      await acceptJob(request, response); return
    }
    if (path === '/telemetry/browser' && request.method === 'POST') {
      const spans = await jsonBody(request)
      if (!Array.isArray(spans) || spans.length > 10 || browserSpans.length + spans.length > 500 ||
        !spans.every((span) => span.service === 'jobs-web' && /^[a-f0-9]{32}$/.test(span.traceId) && /^[a-f0-9]{16}$/.test(span.spanId))) {
        json(response, 400, { error: 'invalid fixture spans' }); return
      }
      browserSpans.push(...spans)
      json(response, 200, { received: spans.length }); return
    }
    if (request.method !== 'GET') { json(response, 405, { error: 'GET required' }); return }
    if (path === '/state') {
      await telemetry.provider.forceFlush()
      json(response, 200, { apiPid: process.pid, workerPid: worker.pid, jobs, spans: [...browserSpans, ...telemetry.spans, ...workerSpans], logs, metrics }); return
    }
    if (path === '/metrics') {
      response.writeHead(200, { 'content-type': 'application/openmetrics-text; version=1.0.0; charset=utf-8' })
      response.end(openMetrics); return
    }
    if (path === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(await readFile(new URL('../web/index.html', import.meta.url))); return
    }
    if (path === '/app.js') {
      response.writeHead(200, { 'content-type': 'application/javascript' })
      response.end(await readFile(new URL('../.artifacts/app.js', import.meta.url))); return
    }
    json(response, 404, { error: 'not found' })
  })().catch(() => { if (!response.headersSent) json(response, 400, { error: 'invalid fixture request' }); else response.end() })
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('missing port')
const origin = `http://127.0.0.1:${address.port}`
console.log(origin)
process.send?.({ origin })
let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  const closed = new Promise<void>((resolve) => server.close(() => resolve()))
  worker.send({ type: 'shutdown' })
  const timer = setTimeout(() => worker.kill('SIGTERM'), 3000)
  await workerExited
  clearTimeout(timer)
  await closed
  await telemetry.provider.shutdown()
  manager.disable()
  process.disconnect?.()
}
process.on('message', (message: any) => { if (message.type === 'shutdown') void shutdown() })
process.on('SIGTERM', () => { void shutdown() })
process.on('SIGINT', () => { void shutdown() })
