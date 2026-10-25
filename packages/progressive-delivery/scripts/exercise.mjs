import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { hashes } from './hashes.mjs'
import { runPipeline } from './pipeline.mjs'
import { startRouter } from './router-fixture.mjs'
import { smoke } from './smoke.mjs'
import { bucket, rolloutDecision } from '../src/rollout.ts'
import { checkSmoke } from '../src/gates.ts'

const run = promisify(execFile)
const project = `luisrc-delivery-${randomUUID().slice(0, 8)}`
const env = { ...process.env }
const command = (...args) => run('docker', args, { env, timeout: 180000, maxBuffer: 8e6 })
const docker = async (...args) => (await command(...args)).stdout.trim()
const compose = (...args) => docker('compose', '-p', project, ...args)
const json = async (...args) => JSON.parse(await docker(...args))
const imageOf = async (slot) => (await json('inspect', await compose('ps', '-q', slot)))[0].Image
const endpoint = async (slot) => `http://${await compose('port', slot, '3000')}`
const upstreams = async () => Object.fromEntries(await Promise.all(['a', 'b', 'green'].map(async (s) => [s, await endpoint(s)])))
const sql = (text) => compose('exec', '-T', 'postgres', 'psql', '-X', '-U', 'lab', '-d', 'delivery_lab', '-v', 'ON_ERROR_STOP=1', '-Atc', text)
const sqlFile = (name) => compose('exec', '-T', 'postgres', 'psql', '-X', '-U', 'lab', '-d', 'delivery_lab', '-v', 'ON_ERROR_STOP=1', '-f', `/lab/sql/${name}`)
const rows = async () => (await sql('SELECT row_to_json(t) FROM (SELECT id,name,display_name,price_cents FROM products ORDER BY id) t')).split('\n').filter(Boolean).map((s) => JSON.parse(s))
const columns = async () => (await sql("SELECT column_name FROM information_schema.columns WHERE table_name='products' AND table_schema='public' ORDER BY ordinal_position")).split('\n')
const sources = await hashes(), events = [], started = performance.now()
await mkdir('.artifacts', { recursive: true }); await mkdir('evidence', { recursive: true })
const record = async (id, facts) => {
  events.push({ seq: events.length + 1, id, kind: 'observed', at: new Date().toISOString(), elapsedMs: performance.now() - started, facts })
  await writeFile('.artifacts/checkpoint.json', JSON.stringify({ partial: true, project, sources, events }, null, 2) + '\n')
  console.log(id)
}
const request = async (origin, path = '/products/book-1', options = {}) => {
  const r = await fetch(origin + path, { ...options, signal: AbortSignal.timeout(4000) })
  return { status: r.status, body: await r.json(), slot: r.headers.get('X-Lab-Slot'), routeRevision: r.headers.get('X-Lab-Route') }
}
const post = (origin, product) => request(origin, '/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) })
let router, ownsProject = false, pipeline
let routerClosed = false
try {
  pipeline = await runPipeline(project)
  const stable = pipeline.artifacts.stable.id, candidate = pipeline.artifacts.candidate.id
  assert.notEqual(stable, candidate)
  Object.assign(env, { SLOT_A_IMAGE: stable, SLOT_B_IMAGE: stable, GREEN_IMAGE: candidate })
  for (const type of ['container', 'volume', 'network']) assert.equal(await docker(type, 'ls', '-q', '--filter', `label=com.docker.compose.project=${project}`), '')
  ownsProject = true
  await record('pipeline_completed', pipeline)
  await compose('up', '-d', '--wait', '--wait-timeout', '90', 'postgres')
  await sqlFile('01-schema.sql')
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-deps', 'a', 'b')
  const baseline = await smoke(await endpoint('a')); assert.equal(baseline.ok, true)
  await record('baseline_schema', { smoke: baseline, columns: await columns(), rows: 2 })
  await sqlFile('02-expand.sql')
  const oldWrite = await post(await endpoint('a'), { id: 'legacy-after-expand', name: 'Escrita por v1', priceCents: 1234 })
  assert.equal(oldWrite.status, 201)
  await record('schema_expanded', { columns: await columns(), oldWrite, rows: await rows() })
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-deps', 'green')
  const darkImages = { a: await imageOf('a'), b: await imageOf('b'), green: await imageOf('green') }
  assert.deepEqual(darkImages, { a: stable, b: stable, green: candidate })
  router = await startRouter(await upstreams())
  const setRoute = async (route) => {
    const result = await router.route(route, await upstreams()); assert.equal(result.ok, true); return result
  }
  const state = (slots, featureEnabled = false, canaryPercent = 0) => ({ slots, featureEnabled, canaryPercent })
  const probe = async (count = 4) => {
    const responses = []
    for (let i = 0; i < count; i++) responses.push(await request(router.origin))
    return responses
  }
  const good = (responses) => responses.every((r) => checkSmoke(r, 'book-1', 10000))
  const newReadOldWrite = await request(await endpoint('green'), '/products/legacy-after-expand')
  assert.equal(newReadOldWrite.body.priceCents, 1234); assert.equal(newReadOldWrite.body.name, 'Escrita por v1')
  const dark = await probe(); assert.equal(good(dark), true); assert.ok(dark.every((r) => r.slot !== 'green'))
  await record('candidate_deployed_dark', { routerPid: router.pid, candidateImage: candidate, runningImages: darkImages, newReadOldWrite, responses: dark })
  const candidateSmoke = await smoke(await endpoint('green')); assert.equal(candidateSmoke.ok, true)
  await record('smoke_flag_off', { smoke: candidateSmoke, limitation: 'flag_off_does_not_test_flag_on' })
  await setRoute(state(['b']))
  env.SLOT_A_IMAGE = candidate
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-deps', '--force-recreate', 'a')
  const firstRoute = await setRoute(state(['a', 'b']))
  const mixed = await probe(); assert.equal(good(mixed), true)
  assert.deepEqual(new Set(mixed.map((r) => r.body.revision)), new Set(['v1', 'v2-regression-fixture']))
  assert.equal(await imageOf('a'), candidate); assert.equal(await imageOf('b'), stable)
  await record('rolling_first_slot', { route: firstRoute, slotAImage: await imageOf('a'), slotBImage: await imageOf('b'), responses: mixed })
  await setRoute(state(['a']))
  env.SLOT_B_IMAGE = candidate
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-deps', '--force-recreate', 'b')
  const allRoute = await setRoute(state(['a', 'b']))
  const all = await probe(); assert.equal(good(all), true); assert.ok(all.every((r) => r.body.revision === 'v2-regression-fixture'))
  assert.equal(await imageOf('a'), candidate); assert.equal(await imageOf('b'), candidate)
  await record('rolling_all_slots', { route: allRoute, image: candidate, responses: all })
  // Preparar otro experimento: blue vuelve a v1 antes de conmutar a green v2.
  await setRoute(state(['green']))
  env.SLOT_A_IMAGE = stable; env.SLOT_B_IMAGE = stable
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-deps', '--force-recreate', 'a', 'b')
  await setRoute(state(['a', 'b']))
  const beforeSwitch = await probe()
  assert.equal(good(beforeSwitch), true); assert.ok(beforeSwitch.every((r) => r.body.revision === 'v1'))
  const switched = await setRoute(state(['green']))
  const switchedSmoke = await smoke(router.origin); assert.equal(switchedSmoke.ok, true)
  const clientOverride = await request(router.origin, '/products/book-1', { headers: { 'x-lab-price-v2': '1' } })
  assert.equal(clientOverride.body.featureEnabled, false); assert.equal(clientOverride.body.priceCents, 10000)
  await record('blue_green_switch', { beforeSwitch, blueImage: await imageOf('a'), greenImage: await imageOf('green'), route: switched, smoke: switchedSmoke, clientOverride })
  const restored = await setRoute(state(['a', 'b']))
  const restoredResponses = await probe()
  assert.equal(good(restoredResponses), true); assert.ok(restoredResponses.every((r) => r.body.revision === 'v1'))
  await record('blue_restored', { route: restored, responses: restoredResponses })
  const canaryRoute = await setRoute(state(['a', 'b'], true, 10))
  const keys = new Map()
  for (let n = 0; [...keys.values()].reduce((sum, v) => sum + v.length, 0) < 200 && n < 100000; n++) {
    const key = `synthetic-${n}`, b = bucket(key), values = keys.get(b) ?? []
    if (values.length < 2) { values.push(key); keys.set(b, values) }
  }
  assert.equal(keys.size, 100)
  const samples = []
  for (const [b, values] of [...keys].sort((a, b) => a[0] - b[0]))
    for (const key of values) {
      const response = await request(router.origin, '/products/book-1', { headers: { 'x-lab-key': key } })
      const bad = !checkSmoke(response, 'book-1', 10000)
      samples.push({ key, bucket: b, status: response.status, slot: response.slot,
        id: response.body.id, priceCents: response.body.priceCents, revision: response.body.revision, bad })
    }
  const group = (isCandidate) => {
    const selected = samples.filter((r) => (r.slot === 'green') === isCandidate)
    return { total: selected.length, bad: selected.filter((r) => r.bad).length }
  }
  const candidateSample = group(true), controlSample = group(false)
  assert.deepEqual(candidateSample, { total: 20, bad: 20 }); assert.deepEqual(controlSample, { total: 180, bad: 0 })
  assert.ok(samples.every((r) => r.status === 200))
  const decision = rolloutDecision(candidateSample, controlSample); assert.equal(decision, 'rollback')
  await record('canary_exposed', { route: canaryRoute, sampling: 'synthetic_stratified_two_keys_per_bucket_not_production', samples, candidate: candidateSample, control: controlSample, decision })
  const backedOut = await setRoute(state(['a', 'b']))
  const recovered = await smoke(router.origin); assert.equal(recovered.ok, true)
  await record('canary_rollback', { route: backedOut, smoke: recovered })
  // Prueba negativa deliberada: no es la promoción permitida por el gate anterior.
  const forced = await setRoute(state(['green'], true))
  const negative = await smoke(router.origin); assert.equal(negative.ok, false)
  assert.ok(negative.cases.every((c) => c.response.status === 200))
  await record('forced_negative_release', { negativeFixture: true, bypassedSmokeGate: true, route: forced, smoke: negative })
  const disabled = await setRoute(state(['green']))
  const disabledSmoke = await smoke(router.origin); assert.equal(disabledSmoke.ok, true)
  assert.equal(await imageOf('green'), candidate)
  await record('flag_disabled', { route: disabled, imageStill: await imageOf('green'), smoke: disabledSmoke })
  const newProduct = { id: 'new-from-v2', name: 'Escrita por v2', priceCents: 2345 }
  const newWrite = await post(await endpoint('green'), newProduct); assert.equal(newWrite.status, 201)
  const beforeRows = await rows(), beforeColumns = await columns()
  await record('candidate_write', { newWrite, rows: beforeRows, columns: beforeColumns })
  await setRoute(state(['a', 'b']))
  env.GREEN_IMAGE = stable
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-deps', '--force-recreate', 'green')
  const greenContainer = (await json('inspect', await compose('ps', '-q', 'green')))[0]
  assert.equal(greenContainer.Image, stable)
  const finalRoute = await setRoute(state(['green']))
  const oldReadsNew = await request(router.origin, '/products/new-from-v2')
  assert.equal(oldReadsNew.body.revision, 'v1'); assert.equal(oldReadsNew.body.priceCents, newProduct.priceCents)
  assert.equal(oldReadsNew.body.name, newProduct.name)
  const rollbackSmoke = await smoke(router.origin); assert.equal(rollbackSmoke.ok, true)
  await record('image_rollback', { route: finalRoute, from: candidate, to: stable, runningImage: greenContainer.Image, oldReadsNew, smoke: rollbackSmoke })
  const contract = await command('compose', '-p', project, 'exec', '-T', 'postgres', 'psql', '-X', '-U', 'lab', '-d', 'delivery_lab', '-v', 'ON_ERROR_STOP=1', '-f', '/lab/sql/03-unsafe-contract.sql')
  assert.ok(contract.stderr.includes('expected_undefined_column_42703'))
  assert.deepEqual(await columns(), beforeColumns); assert.deepEqual(await rows(), beforeRows)
  await record('unsafe_contract_rejected', { sqlstate: '42703', transactionRolledBack: true, columns: await columns() })
  const afterWrite = await post(await endpoint('green'), { id: 'after-rollback', name: 'Otra escritura v1', priceCents: 3456 })
  assert.equal(afterWrite.status, 201)
  const afterRows = await rows()
  assert.deepEqual(afterRows.filter((r) => r.id !== 'after-rollback'), beforeRows)
  const finalSmoke = await smoke(router.origin); assert.equal(finalSmoke.ok, true)
  await record('rollback_integrity', { beforeRows, afterRows, columns: await columns(), oldWriteAfterRollback: afterWrite, previousRowsEqual: true, smoke: finalSmoke })
  assert.deepEqual(await hashes(), sources)
} finally {
  if (router) { await router.close(); routerClosed = true }
  if (ownsProject) await compose('down', '--volumes', '--timeout', '6')
}
const remaining = {}
for (const type of ['container', 'volume', 'network']) {
  remaining[type] = await docker(type, 'ls', '-q', '--filter', `label=com.docker.compose.project=${project}`)
  assert.equal(remaining[type], '')
}
await record('cleanup', { remaining, routerClosed, retainedImages: pipeline.artifacts })
const evidence = { capturedAt: new Date().toISOString(), kind: 'local_progressive_delivery_observation', project, sources, events,
  engine: await docker('version', '--format', '{{.Server.Version}}'), compose: await docker('compose', 'version', '--short'),
  limits: { production: false, continuousAvailabilityProven: false, remoteCI: false, osVulnerabilityScan: false,
    realUserExperiment: false, registryPush: false, backupRestore: false, schemaContractCommitted: false } }
await writeFile('evidence/delivery.json', JSON.stringify(evidence, null, 2) + '\n')
await writeFile('replay.json', JSON.stringify({ capturedAt: evidence.capturedAt, kind: evidence.kind, events, limits: evidence.limits }, null, 2) + '\n')
console.log(`${events.length} fases, control/candidato y rollback SQL archivados; recursos propios cerrados.`)
