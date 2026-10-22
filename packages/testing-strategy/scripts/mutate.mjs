import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('../', import.meta.url))
const mutations = [
  { name: 'start cancela en vez de ejecutar', file: 'src/transitions.ts', before: "queued: { start: 'running'", after: "queued: { start: 'cancelled'" },
  { name: 'un éxito acepta un fallo tardío', file: 'src/transitions.ts', before: "succeeded: { succeed: 'succeeded' }", after: "succeeded: { succeed: 'succeeded', fail: 'failed' }" },
  { name: 'running acepta cancelación inmediata', file: 'src/transitions.ts', before: "running: { succeed: 'succeeded', fail: 'failed' }", after: "running: { succeed: 'succeeded', fail: 'failed', cancel: 'cancelled' }" },
  { name: 'un cambio no incrementa versión', file: 'src/machine.ts', before: 'version: job.version + 1', after: 'version: job.version' },
]

function run(directory, suite) {
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', `tests/${suite}.test.mjs`], {
    cwd: directory, encoding: 'utf8', timeout: 10000,
  })
  assert.ifError(result.error)
  assert.equal(result.signal, null)
  return result
}
for (const suite of ['weak', 'core']) assert.equal(run(root, suite).status, 0, `baseline ${suite}`)
const results = []
for (const mutation of mutations) {
  const directory = await mkdtemp(join(tmpdir(), 'editorial-mutant-'))
  try {
    await cp(join(root, 'src'), join(directory, 'src'), { recursive: true })
    await cp(join(root, 'tests'), join(directory, 'tests'), { recursive: true })
    await cp(join(root, 'package.json'), join(directory, 'package.json'))
    const path = join(directory, mutation.file)
    const original = await readFile(path, 'utf8')
    assert.equal(original.split(mutation.before).length, 2, 'Mutación única y vigente')
    await writeFile(path, original.replace(mutation.before, mutation.after))
    const weak = run(directory, 'weak')
    const strong = run(directory, 'core')
    assert.equal(weak.status, 0, weak.stdout + weak.stderr)
    assert.equal(strong.status, 1, strong.stdout + strong.stderr)
    assert.match(strong.stdout, /ERR_ASSERTION/)
    assert.doesNotMatch(strong.stdout + strong.stderr, /ERR_MODULE_NOT_FOUND|SyntaxError/)
    results.push({ ...mutation, weak: 'passed',
      weakScope: mutation.file === 'src/transitions.ts' ? 'executed_file' : 'outside_coverage_scope', strong: 'killed',
      firstFailingTest: strong.stdout.match(/^not ok \d+ - (.+)$/m)?.[1] })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
const sources = {}
for (const file of ['src/transitions.ts', 'src/machine.ts', 'tests/core.test.mjs', 'tests/weak.test.mjs'])
  sources[file] = createHash('sha256').update(await readFile(join(root, file))).digest('hex')
await mkdir(join(root, 'evidence'), { recursive: true })
await writeFile(join(root, 'evidence/mutations.json'), JSON.stringify({
  node: process.version, baseline: { weak: 'passed', core: 'passed' }, sources,
  scope: 'Cuatro mutaciones manuales seleccionadas. No ejecución de Stryker ni score global.', results,
}, null, 2) + '\n')
console.log('4 mutaciones: la suite débil pasa; el núcleo las detecta. Tres en el archivo ejecutado y una fuera de ese scope.')
