import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'

const manifest = JSON.parse(await readFile(blogPath('docs/editorial/property-testing-series.json')))
const ids = ['P057', 'PBT-SHRINK', 'PBT-MODEL', 'PBT-RACES', 'PBT-FUZZ', 'PBT-FAULTS', 'PBT-MUTATION']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({
  entry, source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8'),
})))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('propiedades: siete drafts ordenados, dependencias reales y preguntas específicas', async () => {
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
    assert.equal([...source.matchAll(/^\| ---/gm)].length, [...source.matchAll(/<div role="region" aria-label="[^"]+" tabindex="0" style="overflow-x:auto">/g)].length)
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias'])
      assert.ok(source.includes(heading), entry.id)
    for (const file of entry.files) await access(`packages/property-testing/${file}`)
  }
})

test('propiedades: catorce extractos pertenecen al código ejecutado', async () => {
  const sources = []
  for (const dir of ['src', 'tests'])
    for (const file of await readdir(`packages/property-testing/${dir}`))
      sources.push(await readFile(`packages/property-testing/${dir}/${file}`, 'utf8'))
  const code = compact(sources.join('\n'))
  let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: extracto distinto`)
      count++
    }
  assert.equal(count, 14)
})

test('propiedades: siete diagramas con fuentes, dimensiones y texto alternativo', async () => {
  for (const { entry, source } of posts) {
    const matches = [...source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)]
    assert.equal(matches.length, 1)
    const [, path, alt, width, height] = matches[0]
    assert.equal(path, `/assets/visuals/property-testing/${entry.id}.svg`)
    assert.ok(alt.length > 80)
    const svg = await readFile(blogPath(`public${path}`), 'utf8')
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
    assert.equal(+width, w)
    assert.equal(+height, h)
    await access(blogPath(`assets/property-testing/${entry.id}.d2`))
  }
})

test('propiedades: evidencia vigente de shrinking, replay, traza y tres variantes', async () => {
  const report = JSON.parse(await readFile('packages/property-testing/evidence/verification.json'))
  for (const [file, hash] of Object.entries(report.sources))
    assert.equal(createHash('sha256').update(await readFile(`packages/property-testing/${file}`)).digest('hex'), hash, file)
  assert.equal(report.status, 'passed')
  assert.equal(report.tests, 15)
  assert.equal(report.fastCheck, '4.10.2')
  assert.equal(report.late.shrinks, 4)
  assert.deepEqual(report.late.counterexample, [['submit', 'confirm', 'decline']])
  assert.deepEqual(report.duplicate.counterexample, [['submit', 'confirm', 'confirm']])
  assert.deepEqual(report.unstable.counterexample, [['after-effect']])
  assert.equal(report.replay.sameCounterexample, true)
  assert.equal(report.race.replayFailed, true)
  assert.equal(report.race.regression.value, 1)
  assert.deepEqual(report.race.regression.report.map((e) => e.label), ['read', 'read', 'write', 'write'])
  assert.deepEqual(report.mutations, { selectedDetected: 3, weakPropertySurvivor: 'duplicate-capture', automaticEngine: false })
  assert.equal(report.bounds.realProcessCrash, false)
  assert.equal(report.bounds.network, false)
  const byId = new Map(posts.map(({ entry, source }) => [entry.id, source]))
  assert.match(byId.get('PBT-SHRINK'), /mínimo global demostrado/)
  assert.match(byId.get('PBT-RACES'), /no convierte un read-modify-write/i)
  assert.match(byId.get('PBT-FUZZ'), /no transporta prototipos/)
  assert.match(byId.get('PBT-FAULTS'), /no un crash real de proceso/)
  assert.match(byId.get('PBT-MUTATION'), /No hay campaña Stryker/)
})
