import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { estimate } from '../src/costs.ts'
import { hashes } from './hashes.mjs'
import { extractRates } from './pricing.mjs'
const json = async (file) => JSON.parse(await readFile(file))
const report = await json('evidence/comparison.json')
assert.deepEqual(report.sources, await hashes())
assert.deepEqual(report.pricing.rates, extractRates(await json('pricing/catalogue-excerpts.json')))
assert.equal(report.pricing.region, 'us-east-1'); assert.equal(report.pricing.currency, 'USD')
assert.equal(report.cases.length, 2)
for (const c of report.cases) {
  assert.deepEqual(c.result, estimate(c.input, report.pricing.rates))
  assert.equal(c.result.capacityValidated, false)
}
assert.deepEqual(report.observations.map((o) => o.http.status), [200, 404, 405, 503])
for (const o of report.observations) {
  assert.equal(o.lambdaInvocation, 'local_adapter_only_not_AWS')
  assert.deepEqual(o.http.body, JSON.parse(o.localLambda.body))
}
assert.equal(report.contracts.dbReview.restoreVerified, false)
assert.deepEqual(report.contracts.queueResult.batchItemFailures, [{ itemIdentifier: 'b' }])
assert.equal(report.serverClosed, true); assert.ok(Object.values(report.limits).every((v) => v === false))
const publicData = await json('comparison.json')
assert.deepEqual(publicData.cases, report.cases); assert.deepEqual(publicData.observations, report.observations)
console.log('Tarifas, cálculos, contratos y hashes verificados offline; no se consultó ni desplegó AWS.')
