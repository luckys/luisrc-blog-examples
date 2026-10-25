import { checkSmoke } from '../src/gates.ts'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
export async function smoke(origin) {
  const url = new URL(origin)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) throw Error('loopback_required')
  const cases = []
  for (const [id, expected] of [['book-1', 10000], ['book-2', 99]]) {
    const r = await fetch(new URL(`/products/${id}`, origin), { signal: AbortSignal.timeout(3000) })
    const response = { status: r.status, body: await r.json() }
    cases.push({ id, expected, response, ok: checkSmoke(response, id, expected) })
  }
  return { ok: cases.every((c) => c.ok), cases }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await smoke(process.argv[2]); console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.ok ? 0 : 1
}
