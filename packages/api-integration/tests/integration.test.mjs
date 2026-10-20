import test from 'node:test'
import assert from 'node:assert/strict'
import { createStore, applyEvent } from '../orders.mjs'
import { startHttp } from '../http.mjs'
import { openEvents, readOrder } from '../clients.mjs'
import { runQuery, createRepository, ORDERS_QUERY } from '../graphql.mjs'
import { startGrpc, makeClient, getOrder, grpc } from '../rpc.mjs'

const headers = { authorization: 'Bearer fixture-north' }

async function fixture(t, options = {}) {
  const store = createStore(options)
  const http = await startHttp(store)
  t.after(() => http.close())
  return { store, ...http }
}

test('HTTP: snapshot, ETag, 304 sin body y representación nueva tras un cambio', async (t) => {
  const { store, origin } = await fixture(t)
  const first = await readOrder(origin)
  assert.equal(first.status, 200)
  assert.deepEqual(first.order, { id: 'o1', status: 'pending', version: 1 })
  const idle = await readOrder(origin, first.etag)
  assert.equal(idle.status, 304)
  assert.equal(idle.order, null)
  store.change('north', 'o1', 'paid')
  const changed = await readOrder(origin, first.etag)
  assert.equal(changed.status, 200)
  assert.equal(changed.order.version, 2)
  assert.notEqual(changed.etag, first.etag)
})

test('HTTP: autenticar antes de consultar; un tenant no ve el pedido del otro', async (t) => {
  const { origin } = await fixture(t)
  assert.equal((await fetch(`${origin}/orders/o1`)).status, 401)
  const south = { authorization: 'Bearer fixture-south' }
  const missing = await fetch(`${origin}/orders/o2`, { headers: south })
  assert.equal(missing.status, 404)
  const own = await fetch(`${origin}/orders/o1`, { headers: south })
  assert.equal((await own.json()).status, 'cancelled')
})

test('SSE: replay del hueco entre snapshot y suscripción y cambio en conexión activa', async (t) => {
  const { origin, store } = await fixture(t)
  const snapshot = (await readOrder(origin)).order
  store.change('north', 'o1', 'paid')
  const stream = await openEvents(origin, snapshot.version)
  t.after(() => stream.close())
  const replay = await stream.next()
  assert.equal(replay.version, 2)
  store.change('north', 'o1', 'shipped')
  const live = await stream.next()
  assert.equal(live.version, 3)
  const final = applyEvent(applyEvent(snapshot, replay), live)
  assert.deepEqual(final, (await readOrder(origin)).order)
})

test('SSE: el cursor del tenant North no da acceso al stream de South', async (t) => {
  const { store, origin } = await fixture(t)
  store.change('north', 'o1', 'paid')
  const response = await fetch(`${origin}/orders/o1/events?after=2`, {
    headers: { authorization: 'Bearer fixture-south' },
  })
  assert.equal(response.status, 400)
  assert.equal((await fetch(`${origin}/orders/o1/events?after=1`)).status, 401)
})

test('SSE: cursor vencido exige snapshot; futuro o sintaxis inválida se rechaza', async (t) => {
  const { origin, store } = await fixture(t, { retention: 1 })
  store.change('north', 'o1', 'paid')
  store.change('north', 'o1', 'shipped')
  assert.equal(
    (await fetch(`${origin}/orders/o1/events?after=1`, { headers })).status,
    410,
  )
  for (const cursor of ['999', '-1', '0', '1.5', 'abc'])
    assert.equal(
      (await fetch(`${origin}/orders/o1/events?after=${cursor}`, { headers })).status,
      400,
    )
  const snapshot = await readOrder(origin)
  const stream = await openEvents(origin, snapshot.order.version)
  await stream.close()
})

test('proyección: duplicados no cambian estado; huecos, otro pedido y schema desconocido no se aplican', () => {
  const current = { id: 'o1', status: 'paid', version: 2 }
  const event = { schemaVersion: 1, orderId: 'o1', version: 2, status: 'paid' }
  assert.deepEqual(applyEvent(current, event), current)
  assert.throws(() => applyEvent(current, { ...event, version: 4 }), /resnapshot/)
  assert.throws(
    () => applyEvent(current, { ...event, orderId: 'other' }),
    /invalid_event/,
  )
  assert.throws(
    () => applyEvent(current, { ...event, schemaVersion: 2 }),
    /invalid_event/,
  )
})

