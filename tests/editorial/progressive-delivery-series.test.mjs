import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'
import { bucket, rolloutDecision } from '../../packages/progressive-delivery/src/rollout.ts'

const root = 'packages/progressive-delivery/'
const manifest = JSON.parse(await readFile(blogPath('docs/editorial/progressive-delivery-series.json')))
const ids = ['P063', 'CD-ARTIFACTS', 'CD-FLAGS', 'CD-SMOKE', 'CD-ROLLING', 'CD-BLUEGREEN', 'CD-CANARY', 'CD-ROLLBACK']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({ entry,
  source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8') })))
const evidence = JSON.parse(await readFile(root + 'evidence/delivery.json'))
const event = (id) => evidence.events.find((e) => e.id === id).facts
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('CI/CD: ocho drafts por concepto, orden previo y fuentes fuera del blog', async () => {
  assert.deepEqual(manifest.articles.map((a) => a.id), ids)
  const known = new Set()
  for (const file of await readdir(blogPath('src/content/posts/es'))) {
    const source = await readFile(blogPath(`src/content/posts/es/${file}`), 'utf8')
    known.add(YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]).id)
  }
  const seen = new Set(); let date = -Infinity
  for (const { entry, source } of posts) {
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
    for (const key of ['id', 'title', 'slug', 'prerequisites']) assert.deepEqual(meta[key], entry[key])
    assert.equal(meta.locale, 'es'); assert.equal(meta.author, 'Luis Ramírez Calle')
    assert.equal(meta.series, manifest.name); assert.equal(meta.draft, true); assert.equal(meta.status, 'draft')
    assert.ok(new Date(meta.published).valueOf() > date); date = new Date(meta.published).valueOf()
    for (const id of meta.prerequisites) { assert.ok(known.has(id), id); if (ids.includes(id)) assert.ok(seen.has(id)) }
    seen.add(entry.id); assert.doesNotMatch(source, /—/)
    for (const h of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias']) assert.ok(source.includes(h), entry.id)
    for (const file of entry.files) await access(root + file)
  }
  assert.match(posts[0].source, /No es un analizador general/)
  assert.match(posts[3].source, /prueba negativa forzada/)
  assert.match(posts[4].source, /no afirma haber probado drenaje completo/)
  assert.match(posts[6].source, /No es una muestra aleatoria/)
})

test('CI/CD: catorce extractos ejecutables coinciden con las fuentes probadas', async () => {
  const sources = [await readFile(root + 'Dockerfile', 'utf8')]
  for (const dir of ['src', 'scripts', 'tests', 'sql'])
    for (const file of await readdir(root + dir)) sources.push(await readFile(`${root}${dir}/${file}`, 'utf8'))
  const code = compact(sources.join('\n')); let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript|dockerfile|sql)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: snippet`); count++
    }
  assert.equal(count, 14)
})

test('CI/CD: ocho diagramas y gráfico declaran dimensiones y datos verificables', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    await access(blogPath(`assets/progressive-delivery/${entry.id}.d2`))
    for (const [, path, alt, width, height] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath(`public${path}`), 'utf8')
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); count++
    }
  }
  assert.equal(count, 9)
  const svg = await readFile(root + 'canary-outcomes.svg', 'utf8')
  assert.ok(svg.includes('HTTP 200: 180/180')); assert.ok(svg.includes('Precio correcto: 0/20'))
  assert.ok(svg.includes('Escala de 0 a 100 %'))
})

test('CI/CD: ocho gates locales y contenido efectivamente ejecutado por slot', async () => {
  assert.equal(evidence.kind, 'local_progressive_delivery_observation')
  assert.equal(Object.keys(evidence.sources).length, 26)
  for (const [file, sha] of Object.entries(evidence.sources))
    assert.equal(createHash('sha256').update(await readFile(root + file)).digest('hex'), sha, file)
  assert.equal(evidence.events.length, 18)
  for (const [i, e] of evidence.events.entries()) {
    assert.equal(e.seq, i + 1); assert.equal(e.kind, 'observed')
    if (i) assert.ok(e.elapsedMs >= evidence.events[i - 1].elapsedMs)
  }
  const pipeline = event('pipeline_completed'), { stable, candidate } = pipeline.artifacts
  assert.equal(pipeline.kind, 'local_pipeline_not_remote_ci'); assert.equal(pipeline.stages.length, 8)
  assert.ok(pipeline.stages.every((s) => s.status === 'passed'))
  assert.deepEqual(pipeline.audit.advisories, {}); assert.equal(pipeline.audit.metadata.vulnerabilities.high, 0)
  assert.equal(pipeline.audit.metadata.vulnerabilities.critical, 0)
  assert.equal(pipeline.promotion, 'not_granted_negative_fixture'); assert.notEqual(stable.id, candidate.id)
  assert.deepEqual(event('candidate_deployed_dark').runningImages, { a: stable.id, b: stable.id, green: candidate.id })
  assert.ok(event('candidate_deployed_dark').responses.every((r) => r.slot !== 'green'))
  assert.equal(event('rolling_first_slot').slotAImage, candidate.id)
  assert.equal(event('rolling_first_slot').slotBImage, stable.id)
  assert.deepEqual(new Set(event('rolling_first_slot').responses.map((r) => r.body.revision)), new Set(['v1', 'v2-regression-fixture']))
  assert.ok(event('rolling_all_slots').responses.every((r) => r.body.revision === 'v2-regression-fixture'))
  assert.ok(event('blue_green_switch').beforeSwitch.every((r) => r.body.revision === 'v1'))
  assert.ok(event('blue_green_switch').smoke.cases.every((c) => c.response.body.revision === 'v2-regression-fixture'))
  assert.notEqual(event('blue_green_switch').blueImage, event('blue_green_switch').greenImage)
  assert.equal(event('blue_green_switch').clientOverride.body.featureEnabled, false)
  assert.ok(event('blue_restored').responses.every((r) => r.body.revision === 'v1'))
})

test('CI/CD: cohortes reales sintéticas, retirada y datos conservados tras rollback', () => {
  const canary = event('canary_exposed'); assert.equal(canary.samples.length, 200)
  assert.equal(canary.sampling, 'synthetic_stratified_two_keys_per_bucket_not_production')
  const buckets = new Map()
  for (const s of canary.samples) {
    assert.equal(s.bucket, bucket(s.key)); buckets.set(s.bucket, (buckets.get(s.bucket) ?? 0) + 1)
    assert.equal(s.status, 200); assert.equal(s.slot === 'green', s.bucket < 10)
    assert.equal(s.bad, s.priceCents !== 10000 || s.id !== 'book-1')
  }
  assert.equal(buckets.size, 100); assert.ok([...buckets.values()].every((n) => n === 2))
  assert.deepEqual(canary.candidate, { total: 20, bad: 20 }); assert.deepEqual(canary.control, { total: 180, bad: 0 })
  assert.equal(rolloutDecision(canary.candidate, canary.control), canary.decision); assert.equal(canary.decision, 'rollback')
  assert.equal(event('canary_rollback').smoke.ok, true)
  assert.equal(event('forced_negative_release').bypassedSmokeGate, true); assert.equal(event('forced_negative_release').smoke.ok, false)
  assert.equal(event('flag_disabled').imageStill, event('pipeline_completed').artifacts.candidate.id)
  assert.equal(event('flag_disabled').smoke.ok, true)
  assert.equal(event('image_rollback').runningImage, event('pipeline_completed').artifacts.stable.id)
  assert.equal(event('image_rollback').oldReadsNew.body.priceCents, 2345)
  assert.equal(event('image_rollback').smoke.ok, true)
  assert.equal(event('unsafe_contract_rejected').sqlstate, '42703')
  assert.deepEqual(event('rollback_integrity').columns, ['id', 'name', 'price_cents', 'display_name'])
  assert.equal(event('rollback_integrity').afterRows.length, 5)
  assert.deepEqual(event('rollback_integrity').afterRows.filter((r) => r.id !== 'after-rollback'), event('rollback_integrity').beforeRows)
  assert.equal(event('rollback_integrity').smoke.ok, true)
  assert.equal(event('cleanup').routerClosed, true); assert.deepEqual(event('cleanup').remaining, { container: '', volume: '', network: '' })
  assert.ok(Object.values(evidence.limits).every((v) => v === false))
})

test('CI/CD: cuatro exports canónicos, visor con cohortes/paginación sin control remoto', async () => {
  const exports = JSON.parse(await readFile('metadata/blog-exports.json'))
  const selected = exports.filter((e) => e.source.startsWith(root)); assert.equal(selected.length, 4)
  for (const e of selected) assert.deepEqual(await readFile(e.source), await readFile(blogPath(e.destination)))
  assert.deepEqual(JSON.parse(await readFile(root + 'replay.json')).events, evidence.events)
  const viewer = await readFile(root + 'explorer.mjs', 'utf8')
  assert.equal([...viewer.matchAll(/\bfetch\(/g)].length, 1); assert.match(viewer, /fetch\('replay.json'\)/)
  assert.doesNotMatch(viewer, /WebSocket|innerHTML/); assert.match(viewer, /No capturado/)
  assert.match(viewer, /pageSize = 12/); assert.match(viewer, /cohort === 'candidate'/)
})
