import grpc from '@grpc/grpc-js'
import { loadSync } from '@grpc/proto-loader'
import { fileURLToPath } from 'node:url'
import { principal } from './orders.mjs'
export { grpc }

function definition(legacy = false) {
  return grpc.loadPackageDefinition(
    loadSync(
      fileURLToPath(
        new URL(legacy ? './orders-legacy.proto' : './orders.proto', import.meta.url),
      ),
      { defaults: true },
    ),
  ).orders.v1.Orders
}
export async function startGrpc(store, { delayMs = 0, onCancelled = () => {} } = {}) {
  const server = new grpc.Server({ 'grpc.max_receive_message_length': 8192 })
  server.addService(definition().service, {
    getOrder(call, callback) {
      let tenant
      try {
        const values = call.metadata.get('authorization')
        tenant = principal(values.length === 1 ? values[0] : undefined)
      } catch {
        return callback({ code: grpc.status.UNAUTHENTICATED, details: 'unauthenticated' })
      }
      if (!/^o[1-3]$/.test(call.request.id))
        return callback({ code: grpc.status.INVALID_ARGUMENT, details: 'invalid_id' })
      const run = () => {
        if (call.cancelled) return
        try {
          const order = store.get(tenant, call.request.id)
          callback(null, { ...order, displayLabel: `Order ${order.id}` })
        } catch {
          callback({ code: grpc.status.NOT_FOUND, details: 'not_found' })
        }
      }
      if (!delayMs) return run()
      const timer = setTimeout(run, delayMs)
      call.on('cancelled', () => {
        clearTimeout(timer)
        onCancelled()
      })
    },
  })
  const port = await new Promise((resolve, reject) =>
    server.bindAsync(
      '127.0.0.1:0',
      grpc.ServerCredentials.createInsecure(),
      (error, port) => (error ? reject(error) : resolve(port)),
    ),
  )
  return { address: `127.0.0.1:${port}`, close: () => server.forceShutdown() }
}
export function makeClient(address, legacy = false) {
  if (!/^127\.0\.0\.1:\d+$/.test(address)) throw new Error('loopback_fixture_only')
  return new (definition(legacy))(address, grpc.credentials.createInsecure())
}
export function getOrder(client, id, { token = 'fixture-north', timeoutMs = 2000 } = {}) {
  const metadata = new grpc.Metadata()
  metadata.set('authorization', `Bearer ${token}`)
  return new Promise((resolve, reject) =>
    client.getOrder(
      { id },
      metadata,
      { deadline: new Date(Date.now() + timeoutMs) },
      (error, order) => (error ? reject(error) : resolve(order)),
    ),
  )
}