test('GraphQL: un HTTP no elimina N+1; batching conserva datos y baja 4 lecturas a 2', async () => {
  const store = createStore()
  const naive = createRepository(store)
  const batched = createRepository(store)
  const a = await runQuery(naive, 'north', ORDERS_QUERY, { first: 3 }, false)
  const b = await runQuery(batched, 'north', ORDERS_QUERY, { first: 3 }, true)
  assert.equal(a.errors, undefined)
  assert.deepEqual(a, b)
  assert.deepEqual(naive.counts, { orderReads: 1, customerReads: 3 })
  assert.deepEqual(batched.counts, { orderReads: 1, customerReads: 1 })
  assert.deepEqual(
    b.data.orders.map((o) => o.customer.name),
    ['Ana', 'Bea', 'Ana'],
  )
})

test('GraphQL: schema rechaza campo desconocido y variable de tipo erróneo', async () => {
  const repo = createRepository(createStore())
  const result = await runQuery(repo, 'north', '{ orders(first: 3) { password } }')
  assert.match(result.errors[0].message, /Cannot query field/)
  const typed = await runQuery(repo, 'north', ORDERS_QUERY, { first: '3' })
  assert.ok(typed.errors)
  assert.deepEqual(repo.counts, { orderReads: 0, customerReads: 0 })
})

test('GraphQL: batches ordenados, límite de lista y cache por operación/tenant', async () => {
  const repo = createRepository(createStore())
  const north = await runQuery(repo, 'north', ORDERS_QUERY, { first: 3 })
  const south = await runQuery(repo, 'south', ORDERS_QUERY, { first: 1 })
  assert.equal(north.data.orders[0].customer.name, 'Ana')
  assert.equal(south.data.orders[0].customer.name, 'Otro cliente')
  const outOfRange = await runQuery(repo, 'north', ORDERS_QUERY, { first: 99 })
  assert.match(outOfRange.errors[0].message, /first_out_of_range/)
})

test('GraphQL: no carga clientes si el documento no solicita la relación', async () => {
  const repo = createRepository(createStore())
  const result = await runQuery(repo, 'north', '{ orders(first: 3) { id status } }')
  assert.equal(result.errors, undefined)
  assert.equal(result.data.orders.length, 3)
  assert.deepEqual(repo.counts, { orderReads: 1, customerReads: 0 })
})

test('GraphQL HTTP: operación permitida, auth, allowlist, JSON inválido y límite de body', async (t) => {
  const { origin } = await fixture(t)
  const request = (body, auth = headers) =>
    fetch(`${origin}/graphql`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  const result = await request({ query: ORDERS_QUERY, variables: { first: 3 } })
  assert.equal(result.status, 200)
  assert.equal((await result.json()).data.orders.length, 3)
  assert.equal((await request({ query: ORDERS_QUERY }, {})).status, 401)
  assert.equal((await request({ query: '{ __schema { types { name } } }' })).status, 400)
  assert.equal((await request('{')).status, 400)
  assert.equal((await request('x'.repeat(9000))).status, 413)
})

test('gRPC: RPC real, metadata, aislamiento, NOT_FOUND e INVALID_ARGUMENT', async (t) => {
  const server = await startGrpc(createStore())
  const client = makeClient(server.address)
  t.after(() => {
    client.close()
    server.close()
  })
  assert.deepEqual(await getOrder(client, 'o1'), {
    id: 'o1',
    status: 'pending',
    version: 1,
    displayLabel: 'Order o1',
  })
  await assert.rejects(getOrder(client, 'o1', { token: 'wrong' }), {
    code: grpc.status.UNAUTHENTICATED,
  })
  await assert.rejects(getOrder(client, 'o2', { token: 'fixture-south' }), {
    code: grpc.status.NOT_FOUND,
  })
  await assert.rejects(getOrder(client, ''), { code: grpc.status.INVALID_ARGUMENT })
})

test('gRPC: añadir campo 4 conserva la lectura del cliente con schema v1', async (t) => {
  const server = await startGrpc(createStore())
  const oldClient = makeClient(server.address, true)
  t.after(() => {
    oldClient.close()
    server.close()
  })
  assert.deepEqual(await getOrder(oldClient, 'o1'), {
    id: 'o1',
    status: 'pending',
    version: 1,
  })
})

test('gRPC: deadline limita espera y el handler cancela su timer de trabajo', async (t) => {
  let cancelled
  const observed = new Promise((resolve) => {
    cancelled = resolve
  })
  const server = await startGrpc(createStore(), { delayMs: 5000, onCancelled: cancelled })
  const client = makeClient(server.address)
  t.after(() => {
    client.close()
    server.close()
  })
  await assert.rejects(getOrder(client, 'o1', { timeoutMs: 100 }), {
    code: grpc.status.DEADLINE_EXCEEDED,
  })
  await Promise.race([
    observed,
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('cancellation not observed')), 1500)
      timer.unref()
    }),
  ])
})
