import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'
import { summarize, percentile } from '../../packages/performance-lab/src/statistics.ts'
import { groupWindows } from '../../packages/performance-lab/src/windows.ts'

const manifest = JSON.parse(await readFile(blogPath('docs/editorial/performance-series.json')))
const ids = ['P058', 'PERF-MODELS', 'PERF-SATURATION', 'PERF-SOAK', 'PERF-BENCH', 'PERF-CPU', 'PERF-MEMORY']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({
  entry, source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8'),
})))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')
const load = JSON.parse(await readFile('packages/performance-lab/evidence/load.json'))
const profiles = JSON.parse(await readFile('packages/performance-lab/evidence/profiles.json'))

test('rendimiento: siete drafts específicos con orden, autor y prerrequisitos reales', async () => {
  assert.deepEqual(manifest.articles.map((e) => e.id), ids)
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
    assert.equal([...source.matchAll(/^\| ---/gm)].length, [...source.matchAll(/<div role="region" aria-label="[^"]+" tabindex="0" style="overflow-x:auto">/g)].length)
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias']) assert.ok(source.includes(heading), entry.id)
    for (const file of entry.files) await access(`packages/performance-lab/${file}`)
  }
})

test('rendimiento: catorce extractos coinciden con fuentes ejecutadas', async () => {
  const sources = []
  for (const dir of ['src', 'tests', 'scripts', 'k6'])
    for (const file of await readdir(`packages/performance-lab/${dir}`)) sources.push(await readFile(`packages/performance-lab/${dir}/${file}`, 'utf8'))
  const code = compact(sources.join('\n'))
  let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: extracto distinto`); count++
    }
  assert.equal(count, 14)
})

test('rendimiento: siete D2 y dos gráficas con dimensiones reales y alt', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    const matches = [...source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)]
    assert.ok(matches.length >= 1)
    for (const [, path, alt, width, height] of matches) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath(`public${path}`), 'utf8')
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); count++
    }
    await access(blogPath(`assets/performance/${entry.id}.d2`))
  }
  assert.equal(count, 9)
})

test('rendimiento: muestras, perfiles y cifras publicadas son recalculables', async () => {
  for (const report of [load, profiles])
    for (const [file, hash] of Object.entries(report.sources))
      assert.equal(createHash('sha256').update(await readFile(`packages/performance-lab/${file}`)).digest('hex'), hash, file)
  for (const stage of load.stages) {
    const actual = summarize(stage.samples, stage.seconds)
    for (const [key, value] of Object.entries(actual)) assert.deepEqual(stage[key], value)
    assert.equal(stage.exit, stage.plan.expected)
  }
  const byName = new Map(load.stages.map((s) => [s.plan.name, s]))
  assert.deepEqual(['open-100', 'open-350-a', 'open-350-b', 'recovery-25'].map((name) => {
    const s = byName.get(name); return [s.requests, s.successes, s.errors]
  }), [[500, 500, 0], [1751, 958, 793], [1751, 953, 798], [101, 101, 0]])
  assert.equal(byName.get('generator-starved').dropped, 240)
  assert.equal(byName.get('generator-starved').errors, 0)
  const steady = byName.get('steady-60s')
  assert.equal(steady.requests, 1501)
  assert.deepEqual(groupWindows(steady.samples).map((w) => [w.fromSecond, w.requests, w.complete]), [[0, 250, true], [10, 251, true], [20, 250, true], [30, 250, true], [40, 250, true], [50, 250, false]])
  const benchPost = posts.find((p) => p.entry.id === 'PERF-BENCH').source
  for (const run of profiles.benchmarks)
    for (const variant of ['slow', 'indexed']) {
      const median = percentile(run.samples.filter((s) => s.variant === variant).map((s) => s.ms), 0.5)
      assert.ok(benchPost.includes(median.toFixed(3).replace('.', ',')))
    }
  assert.deepEqual(profiles.memory.map((m) => m.samples.map((s) => s.entries)), [[500, 1500, 0], [100, 100, 0]])
  assert.ok(profiles.cpuDiagnostic.flags.includes('--no-turbo-inlining'))
  const cpuPost = posts.find((p) => p.entry.id === 'PERF-CPU').source
  for (const cpu of profiles.cpu) {
    assert.ok(cpuPost.includes(cpu.wallMs.toFixed(1).replace('.', ',')))
    assert.ok(cpuPost.includes((cpu.cpuMicroseconds / 1000).toFixed(1).replace('.', ',')))
    assert.ok(cpuPost.includes(String(cpu.samples)) || (cpu.samples === 16 && cpuPost.includes('dieciséis')))
  }
  for (const [index, cpu] of [...profiles.cpu, profiles.cpuDiagnostic].entries()) {
    const name = ['slow', 'indexed', 'slow-no-inlining'][index]
    assert.equal(createHash('sha256').update(await readFile(`packages/performance-lab/evidence/profiles/${name}.cpuprofile`)).digest('hex'), cpu.profileSha256)
  }
})

test('rendimiento: visor estático, exportaciones canónicas y límites declarados', async () => {
  for (const name of ['explorer.html', 'explorer.mjs', 'measurements.json', 'load-results.svg', 'memory-results.svg'])
    assert.deepEqual(await readFile(blogPath(`public/assets/interactive/performance-series/${name}`)), await readFile(`packages/performance-lab/${name}`))
  const byId = new Map(posts.map(({ entry, source }) => [entry.id, source]))
  assert.match(byId.get('PERF-SOAK'), /no un soak test de horas/)
  assert.match(byId.get('PERF-BENCH'), /sin profiler/)
  assert.match(byId.get('PERF-CPU'), /frame anónimo/)
  assert.match(byId.get('PERF-MEMORY'), /no calcula retained size/)
  assert.equal(load.longSoakExecuted, false)
  assert.equal(profiles.rawHeapsCommitted, false)
})
