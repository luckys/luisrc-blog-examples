import { readFile, readdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { summarize, percentile } from '../src/statistics.ts'
import { groupWindows } from '../src/windows.ts'
import { fingerprint } from './measurement-hashes.mjs'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))
const tests = (await readdir('tests')).filter((name) => name.endsWith('.test.mjs')).toSorted()
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...tests.map((name) => `tests/${name}`)], {
  encoding: 'utf8', timeout: 15_000, maxBuffer: 1_000_000,
})
if (result.error) throw result.error
assert.equal(result.status, 0, result.stdout + result.stderr)
assert.match(result.stdout, /^# pass 10$/m)
const load = JSON.parse(await readFile('evidence/load.json'))
const profiles = JSON.parse(await readFile('evidence/profiles.json'))
for (const report of [load, profiles])
  assert.deepEqual(await fingerprint(Object.keys(report.sources)), report.sources, 'measurement sources changed: rerun measurement')
assert.equal(load.stages.length, 7)
for (const stage of load.stages) {
  const recalculated = summarize(stage.samples, stage.seconds)
  for (const [key, value] of Object.entries(recalculated)) assert.deepEqual(stage[key], value, `${stage.plan.name}/${key}`)
  assert.equal(stage.exit, stage.plan.expected)
  if (stage.plan.name.startsWith('open-350')) { assert.ok(stage.errors > 0); assert.equal(stage.dropped, 0) }
  if (stage.plan.name === 'generator-starved') { assert.ok(stage.dropped > 0); assert.equal(stage.errors, 0) }
  if (stage.exit === 0) { assert.equal(stage.errors, 0); assert.equal(stage.dropped, 0) }
}
assert.equal(profiles.benchmarks.length, 3)
const checksum = profiles.benchmarks[0].samples[0].checksum
for (const run of profiles.benchmarks) {
  assert.equal(run.samples.length, 14)
  assert.equal(run.warmupCallsPerVariant, 3)
  for (const sample of run.samples) { assert.equal(sample.checksum, checksum); assert.ok(sample.ms > 0) }
}
for (const [index, cpu] of [...profiles.cpu, profiles.cpuDiagnostic].entries()) {
  const name = ['slow', 'indexed', 'slow-no-inlining'][index]
  const bytes = await readFile(`evidence/profiles/${name}.cpuprofile`)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), cpu.profileSha256)
  const profile = JSON.parse(bytes)
  assert.equal(profile.samples.length, cpu.samples)
  assert.equal(profile.timeDeltas.length, cpu.samples)
  assert.equal(cpu.checksum, checksum * 100)
  assert.ok(cpu.samples > 0)
}
assert.ok(profiles.cpuDiagnostic.selfMicroseconds.some(([name]) => name === 'findRateSlow'))
assert.deepEqual(profiles.memory.map((row) => row.samples.map((s) => s.entries)), [[500, 1500, 0], [100, 100, 0]])
const publicData = JSON.parse(await readFile('measurements.json'))
for (const [index, row] of publicData.stages.entries()) {
  const original = load.stages[index]
  for (const key of ['requests', 'successes', 'errors', 'dropped', 'success', 'all']) assert.deepEqual(row[key], original[key])
  if (row.name === 'steady-60s')
    assert.deepEqual(row.windows, groupWindows(original.samples).map(({ fromSecond, complete, requests, success, errors }) => ({ fromSecond, complete, requests, success, errors })))
}
for (const [index, row] of publicData.benchmarks.entries()) {
  const original = profiles.benchmarks[index]
  assert.equal(row.slowMedianMs, percentile(original.samples.filter((s) => s.variant === 'slow').map((s) => s.ms), 0.5))
  assert.equal(row.indexedMedianMs, percentile(original.samples.filter((s) => s.variant === 'indexed').map((s) => s.ms), 0.5))
}
const sources = {}
for (const dir of ['src', 'tests', 'scripts', 'k6'])
  for (const file of (await readdir(dir)).toSorted()) {
    const path = `${dir}/${file}`
    sources[path] = createHash('sha256').update(await readFile(path)).digest('hex')
  }
await writeFile('evidence/verification.json', JSON.stringify({ tests: 10, status: 'passed',
  measuredLoadStages: 7, benchmarkProcesses: 3, cpuProfiles: 3, heapSnapshots: 6,
  rawHeapsCommitted: false, longSoakExecuted: false, sources }, null, 2) + '\n')
console.log('10 tests and archived measurements verified without rerunning load benchmarks')
