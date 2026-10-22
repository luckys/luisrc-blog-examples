import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { assertId, parseCommand } from './machine.ts'
import { execute } from './service.ts'
import type { JobRepository } from './service.ts'

const statuses: Record<string, number> = {
  invalid_input: 422, invalid_json: 400, too_large: 413, unsupported_media: 415,
  not_found: 404, version_conflict: 409, invalid_transition: 409,
}

function respond(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

async function readCommand(request: IncomingMessage) {
  if (request.headers['content-type'] !== 'application/json') throw new Error('unsupported_media')
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    size += chunk.length
    if (size <= 1024) chunks.push(chunk)
  }
  if (size > 1024) throw new Error('too_large')
  let value: unknown
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new Error('invalid_json') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_input')
  const body = value as Record<string, unknown>
  if (Object.keys(body).toSorted().join(',') !== 'command,expectedVersion') throw new Error('invalid_input')
  const command = parseCommand(body.command)
  const expectedVersion = body.expectedVersion
  if (typeof expectedVersion !== 'number' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
    throw new Error('invalid_input')
  return { command, expectedVersion }
}

export function createApi(repository: JobRepository) {
  const server = createServer(async (request, response) => {
    try {
      const match = /^\/jobs\/(j-[a-z0-9]{1,32})$/.exec(request.url ?? '')
      if (!match) return respond(response, 404, { error: 'not_found' })
      const id = match[1]!
      assertId(id)
      if (request.method === 'GET') {
        const job = await repository.read(id)
        if (!job) throw new Error('not_found')
        return respond(response, 200, job)
      }
      if (request.method !== 'POST') {
        response.setHeader('allow', 'GET, POST')
        return respond(response, 405, { error: 'method_not_allowed' })
      }
      const { command, expectedVersion } = await readCommand(request)
      respond(response, 200, await execute(repository, id, command, expectedVersion))
    } catch (error) {
      const code = error instanceof Error && Object.hasOwn(statuses, error.message) ? error.message : 'unexpected'
      respond(response, statuses[code] ?? 500, { error: code })
    }
  })
  server.requestTimeout = 5000
  server.headersTimeout = 5000
  return server
}
