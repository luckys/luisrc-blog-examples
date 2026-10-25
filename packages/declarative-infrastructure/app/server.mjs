import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
export function createApi({ readMessage, credentialConfigured, podName }) {
  return createServer(async (req, res) => {
    let status = 200, body
    if (req.method !== 'GET') { status = 405; res.setHeader('allow', 'GET'); body = { error: 'method_not_allowed' } }
    else if (req.url === '/live') body = { live: true }
    else if (req.url === '/ready' || req.url === '/catalogue') {
      try {
        const message = (await readMessage()).trim()
        if (!message || !credentialConfigured) throw Error('configuration_missing')
        body = req.url === '/ready' ? { ready: true } : { message, pod: podName, credentialConfigured: true }
      } catch { status = 503; body = { error: 'configuration_unavailable' } }
    } else { status = 404; body = { error: 'not_found' } }
    res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body))
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createApi({ readMessage: () => readFile('/config/message', 'utf8'), credentialConfigured: Boolean(process.env.LAB_CREDENTIAL), podName: process.env.HOSTNAME })
  server.listen(3000, '0.0.0.0')
  process.on('SIGTERM', () => server.close(() => process.exit(0)))
}
