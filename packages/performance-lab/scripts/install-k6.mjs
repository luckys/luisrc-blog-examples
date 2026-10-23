import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile, chmod, rename } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

assert.equal(process.platform, 'linux', 'installer deliberately supports Linux x64 only')
assert.equal(process.arch, 'x64')
const version = '2.3.0'
const sha256 = '39c3117b6af817592dcd0ce4242105c0a7af10948c2a425306f0be8f7a8a8ab1'
const url = `https://github.com/grafana/k6/releases/download/v${version}/k6-v${version}-linux-amd64.tar.gz`
const folder = new URL('../.tools/', import.meta.url)
await mkdir(folder, { recursive: true })
const archive = new URL('k6.tar.gz', folder)
let bytes
try { bytes = await readFile(archive) }
catch (error) {
  if (error.code !== 'ENOENT') throw error
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  assert.equal(response.status, 200)
  assert.ok(Number(response.headers.get('content-length')) < 40_000_000)
  bytes = Buffer.from(await response.arrayBuffer())
}
assert.ok(bytes.length < 40_000_000)
assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256)
await writeFile(archive, bytes)
// Extract only the expected member to stdout: no archive paths written to disk.
const binary = execFileSync('tar', ['-xzOf', fileURLToPath(archive), `k6-v${version}-linux-amd64/k6`], { maxBuffer: 100_000_000 })
const staging = new URL('k6.pending', folder)
await writeFile(staging, binary)
await chmod(staging, 0o755)
await rename(staging, new URL('k6', folder))
console.log(`Installed official k6 ${version}; archive SHA-256 ${sha256}`)
