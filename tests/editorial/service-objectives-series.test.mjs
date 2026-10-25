import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'
import { buildReport } from '../../packages/service-objectives/src/report.ts'
import { WindowIndex } from '../../packages/service-objectives/src/windows.ts'
import { evaluateAlerts } from '../../packages/service-objectives/src/alerts.ts'

const manifest = JSON.parse(await readFile(blogPath('docs/editorial/service-objectives-series.json')))
const ids = ['P060', 'SLO-COHORTS', 'SLO-WINDOWS', 'SLO-BUDGET', 'SLO-BURN', 'SLO-ALERTS']
const root = 'packages/service-objectives/'
const posts = await Promise.all(manifest.articles.map(async (entry) => ({ entry,
  source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8') })))
const evidence = JSON.parse(await readFile(root + 'evidence/simulation.json'))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('SLO: seis drafts específicos, prerrequisitos previos y límites de simulación', async () => {
  assert.deepEqual(manifest.articles.map((a) => a.id), ids)
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
    for (const id of meta.prerequisites) { assert.ok(known.has(id), id); if (ids.includes(id)) assert.ok(seen.has(id)) }
    seen.add(entry.id)
    assert.doesNotMatch(source, /—/)
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias']) assert.ok(source.includes(heading))
    assert.equal([...source.matchAll(/^\| ---/gm)].length, [...source.matchAll(/<div role="region" aria-label="[^"]+" tabindex="0" style="overflow-x:auto">/g)].length)
    for (const file of entry.files) await access(root + file)
  }
  assert.match(posts[5].source, /no envía notificaciones/)
  assert.match(posts[2].source, /No implementa un calendario civil/i)
})

test('SLO: diez extractos corresponden a fuentes ejecutadas', async () => {
  const sources = []
  for (const dir of ['src', 'tests', 'scripts'])
    for (const file of await readdir(root + dir)) sources.push(await readFile(`${root}${dir}/${file}`, 'utf8'))
  const code = compact(sources.join('\n'))
  let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: snippet`); count++
    }
  assert.equal(count, 10)
})

test('SLO: seis D2 y una gráfica declaran alt y dimensiones reales', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    for (const [, path, alt, width, height] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath(`public${path}`), 'utf8')
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); count++
    }
    await access(blogPath(`assets/service-objectives/${entry.id}.d2`))
  }
  assert.equal(count, 7)
})

test('SLO: evidencia recalculada conserva cifras, cobertura y clasificación de alertas', async () => {
  assert.equal(evidence.simulation, true)
  for (const [file, hash] of Object.entries(evidence.sources))
    assert.equal(createHash('sha256').update(await readFile(root + file)).digest('hex'), hash, file)
  assert.deepEqual(buildReport(), evidence.report)
  const report = evidence.report
  assert.deepEqual([report.http.eligible, report.http.available, report.http.fastAndAvailable], [6, 3, 2])
  assert.deepEqual(report.cohorts.map((c) => [c.now, c.eligible, c.good]), [[5, 1, 1], [10, 4, 1], [14, 6, 2]])
  assert.deepEqual(report.scenarios.map((s) => [s.id, s.alerts.pairs[0].state]), [
    ['baseline', 'ok'], ['fast-burn', 'firing'], ['recovered', 'ok'], ['slow-burn', 'ok'],
    ['low-traffic', 'insufficient_volume'], ['no-traffic', 'no_traffic'], ['missing-data', 'missing_data']])
  const fast = report.scenarios[1], recovered = report.scenarios[2]
  assert.deepEqual(fast.budget, recovered.budget)
  assert.deepEqual([fast.budget.bad, fast.budget.allowed, fast.budget.remaining], [1500, 43200, 41700])
  assert.deepEqual([fast.alerts.pairs[0].longBurn, fast.alerts.pairs[0].shortBurn], [25, 150])
  assert.equal(recovered.alerts.pairs[0].shortBurn, 0)
  assert.equal(report.scenarios[6].budget, null)
  assert.equal(report.scenarios[5].budget.compliant, null)
  assert.deepEqual(report.examples.thresholds, [14.4, 13.44])
})

test('SLO: cinco exports canónicos, bundle probado y controles sin backend', async () => {
  const exports = JSON.parse(await readFile('metadata/blog-exports.json'))
  const selected = exports.filter((entry) => entry.source.startsWith(root))
  assert.equal(selected.length, 5)
  for (const entry of selected) assert.deepEqual(await readFile(entry.source), await readFile(blogPath(entry.destination)))
  const browser = await import('../../packages/service-objectives/model.mjs')
  for (const scenario of browser.scenarios)
    for (const target of [990000, 999000, 999500, 999900]) {
      const bins = browser.expand(scenario)
      assert.deepEqual(browser.evaluateAlerts(new browser.WindowIndex(bins), 43200, target), evaluateAlerts(new WindowIndex(bins), 43200, target))
    }
  const data = JSON.parse(await readFile(root + 'scenarios.json'))
  assert.equal(data.simulation, true); assert.deepEqual(data.scenarios, browser.scenarios)
  const viewer = await readFile(root + 'explorer.mjs', 'utf8')
  assert.match(viewer, /fetch\('scenarios.json'\)/)
  assert.equal([...viewer.matchAll(/\bfetch\(/g)].length, 1)
  assert.doesNotMatch(viewer, /WebSocket|innerHTML/)
})
