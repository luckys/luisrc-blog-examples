import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'

const root = 'packages/container-environments/'
const manifest = JSON.parse(await readFile(blogPath('docs/editorial/container-environments-series.json')))
const ids = ['P062', 'DOCKER-LAYERS', 'DOCKER-STAGES', 'DOCKER-COMPOSE', 'DOCKER-VOLUMES', 'DOCKER-SECURITY']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({ entry,
  source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8') })))
const evidence = JSON.parse(await readFile(root + 'evidence/compose.json'))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('Docker: seis drafts por decisión, dependencias previas y fuentes del monorepo', async () => {
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
    assert.equal([...source.matchAll(/^\| ---/gm)].length, [...source.matchAll(/<div role="region" aria-label="[^"]+" tabindex="0" style="overflow-x:auto">/g)].length)
  }
  assert.match(posts[0].source, /bit reproducible/)
  assert.match(posts[2].source, /No es una medición del tamaño transferido/)
  assert.match(posts[4].source, /no crea esa copia ni ejecuta una restauración/)
  assert.match(posts[5].source, /No se ha ejecutado un vulnerability scan/)
})

test('Docker: diez extractos pertenecen al Dockerfile, Compose, API, SQL y ejercicio probados', async () => {
  const sources = []
  for (const file of ['Dockerfile', 'compose.yaml', 'src/server.ts', 'sql/01-schema.sql', 'scripts/exercise.mjs'])
    sources.push(await readFile(root + file, 'utf8'))
  const code = compact(sources.join('\n')); let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript|dockerfile|yaml|sql)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: snippet`); count++
    }
  assert.equal(count, 10)
})

test('Docker: seis diagramas y gráfico derivado con dimensiones y escala verificables', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    await access(blogPath(`assets/container-environments/${entry.id}.d2`))
    for (const [, path, alt, width, height] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath(`public${path}`), 'utf8')
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); count++
    }
  }
  assert.equal(count, 7)
  const sizes = evidence.events[0].facts
  const chart = await readFile(root + 'image-sizes.svg', 'utf8')
  assert.ok(chart.includes(String(sizes.buildBytes))); assert.ok(chart.includes(String(sizes.runtimeBytes)))
  assert.ok(chart.includes((340 * sizes.runtimeBytes / sizes.buildBytes).toFixed(2)))
})

test('Docker: captura con hashes, recreación, fallos y dos setups de datos vacíos', async () => {
  assert.equal(evidence.kind, 'local_docker_observation')
  assert.equal(Object.keys(evidence.sources).length, 15)
  for (const [file, sha] of Object.entries(evidence.sources))
    assert.equal(createHash('sha256').update(await readFile(root + file)).digest('hex'), sha, file)
  assert.equal(evidence.events.length, 10)
  for (const [i, e] of evidence.events.entries()) {
    assert.equal(e.seq, i + 1); assert.equal(e.kind, 'observed')
    if (i) assert.ok(e.elapsedMs >= evidence.events[i - 1].elapsedMs)
  }
  const event = (id) => evidence.events.find((e) => e.id === id).facts
  const initial = event('fresh_setup'), created = event('persisted_and_cached')
  assert.equal(event('built').sourceChangeInstallCached, true)
  assert.equal(initial.rows, 0); assert.equal(initial.security.uid, 1000)
  assert.equal(initial.security.compiler, false); assert.equal(initial.security.write, 'EROFS')
  assert.equal(initial.readonlyRootfs, true); assert.deepEqual(initial.capDrop, ['ALL'])
  assert.ok(initial.securityOpt.includes('no-new-privileges:true'))
  assert.equal(initial.memoryBytes, 268435456); assert.equal(initial.nanoCpus, 500000000)
  assert.equal(initial.backendInternal, true)
  assert.deepEqual(initial.topology.postgres.ports, {}); assert.deepEqual(initial.topology.redis.ports, {})
  assert.equal(initial.topology.api.ports['3000/tcp'][0].HostIp, '127.0.0.1')
  assert.equal(created.first.body.source, 'postgres'); assert.equal(created.second.body.source, 'redis')
  assert.equal(created.duplicate.status, 409); assert.equal(created.rows, 1)
  assert.notEqual(event('api_recreated').before, event('api_recreated').after)
  assert.equal(event('api_recreated').image, event('built').runtimeImage)
  assert.equal(event('redis_unavailable').fallback.body.source, 'postgres')
  assert.equal(event('redis_unavailable').ready.body.cacheConnected, false)
  assert.equal(event('redis_unavailable').ready.status, 200)
  assert.equal(event('postgres_unavailable').live.status, 200)
  assert.equal(event('postgres_unavailable').ready.status, 503)
  assert.equal(event('postgres_unavailable').missing.status, 503)
  assert.equal(event('postgres_recovered').rows, 1); assert.equal(event('volume_reused').rows, 1)
  assert.deepEqual(event('volume_reused').surviving.body.note, created.first.body.note)
  assert.equal(event('second_fresh_setup').initialRows, 0); assert.equal(event('second_fresh_setup').gone.status, 404)
  assert.equal(event('second_fresh_setup').finalRows, 1)
  assert.deepEqual(event('cleanup').remaining, { container: '', volume: '', network: '' })
  assert.ok(Object.values(evidence.limits).every((v) => v === false))
})

test('Docker: exports estáticos canónicos y visor sin control remoto ni recuentos heredados', async () => {
  const exports = JSON.parse(await readFile('metadata/blog-exports.json'))
  const selected = exports.filter((e) => e.source.startsWith(root)); assert.equal(selected.length, 4)
  for (const e of selected) assert.deepEqual(await readFile(e.source), await readFile(blogPath(e.destination)))
  assert.deepEqual(JSON.parse(await readFile(root + 'replay.json')).events, evidence.events)
  const viewer = await readFile(root + 'explorer.mjs', 'utf8')
  assert.match(viewer, /fetch\('replay.json'\)/); assert.equal([...viewer.matchAll(/\bfetch\(/g)].length, 1)
  assert.doesNotMatch(viewer, /WebSocket|innerHTML/); assert.match(viewer, /No capturado/)
  const script = await readFile(root + 'scripts/exercise.mjs', 'utf8')
  assert.match(script, /if \(ownsProject\) await down/); assert.doesNotMatch(script, /\bprune\b/)
})
