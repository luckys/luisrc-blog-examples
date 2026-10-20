import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { createStore, applyEvent } from './orders.mjs'
import { startHttp } from './http.mjs'
import { readOrder, openEvents } from './clients.mjs'
import { createRepository, runQuery, ORDERS_QUERY } from './graphql.mjs'
import { startGrpc, makeClient, getOrder } from './rpc.mjs'

export async function experiment() {
  const store = createStore()
  const http = await startHttp(store)
  const rpc = await startGrpc(store)
  const client = makeClient(rpc.address)
  let stream
  try {
    let polling = await readOrder(http.origin)
    let projection = (await readOrder(http.origin)).order
    stream = await openEvents(http.origin, projection.version)
    const responses = [polling.status]
    responses.push((await readOrder(http.origin, polling.etag)).status)
    const received = []
    for (const status of ['paid', 'shipped']) {
      store.change('north', 'o1', status)
      const event = await stream.next()
      received.push(event)
      projection = applyEvent(projection, event)
      polling = await readOrder(http.origin, polling.etag)
      responses.push(polling.status)
    }
    assert.deepEqual(polling.order, projection)
    const naive = createRepository(store)
    const batched = createRepository(store)
    const a = await runQuery(naive, 'north', ORDERS_QUERY, { first: 3 }, false)
    const b = await runQuery(batched, 'north', ORDERS_QUERY, { first: 3 }, true)
    assert.deepEqual(a, b)
    const grpcOrder = await getOrder(client, 'o1')
    assert.equal(grpcOrder.version, projection.version)
    return {
      scope:
        'Loopback HTTP, SSE and gRPC. In-memory repository calls, not SQL or latency benchmarks.',
      polling: { requests: 4, responses, final: polling.order },
      events: {
        requests: 2,
        snapshotRequests: 1,
        streamConnections: 1,
        received,
        final: projection,
      },
      graphql: { naive: naive.counts, batched: batched.counts, sameData: true },
      grpc: grpcOrder,
    }
  } finally {
    if (stream) await stream.close()
    client.close()
    rpc.close()
    await http.close()
  }
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const result = JSON.stringify(await experiment(), null, 2) + '\n'
  if (process.argv.includes('--write'))
    await writeFile(new URL('./results/experiment.json', import.meta.url), result)
  process.stdout.write(result)
}
