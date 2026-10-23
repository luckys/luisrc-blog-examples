import { Session } from 'node:inspector/promises'
import { performance } from 'node:perf_hooks'
import { writeFile } from 'node:fs/promises'
import { setImmediate } from 'node:timers/promises'
import assert from 'node:assert/strict'
import { makeDataset, calculateSlow, calculateIndexed } from '../src/workload.ts'

const [variant, output] = process.argv.slice(2)
assert.ok(['slow', 'indexed'].includes(variant))
const data = makeDataset()
const calculate = variant === 'slow' ? calculateSlow : calculateIndexed
const expected = data.payments.reduce((sum, row, index) => sum + row.minor * (10000 + index % 1000), 0)
for (let i = 0; i < 3; i++) assert.equal(calculate(data.payments, data.rates), expected)
const session = new Session()
session.connect()
try {
  await session.post('Profiler.enable')
  await session.post('Profiler.setSamplingInterval', { interval: 1000 })
  await session.post('Profiler.start')
  const cpu = process.cpuUsage()
  const before = performance.now()
  let checksum = 0
  // Separate jobs by an event-loop turn, avoiding one top-level OSR loop that
  // attributed the entire initial profile to the module's anonymous frame.
  for (let i = 0; i < 100; i++) {
    checksum += calculate(data.payments, data.rates)
    await setImmediate()
  }
  const wallMs = performance.now() - before
  const used = process.cpuUsage(cpu)
  assert.equal(checksum, expected * 100)
  const { profile } = await session.post('Profiler.stop')
  await writeFile(output, JSON.stringify(profile))
  const weights = new Map()
  const names = new Map(profile.nodes.map((node) => [node.id, node.callFrame.functionName || '(anonymous)']))
  for (let i = 0; i < profile.samples.length; i++) {
    const name = names.get(profile.samples[i])
    weights.set(name, (weights.get(name) ?? 0) + profile.timeDeltas[i])
  }
  console.log(JSON.stringify({ variant, iterations: 100, checksum, wallMs,
    cpuMicroseconds: used.user + used.system, samplingIntervalMicroseconds: 1000,
    samples: profile.samples.length, selfMicroseconds: [...weights].sort((a, b) => b[1] - a[1]) }))
} finally { session.disconnect() }
