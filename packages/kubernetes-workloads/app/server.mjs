import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
export function parseSettings(raw) {
  const value = JSON.parse(raw)
  if (!value || typeof value.message !== 'string' || !value.message.length || value.message.length > 80
    || typeof value.ready !== 'boolean' || typeof value.live !== 'boolean') throw Error('invalid_settings')
  return { message: value.message, ready: value.ready, live: value.live }
}
export function startupDelay(value = '0') {
  const ms = Number(value)
  if (!Number.isInteger(ms) || ms < 0 || ms > 12000) throw Error('invalid_startup_delay')
  return ms
}
export function createApi(context) {
  return createServer(async (req, res) => {
    let status = 200, body
    const url = new URL(req.url ?? '/', 'http://api')
    if (req.method !== 'GET') { status = 405; res.setHeader('allow', 'GET'); body = { error: 'method_not_allowed' } }
    else if (url.pathname === '/startup') { status = context.initialized() ? 200 : 503; body = { initialized: context.initialized() } }
    else if (url.pathname === '/live') {
      let live = true
      // A dedicated fault fixture; missing configuration is a readiness failure.
      try { live = (await context.settings()).live } catch {}
      status = context.initialized() && live ? 200 : 503; body = { live: status === 200 }
    } else if (['/ready', '/catalogue', '/work'].includes(url.pathname)) {
      try {
        const settings = await context.settings()
        if (!context.initialized() || !settings.ready || !context.credentialConfigured) throw Error('not_ready')
        if (url.pathname === '/work') {
          const ms = Number(url.searchParams.get('ms') ?? '0')
          if (!Number.isInteger(ms) || ms < 0 || ms > 40) { status = 400; body = { error: 'invalid_work_duration' } }
          else { const until = performance.now() + ms; while (performance.now() < until) {} body = { worked: true, version: context.version } }
        } else body = url.pathname === '/ready' ? { ready: true } : { message: settings.message, envMessage: context.envMessage, version: context.version, pod: context.pod, credentialConfigured: true }
      } catch { status = 503; body = { error: 'not_ready' } }
    } else { status = 404; body = { error: 'not_found' } }
    res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body))
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let initialized = false
  setTimeout(() => { initialized = true }, startupDelay(process.env.STARTUP_DELAY_MS))
  const server = createApi({ settings: async () => parseSettings(await readFile('/config/settings.json', 'utf8')),
    initialized: () => initialized, envMessage: process.env.ENV_MESSAGE, credentialConfigured: Boolean(process.env.LAB_CREDENTIAL),
    version: (await readFile('/app/version.txt', 'utf8')).trim(), pod: process.env.HOSTNAME })
  server.listen(3000, '0.0.0.0')
  process.on('SIGTERM', () => server.close(() => process.exit(0)))
}
