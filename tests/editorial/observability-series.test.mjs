import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'

const manifest = JSON.parse(await readFile(editorialPath('observability-series.json')))
const ids = ['P059', 'OBS-SPANS', 'OBS-PROPAGATION', 'OBS-SAMPLING', 'OBS-METRICS', 'OBS-EXEMPLARS']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({ entry,
  source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8') })))
const root = 'packages/observability-lab/'
const evidence = JSON.parse(await readFile(root + 'evidence/browser.json'))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('observabilidad: seis drafts por concepto, prerrequisitos existentes y límites declarados', async () => {
  assert.deepEqual(manifest.articles.map((entry) => entry.id), ids)
  const known = new Set()
  for (const file of await readdir(blogPath('src/content/posts/es'))) {
    const source = await readFile(blogPath(`src/content/posts/es/${file}`), 'utf8')
    known.add(YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]).id)
  }
  const seen = new Set()
  let date = -Infinity
  for (const { entry, source } of posts) {
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
    for (const key of ['id', 'title', 'slug', 'prerequisites']) assert.deepEqual(meta[key], entry[key])
    assert.equal(meta.locale, 'es'); assert.equal(meta.author, 'Luis Ramírez Calle')
    assert.equal(meta.series, manifest.name); assert.equal(meta.draft, true); assert.equal(meta.status, 'draft')
    assert.ok(new Date(meta.published).valueOf() > date); date = new Date(meta.published).valueOf()
    for (const prerequisite of entry.prerequisites) {
      assert.ok(known.has(prerequisite), prerequisite)
      if (ids.includes(prerequisite)) assert.ok(seen.has(prerequisite))
    }
    seen.add(entry.id)
    assert.doesNotMatch(source, /—/)
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias']) assert.ok(source.includes(heading), entry.id)
    for (const file of entry.files) await access(root + file)
  }
  assert.match(posts[5].source, /no es una implementación nativa/)
  assert.match(posts[5].source, /no afirmamos haber probado ingestión/)
})

test('observabilidad: once extractos coinciden con fuentes ejecutadas', async () => {
  const sources = []
  for (const dir of ['src', 'web', 'tests', 'scripts'])
    for (const file of await readdir(root + dir)) sources.push(await readFile(`${root}${dir}/${file}`, 'utf8'))
  const code = compact(sources.join('\n'))
  let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: extracto distinto`); count++
    }
  assert.equal(count, 11)
})

test('observabilidad: seis diagramas y una gráfica tienen dimensiones y alt reales', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    for (const [, path, alt, width, height] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath(`public${path}`), 'utf8')
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); count++
    }
    await access(blogPath(`assets/observability/${entry.id}.d2`))
  }
  assert.equal(count, 7)
})

test('observabilidad: evidencia Chromium prueba árboles, links, pérdida, sampling y agregación', async () => {
  for (const [file, hash] of Object.entries(evidence.sources))
    assert.equal(createHash('sha256').update(await readFile(root + file)).digest('hex'), hash, file)
  assert.notEqual(evidence.apiPid, evidence.workerPid)
  assert.deepEqual(evidence.browser, { width: 360, clicks: 5, pageErrors: [] })
  assert.deepEqual(evidence.cases.map((entry) => [entry.scenario, entry.spans.length, new Set(entry.spans.map((span) => span.traceId)).size]),
    [['ok', 5, 1], ['fail', 5, 1], ['broken', 5, 2], ['link', 5, 2], ['unsampled', 0, 0]])
  for (const scenario of ['ok', 'fail']) {
    const entry = evidence.cases.find((entry) => entry.scenario === scenario)
    const names = ['ui.submit', 'POST /jobs client', 'POST /jobs', 'jobs publish', 'jobs process']
    const chain = names.map((name) => entry.spans.find((span) => span.name === name))
    for (let i = 1; i < chain.length; i++) assert.equal(chain[i].parentSpanId, chain[i - 1].spanId)
    assert.equal(chain[4].status.code, scenario === 'fail' ? 2 : 0)
  }
  const linked = evidence.cases[3].spans.find((span) => span.name === 'jobs process')
  assert.equal(linked.parentSpanId, null)
  assert.equal(linked.links[0].spanId, evidence.cases[3].spans.find((span) => span.name === 'jobs publish').spanId)
  assert.equal(evidence.spans.length, 20); assert.equal(evidence.logs.length, 10)
  for (const [i, entry] of evidence.cases.entries()) {
    assert.equal(entry.logs.length, 2)
    assert.equal(entry.logs[0].operation_id, entry.logs[1].operation_id)
    assert.equal(entry.metrics.histogram.reduce((n, point) => n + point.value.count, 0), i + 1)
  }
  assert.deepEqual(evidence.metrics.histogram.map((p) => [p.attributes.result, p.value.count]), [['ok', 4], ['error', 1]])
  for (const exemplar of evidence.metrics.exemplars) assert.ok(evidence.spans.some((span) => span.spanId === exemplar.spanId && span.traceId === exemplar.traceId))
  assert.equal(evidence.limits.nativeSdkExemplars, false)
  assert.doesNotMatch(evidence.openMetrics, /bucket\{[^\n}]*trace_id/)
  assert.ok(evidence.openMetrics.endsWith('# EOF\n'))
})

test('observabilidad: cuatro exports canónicos y visor solo con evidencia archivada', async () => {
  const allowlist = JSON.parse(await readFile('metadata/blog-exports.json'))
  const exported = allowlist.filter((entry) => entry.source.startsWith(root))
  assert.equal(exported.length, 4)
  for (const entry of exported) assert.deepEqual(await readFile(entry.source), await readFile(blogPath(entry.destination)))
  const data = JSON.parse(await readFile(root + 'measurements.json'))
  assert.deepEqual(data.cases, evidence.cases); assert.deepEqual(data.metrics, evidence.metrics)
  assert.deepEqual(data.limits, evidence.limits)
  const viewer = await readFile(root + 'explorer.mjs', 'utf8')
  assert.match(viewer, /fetch\('measurements.json'\)/)
  assert.equal([...viewer.matchAll(/\bfetch\(/g)].length, 1)
  assert.doesNotMatch(viewer, /WebSocket|innerHTML/)
})
