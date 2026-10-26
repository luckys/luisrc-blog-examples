import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'

const manifest = JSON.parse(await readFile(editorialPath('integration-contracts-series.json')))
const ids = ['P056', 'INT-FIXTURES', 'INT-ISOLATION', 'CONTRACT-SCHEMA', 'CONTRACT-CDC']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({
  entry, source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8'),
})))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('integración/contratos: cinco drafts específicos con orden y dependencias existentes', async () => {
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
    for (const file of entry.files) await access(`packages/integration-contracts/${file}`)
  }
})

test('integración/contratos: trece extractos pertenecen a las fuentes ejecutadas', async () => {
  const sources = []
  for (const dir of ['src', 'tests'])
    for (const file of await readdir(`packages/integration-contracts/${dir}`))
      sources.push(await readFile(`packages/integration-contracts/${dir}/${file}`, 'utf8'))
  const code = compact(sources.join('\n'))
  let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: extracto distinto`)
      count++
    }
  assert.equal(count, 13)
})

test('integración/contratos: cinco SVG con dimensiones, alt y fuentes', async () => {
  for (const { entry, source } of posts) {
    const matches = [...source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)]
    assert.equal(matches.length, 1)
    const [, path, alt, width, height] = matches[0]
    assert.equal(path, `/assets/visuals/integration-contracts/${entry.id}.svg`)
    assert.ok(alt.length > 80)
    const svg = await readFile(blogPath(`public${path}`), 'utf8')
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
    assert.equal(+width, w)
    assert.equal(+height, h)
    await access(blogPath(`assets/integration-contracts/${entry.id}.d2`))
  }
})

test('integración/contratos: hashes vigentes, Pact real y nueve resultados acotados', async () => {
  const report = JSON.parse(await readFile('packages/integration-contracts/evidence/verification.json'))
  for (const [file, hash] of Object.entries(report.sources))
    assert.equal(createHash('sha256').update(await readFile(`packages/integration-contracts/${file}`)).digest('hex'), hash, file)
  assert.deepEqual(report.results.map((r) => r.tests), [4, 2, 9])
  assert.ok(report.results.every((r) => r.status === 'passed'))
  assert.equal(report.cleanup.remainingOwnedContainers, 0)
  const cases = new Map(report.cases.map((c) => [c.case, c]))
  assert.equal(cases.size, 9)
  assert.equal(cases.get('database').server, '18.4')
  assert.equal(cases.get('database').hostVolumes, false)
  assert.equal(cases.get('database').loopback, true)
  assert.deepEqual(cases.get('schemas').amounts, [1250, 9900])
  assert.equal(cases.get('rollback').otherCommittedSurvives, true)
  assert.equal(cases.get('cleanup').schemaRemaining, false)
  assert.equal(cases.get('evolution').renamedSchemaValid, false)
  assert.equal(cases.get('pact-baseline').verified, true)
  assert.equal(cases.get('pact-additive').verified, true)
  assert.equal(cases.get('pact-renamed').verified, false)
  assert.deepEqual([cases.get('semantics').expectedMinor, cases.get('semantics').actualMinor], [1250, 12])
  assert.equal(cases.get('semantics').pactVerified, true)
  const pact = JSON.parse(await readFile('packages/integration-contracts/contracts/ReceiptWidget-OrdersApi.json'))
  assert.equal(pact.consumer.name, 'ReceiptWidget')
  assert.equal(pact.provider.name, 'OrdersApi')
  assert.equal(pact.interactions.length, 2)
  assert.equal(pact.metadata.pactSpecification.version, '4.0')
  assert.deepEqual(pact.interactions.map((i) => i.response.status).toSorted(), [200, 404])
  const success = pact.interactions.find((i) => i.response.status === 200)
  assert.equal(success.response.matchingRules.body['$.amountMinor'].matchers[0].match, 'integer')
  const byId = new Map(posts.map(({ entry, source }) => [entry.id, source]))
  assert.match(byId.get('P056'), /no se ha sometido a esa inyección/)
  assert.match(byId.get('INT-ISOLATION'), /no aislamiento de seguridad/)
  assert.match(byId.get('CONTRACT-SCHEMA'), /no metavalidación completa/)
  assert.match(byId.get('CONTRACT-CDC'), /no publicamos contratos ni resultados/)
})
