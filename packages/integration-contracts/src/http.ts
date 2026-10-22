import { createServer } from 'node:http'
import type { OrdersRepository } from './repository.ts'
import { represent } from './representation.ts'
import type { Mode } from './representation.ts'

export function createApi(repository: Pick<OrdersRepository, 'read'>, mode: Mode = 'baseline') {
  return createServer(async (request, response) => {
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json' })
      response.end(JSON.stringify(body))
    }
    try {
      const match = /^\/(v2\/)?orders\/(o-[a-z0-9]{1,32})$/.exec(request.url ?? '')
      if (!match || request.method !== 'GET') return send(404, { error: 'not_found' })
      const order = await repository.read(match[2]!)
      if (!order) return send(404, { error: 'not_found' })
      send(200, represent(order, match[1] ? 'v2' : mode))
    } catch { send(500, { error: 'unexpected' }) }
  })
}
