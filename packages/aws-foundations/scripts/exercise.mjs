import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { once } from 'node:events'
import { estimate } from '../src/costs.ts'
import { lambdaAdapter } from '../src/catalogue.ts'
import { createCatalogueServer } from '../src/http.ts'
import { catalogueReadPolicy, catalogueGetItemInput, documentKey, processStandardBatch, validatePrivateEcsNetwork, validateQueuePlan, reviewManagedDb } from '../src/contracts.ts'
import { extractRates } from './pricing.mjs'
import { hashes } from './hashes.mjs'

const run = promisify(execFile), json = async (file) => JSON.parse(await readFile(file))
await run('pnpm', ['run', 'build'], { timeout: 30000 })
await mkdir('evidence', { recursive: true })
const sources = await hashes(), price = await json('pricing/prices-us-east-1.json'), excerpts = await json('pricing/catalogue-excerpts.json')
assert.deepEqual(extractRates(excerpts), price.rates)
const scenarios = await json('scenarios.json')
const cases = scenarios.cases.map((scenario) => {
  const input = { ...scenarios.defaults, ...scenario.inputs }
  return { ...scenario, input, result: estimate(input, price.rates) }
})
const generated = await import(`../cost-model.mjs?capture=${Date.now()}`)
for (const c of cases) assert.deepEqual(generated.estimate(c.input, price.rates), c.result)
const designs = { lambda: await json('designs/lambda.json'), ecs: await json('designs/ecs.json') }
assert.equal(validatePrivateEcsNetwork(designs.ecs.network), true)
const queue = await json('designs/queue-plan.json'), db = await json('designs/rds-plan.json')
assert.equal(validateQueuePlan(queue), true)
const contracts = {
  kind: 'local_preflight_not_aws_enforcement', policy: catalogueReadPolicy('arn:aws:dynamodb:us-east-1:000000000000:table/catalogue'),
  getItemInput: catalogueGetItemInput('book-1'), objectKey: documentKey('tenant-a', 'report-1'),
  queueResult: await processStandardBatch([{ messageId: 'a', body: 'ok' }, { messageId: 'b', body: 'fail' }, { messageId: 'c', body: 'ok' }], async (body) => { if (body === 'fail') throw Error('fake_transient') }),
  dbReview: reviewManagedDb(db),
}
assert.equal(contracts.dbReview.restoreVerified, false)
const item = { id: 'book-1', name: 'Libro ficticio', priceCents: 10000 }
const reader = async (id) => { if (id === 'failure') throw Error('fake_dependency_offline'); return id === item.id ? item : null }
const invoke = lambdaAdapter(reader), server = createCatalogueServer(reader), observations = []
server.listen(0, '127.0.0.1'); await once(server, 'listening')
const origin = `http://127.0.0.1:${server.address().port}`
try {
  for (const [method, path, expected] of [['GET', '/catalogue/book-1', 200], ['GET', '/catalogue/missing', 404], ['POST', '/catalogue/book-1', 405], ['GET', '/catalogue/failure', 503]]) {
    const event = { rawPath: path, requestContext: { http: { method } } }
    const localLambda = await invoke(event)
    const response = await fetch(origin + path, { method, signal: AbortSignal.timeout(2000) })
    const http = { status: response.status, body: await response.json() }
    assert.equal(http.status, expected); assert.equal(localLambda.statusCode, expected)
    assert.deepEqual(http.body, JSON.parse(localLambda.body))
    observations.push({ method, path, http, localLambda, lambdaInvocation: 'local_adapter_only_not_AWS' })
  }
} finally { await new Promise((resolve) => server.close(resolve)) }
assert.deepEqual(await hashes(), sources)
const report = { capturedAt: new Date().toISOString(), kind: 'calculated_design_comparison_with_local_contract_observations',
  sources, pricing: price, designs, cases, contracts, observations, loopbackOrigin: origin, serverClosed: true,
  limits: { awsDeployment: false, awsPerformanceMeasured: false, awsIamEnforcementTested: false,
    realAwsBill: false, completeTco: false, databaseRestoreTested: false, actualSqsDeliveryTested: false } }
await writeFile('evidence/comparison.json', JSON.stringify(report, null, 2) + '\n')
await writeFile('comparison.json', JSON.stringify({ capturedAt: report.capturedAt, kind: report.kind, pricing: price, designs, cases,
  contracts, observations, serverClosed: true, limits: report.limits }, null, 2) + '\n')
console.log(`Dos diseños calculados, ${observations.length} contratos HTTP locales y cinco fuentes oficiales; cero despliegues AWS.`)
