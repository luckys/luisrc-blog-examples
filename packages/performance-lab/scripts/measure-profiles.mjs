import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { cpus, totalmem } from 'node:os'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { cleanEnv } from './child-fixture.mjs'
import { fingerprint, profileSources } from './measurement-hashes.mjs'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))
const sources = await fingerprint(profileSources)
await mkdir('.artifacts', { recursive: true })
const folder = await mkdtemp('.artifacts/profiles-')
const run = (args) => {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', env: cleanEnv(), timeout: 30_000, maxBuffer: 2_000_000 })
  if (result.error) throw result.error
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}
const benchmarks = []
for (let i = 0; i < 3; i++) benchmarks.push(run(['scripts/benchmark-child.mjs']))
const cpu = []
for (const variant of ['slow', 'indexed']) {
  const file = `${folder}/${variant}.cpuprofile`
  const result = run(['scripts/cpu-child.mjs', variant, file])
  result.profileSha256 = createHash('sha256').update(await readFile(file)).digest('hex')
  // Small CPU profiles are kept; raw heaps deliberately stay outside Git.
  await mkdir('evidence/profiles', { recursive: true })
  await writeFile(`evidence/profiles/${variant}.cpuprofile`, await readFile(file))
  cpu.push(result)
}
const memory = []
const diagnosticFile = `${folder}/slow-no-inlining.cpuprofile`
const cpuDiagnostic = run(['--no-turbo-inlining', 'scripts/cpu-child.mjs', 'slow', diagnosticFile])
cpuDiagnostic.flags = ['--no-turbo-inlining']
assert.ok(cpuDiagnostic.selfMicroseconds.some(([name]) => name === 'findRateSlow'))
cpuDiagnostic.profileSha256 = createHash('sha256').update(await readFile(diagnosticFile)).digest('hex')
await writeFile('evidence/profiles/slow-no-inlining.cpuprofile', await readFile(diagnosticFile))
for (const variant of ['unbounded', 'bounded']) memory.push(run(['--expose-gc', 'scripts/memory-child.mjs', variant, folder]))
await mkdir('evidence', { recursive: true })
assert.deepEqual(await fingerprint(profileSources), sources, 'sources changed during measurement')
await writeFile('evidence/profiles.json', JSON.stringify({ node: process.version,
  environment: { platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model,
    logicalCpus: cpus().length, hostMemoryBytes: totalmem(), isolatedCpu: false },
  benchmarks, cpu, cpuDiagnostic, memory, sources, rawHeapFolder: folder, rawHeapsCommitted: false,
  notes: 'same host, no confidence intervals; snapshots/forced GC are diagnostic only' }, null, 2) + '\n')
console.log('CPU/heap evidence written; raw heaps remain in ignored ' + folder)
