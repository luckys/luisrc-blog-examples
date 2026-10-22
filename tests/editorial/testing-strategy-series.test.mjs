import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'

const manifest = JSON.parse(await readFile(blogPath('docs/editorial/testing-strategy-series.json')))
const ids = ['P055', 'TEST-TDD', 'TEST-DOUBLES', 'TEST-LAYERS', 'TEST-COVERAGE']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({
  entry, source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8'),
})))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('pruebas: cinco drafts específicos, cronología, autor y prerequisitos existentes', async () => {
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
    assert.equal(meta.locale, 'es')
    assert.equal(meta.author, 'Luis Ramírez Calle')
    assert.equal(meta.series, manifest.name)
    assert.equal(meta.draft, true)
    assert.equal(meta.status, 'draft')
    assert.ok(new Date(meta.published).valueOf() > date)
    date = new Date(meta.published).valueOf()
    for (const prerequisite of entry.prerequisites) {
      assert.ok(known.has(prerequisite), prerequisite)
      if (ids.includes(prerequisite)) assert.ok(seen.has(prerequisite))
    }
    seen.add(entry.id)
    assert.doesNotMatch(source, /—/)
    const tables = [...source.matchAll(/^\| ---/gm)].length
    assert.equal([...source.matchAll(/<div role="region" aria-label="[^"]+" tabindex="0" style="overflow-x:auto(?:;white-space:nowrap)?">/g)].length, tables)
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias'])
      assert.ok(source.includes(heading), entry.id)
    for (const file of entry.files) await access(`packages/testing-strategy/${file}`)
  }
})

test('pruebas: trece extractos coinciden con las fuentes ejecutadas', async () => {
  const sources = []
  for (const dir of ['src', 'tests'])
    for (const file of await readdir(`packages/testing-strategy/${dir}`))
      sources.push(await readFile(`packages/testing-strategy/${dir}/${file}`, 'utf8'))
  const code = compact(sources.join('\n'))
  let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: extracto distinto`)
      count++
    }
  assert.equal(count, 13)
})

test('pruebas: cinco SVG con fuente, alt y dimensiones reales', async () => {
  for (const { entry, source } of posts) {
    const matches = [...source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)]
    assert.equal(matches.length, 1)
    const [, path, alt, width, height] = matches[0]
    assert.equal(path, `/assets/visuals/testing-strategy/${entry.id}.svg`)
    assert.ok(alt.length > 80)
    const svg = await readFile(blogPath(`public${path}`), 'utf8')
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
    assert.equal(+width, w)
    assert.equal(+height, h)
    await access(blogPath(`assets/testing-strategy/${entry.id}.d2`))
  }
})

test('pruebas: evidencia vigente, scope del coverage y límites de las mutaciones', async () => {
  for (const file of ['verification', 'mutations']) {
    const report = JSON.parse(await readFile(`packages/testing-strategy/evidence/${file}.json`))
    for (const [source, hash] of Object.entries(report.sources))
      assert.equal(createHash('sha256').update(await readFile(`packages/testing-strategy/${source}`)).digest('hex'), hash, source)
    if (file === 'verification') {
      assert.deepEqual(report.results.map((r) => r.tests), [28, 11, 1])
      assert.ok(report.results.every((r) => r.status === 'passed'))
      assert.deepEqual(report.results[2].coverage, { file: 'src/transitions.ts', lines: 100, branches: 100, functions: 100 })
    } else {
      assert.deepEqual(report.baseline, { weak: 'passed', core: 'passed' })
      assert.equal(report.results.length, 4)
      assert.equal(report.results.filter((r) => r.weakScope === 'executed_file').length, 3)
      assert.equal(report.results.filter((r) => r.weakScope === 'outside_coverage_scope').length, 1)
      assert.ok(report.results.every((r) => r.weak === 'passed' && r.strong === 'killed' && r.firstFailingTest))
    }
  }
  const byId = new Map(posts.map(({ entry, source }) => [entry.id, source]))
  assert.match(byId.get('TEST-DOUBLES'), /no crea dos escritores/)
  assert.match(byId.get('TEST-LAYERS'), /No lo presentamos como una prueba E2E/)
  assert.match(byId.get('TEST-COVERAGE'), /no instalamos ni ejecutamos \*\*Stryker\*\*/)
  assert.match(byId.get('TEST-COVERAGE'), /no ejecuta ese archivo/)
})
