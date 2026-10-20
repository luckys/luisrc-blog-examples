import { createServer } from 'node:http'
import { once } from 'node:events'
import { principal, fault } from './orders.mjs'
import { createRepository, runQuery, ORDERS_QUERY } from './graphql.mjs'

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}
async function body(req) {
  if (req.headers['content-type'] !== 'application/json')
    throw fault(415, 'json_required')
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > 8192) throw fault(413, 'body_too_large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw fault(400, 'invalid_json')
  }
}

export async function startHttp(store) {
  const repo = createRepository(store)
  const streams = new Set()
  const server = createServer(async (req, res) => {
    try {
      const tenant = principal(req.headers.authorization)
      const url = new URL(req.url, 'http://127.0.0.1')
      if (req.method === 'POST' && url.pathname === '/graphql') {
        const input = await body(req)
        // Trusted document allowlist, not a general-purpose GraphQL gateway.
        if (
          input?.query !== ORDERS_QUERY ||
          (input.operationName && input.operationName !== 'Orders')
        )
          throw fault(400, 'operation_not_allowed')
        return json(res, 200, await runQuery(repo, tenant, input.query, input.variables))
      }
      const match = /^\/orders\/(o[1-3])(\/events)?$/.exec(url.pathname)
      if (req.method !== 'GET' || !match) throw fault(404, 'not_found')
      const snapshot = store.get(tenant, match[1])
      if (!match[2]) {
        const etag = `"${tenant}:${snapshot.id}:${snapshot.version}"`
        res.setHeader('etag', etag)
        res.setHeader('cache-control', 'private, no-cache')
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304)
          return res.end()
        }
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(JSON.stringify(snapshot))
      }
      const after = url.searchParams.get('after')
      if (!/^[1-9]\d{0,9}$/.test(after ?? '')) throw fault(400, 'invalid_cursor')
      if (streams.size >= 16) throw fault(503, 'stream_capacity')
      const pending = []
      let live = false
      const send = (event) => {
        if (!live) {
          pending.push(event)
          return
        }
        if (
          !res.write(
            `id: ${event.version}\nevent: order\ndata: ${JSON.stringify(event)}\n\n`,
          )
        )
          res.destroy() // Slow consumer must reconnect, not accumulate an unbounded queue.
      }
      const unsubscribe = store.subscribe(tenant, match[1], Number(after), send)
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
      })
      res.write('event: ready\ndata: {}\n\n')
      streams.add(res)
      live = true
      for (const event of pending) send(event)
      const timer = setTimeout(() => res.end(), 30000)
      res.on('close', () => {
        clearTimeout(timer)
        unsubscribe()
        streams.delete(res)
      })
    } catch (error) {
      if (res.headersSent) res.destroy()
      else
        json(res, error.status ?? 500, {
          error: error.status ? error.message : 'internal_error',
        })
    }
  })
  server.requestTimeout = 3000
  server.headersTimeout = 3000
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    repo,
    async close() {
      for (const res of streams) res.destroy()
      const closed = new Promise((resolve) => server.close(resolve))
      server.closeAllConnections()
      await closed
    },
  }
}
