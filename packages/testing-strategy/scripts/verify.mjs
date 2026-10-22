import assert from 'node:assert/strict'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('../', import.meta.url))
const runs = [
  { name: 'core-service', args: ['--test', '--test-reporter=tap', 'tests/core.test.mjs', 'tests/service.test.mjs'] },
  { name: 'integration', args: ['--test', '--test-reporter=tap', 'tests/repositories.test.mjs', 'tests/http.test.mjs'] },
  { name: 'weak-coverage', args: ['--test', '--test-reporter=tap', '--experimental-test-coverage', '--test-coverage-include=src/transitions.ts', 'tests/weak.test.mjs'] },
]
const results = []
for (const run of runs) {
  const result = spawnSync(process.execPath, run.args, { cwd: root, encoding: 'utf8', timeout: 20000 })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const count = Number(result.stdout.match(/^# tests (\d+)$/m)?.[1])
  assert.ok(count > 0)
  results.push({ name: run.name, tests: count, command: ['node', ...run.args].join(' '), status: 'passed' })
  if (run.name === 'weak-coverage') {
    assert.match(result.stdout, /transitions\.ts\s*\|\s*100\.00\s*\|\s*100\.00\s*\|\s*100\.00/)
    results.at(-1).coverage = { file: 'src/transitions.ts', lines: 100, branches: 100, functions: 100 }
  }
  console.log(`${run.name}: ${count} tests pasan`)
}
const sources = {}
for (const directory of ['src', 'tests', 'scripts'])
  for (const name of (await readdir(root + directory)).toSorted()) {
    const file = `${directory}/${name}`
    sources[file] = createHash('sha256').update(await readFile(root + file)).digest('hex')
  }
await mkdir(root + 'evidence', { recursive: true })
await writeFile(root + 'evidence/verification.json', JSON.stringify({
  node: process.version, topology: 'Un proceso por archivo de tests; SQLite real, HTTP loopback con puerto efímero.',
  limits: 'Sin PostgreSQL, navegador de aplicación, Testcontainers, pérdida eléctrica o procesos escritores concurrentes.',
  sources, results,
}, null, 2) + '\n')
