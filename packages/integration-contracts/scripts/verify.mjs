import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'

const root = fileURLToPath(new URL('../', import.meta.url))
const runId = randomUUID()
const results = []
const cases = []
let cleanupRemaining
try {
  for (const [name, files] of [
    ['core', ['tests/core.test.mjs']],
    ['consumer', ['tests/consumer.test.mjs']],
    ['postgres', ['tests/postgres.test.mjs']],
  ]) {
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-concurrency=1', ...files], {
      cwd: root, encoding: 'utf8', timeout: 150000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, EDITORIAL_CONTRACT_RUN: runId, PACT_DO_NOT_TRACK: '1' },
    })
    if (result.status !== 0) process.stdout.write(result.stdout + result.stderr)
    assert.ifError(result.error)
    assert.equal(result.status, 0, `${name} no pasó`)
    const tests = Number(result.stdout.match(/^# tests (\d+)$/m)?.[1])
    assert.ok(tests > 0)
    results.push({ name, tests, status: 'passed' })
    for (const match of result.stdout.matchAll(/^# INTEGRATION_EVIDENCE (.+)$/gm)) cases.push(JSON.parse(match[1]))
    console.log(`${name}: ${tests} tests pasan`)
  }
} finally {
  // Recuperación acotada si un timeout mata al proceso de tests antes de su finally.
  const ids = execFileSync('docker', ['ps', '--all', '--quiet', '--filter', `label=dev.luisrc.contract-run=${runId}`], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean)
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{12,64}$/)
    const inspect = JSON.parse(execFileSync('docker', ['inspect', id], { encoding: 'utf8' }))[0]
    assert.equal(inspect.Config.Labels['dev.luisrc.contract-run'], runId)
    assert.equal(inspect.Config.Labels['dev.luisrc.contracts'], 'integration-contracts')
    execFileSync('docker', ['rm', '--force', '--volumes', id], { stdio: 'ignore' })
  }
  cleanupRemaining = execFileSync('docker', ['ps', '--all', '--quiet', '--filter', `label=dev.luisrc.contract-run=${runId}`], { encoding: 'utf8' }).trim()
  assert.equal(cleanupRemaining, '')
}
assert.equal(cases.length, 9)
const pact = JSON.parse(await readFile(root + 'contracts/ReceiptWidget-OrdersApi.json'))
assert.equal(pact.interactions.length, 2)
const sources = {}
for (const directory of ['src', 'tests', 'scripts', 'sql', 'schemas', 'contracts'])
  for (const file of (await readdir(root + directory)).toSorted()) {
    const path = `${directory}/${file}`
    sources[path] = createHash('sha256').update(await readFile(root + path)).digest('hex')
  }
const pkg = JSON.parse(await readFile(root + 'package.json'))
await mkdir(root + 'evidence', { recursive: true })
await writeFile(root + 'evidence/verification.json', JSON.stringify({
  node: process.version,
  versions: { pact: pkg.devDependencies['@pact-foundation/pact'], testcontainers: pkg.devDependencies.testcontainers, pg: pkg.dependencies.pg },
  image: 'postgres:18-alpine@sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15',
  topology: 'Docker local, bind 127.0.0.1, tmpfs, PostgreSQL real, schemas por escenario y HTTP loopback.',
  cleanup: { remainingOwnedContainers: 0 },
  limits: 'Sin Pact Broker/publicación, CI deploy matrix, datos de usuario, HA, pérdida eléctrica o benchmark.',
  sources, results, cases,
}, null, 2) + '\n')
console.log('Evidencia guardada: nueve casos de PostgreSQL/HTTP/Pact; ningún contenedor propio pendiente.')
