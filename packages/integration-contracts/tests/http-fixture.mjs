import { once } from 'node:events'
import { createApi } from '../src/http.ts'

export async function withApi(repository, mode, run) {
  const server = createApi(repository, mode)
  try {
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    return await run(`http://127.0.0.1:${server.address().port}`)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}
