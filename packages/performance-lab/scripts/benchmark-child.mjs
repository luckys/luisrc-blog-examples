import { performance } from 'node:perf_hooks'
import assert from 'node:assert/strict'
import { makeDataset, calculateSlow, calculateIndexed } from '../src/workload.ts'

const data = makeDataset()
const expected = data.payments.reduce((sum, row, index) => sum + row.minor * (10000 + index % 1000), 0)
const functions = { slow: calculateSlow, indexed: calculateIndexed }
const samples = []
for (let warm = 0; warm < 3; warm++)
  for (const fn of Object.values(functions)) assert.equal(fn(data.payments, data.rates), expected)
for (let round = 0; round < 7; round++) {
  const order = round % 2 === 0 ? ['slow', 'indexed'] : ['indexed', 'slow']
  for (const variant of order) {
    const before = performance.now()
    const checksum = functions[variant](data.payments, data.rates)
    const ms = performance.now() - before
    assert.equal(checksum, expected)
    samples.push({ round, variant, ms, checksum })
  }
}
console.log(JSON.stringify({ warmupCallsPerVariant: 3, measuredCallsPerVariant: 7,
  payments: data.payments.length, rates: data.rates.length, samples }))
