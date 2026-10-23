import { startServer } from '../src/server.ts'
const server = await startServer()
process.send({ type: 'ready', url: server.url })
process.on('message', async (message) => {
  if (message?.type === 'metrics') process.send({ type: 'metrics', metrics: server.metrics() })
  if (message?.type === 'close') { await server.close(); process.disconnect() }
})
process.once('SIGTERM', async () => { await server.close(); process.exit(0) })
