import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import fc from 'fast-check'
import { paymentProperty } from '../tests/search-fixture.mjs'
import { assertRecovery, faultsArbitrary } from '../tests/recovery-fixture.mjs'
import { runRace } from '../src/concurrency.ts'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))
const testFiles = (await readdir('tests')).filter((file) => file.endsWith('.test.mjs')).toSorted()
const tests = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...testFiles.map((f) => `tests/${f}`)], {
  encoding: 'utf8', timeout: 30_000, maxBuffer: 2_000_000,
})
process.stdout.write(tests.stdout ?? '')
process.stderr.write(tests.stderr ?? '')
if (tests.error) throw tests.error
assert.equal(tests.status, 0)
const testCount = Number(tests.stdout.match(/^# pass (\d+)$/m)?.[1])
assert.equal(testCount, 15)

function summarize(result) {
  assert.equal(result.failed, true)
  assert.ok(result.errorInstance instanceof assert.AssertionError)
  return {
    seed: result.seed, path: result.counterexamplePath, runsBeforeFailure: result.numRuns,
    shrinks: result.numShrinks, counterexample: result.counterexample,
  }
}
const late = summarize(fc.check(paymentProperty('late-decline'), { seed: 5702, numRuns: 500 }))
assert.deepEqual(late.counterexample, [['submit', 'confirm', 'decline']])
const replay = fc.check(paymentProperty('late-decline'), { seed: late.seed, path: late.path, endOnFailure: true })
assert.equal(replay.failed, true)
assert.deepEqual(replay.counterexample, late.counterexample)
const duplicate = summarize(fc.check(paymentProperty('duplicate-capture'), { seed: 5702, numRuns: 500 }))
const unstable = summarize(fc.check(fc.property(faultsArbitrary, (faults) => assertRecovery(faults, false)), { seed: 5702, numRuns: 500 }))
const raceResult = await fc.check(fc.asyncProperty(fc.scheduler(), async (scheduler) => {
  assert.equal((await runRace(scheduler, false)).value, 2)
}), { seed: 5703, numRuns: 100 })
assert.equal(raceResult.failed, true)
assert.ok(raceResult.errorInstance instanceof assert.AssertionError)
const raceReplay = await fc.check(fc.asyncProperty(fc.scheduler(), async (scheduler) => {
  assert.equal((await runRace(scheduler, false)).value, 2)
}), { seed: raceResult.seed, path: raceResult.counterexamplePath, endOnFailure: true })
assert.equal(raceReplay.failed, true)
assert.ok(raceReplay.errorInstance instanceof assert.AssertionError)
const regression = await runRace(fc.schedulerFor([1, 2, 3, 4]), false)
assert.equal(regression.value, 1)
const sources = {}
for (const dir of ['src', 'tests', 'scripts'])
  for (const name of (await readdir(dir)).toSorted()) {
    const path = `${dir}/${name}`
    sources[path] = createHash('sha256').update(await readFile(path)).digest('hex')
  }
const report = {
  node: process.version, fastCheck: fc.__version, tests: testCount, status: 'passed',
  late, duplicate, unstable, replay: { sameCounterexample: true },
  race: { seed: raceResult.seed, path: raceResult.counterexamplePath, replayFailed: true,
    regression: { value: regression.value, report: regression.report } },
  mutations: { selectedDetected: 3, weakPropertySurvivor: 'duplicate-capture', automaticEngine: false },
  bounds: { sequenceLength: 40, byteArrayLength: 300, parserBytes: 256, realProcessCrash: false, network: false },
  sources,
}
await mkdir('evidence', { recursive: true })
await writeFile('evidence/verification.json', JSON.stringify(report, null, 2) + '\n')
console.log('Evidence written: evidence/verification.json')
