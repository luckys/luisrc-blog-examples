import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'

const manifest = JSON.parse(await readFile(editorialPath('kafka-streaming-series.json')))
const ids = ['P051', 'KAFKA-PARTITIONS', 'KAFKA-GROUPS', 'KAFKA-REPLAY', 'KAFKA-PRESSURE']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({
  entry, source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8'),
})))
const compact = (text) => text.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('Kafka: cinco drafts específicos en español, cronología y dependencias existentes', async () => {
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
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias'])
      assert.ok(source.includes(heading), entry.id)
    for (const file of entry.files) await access(`packages/kafka-streaming/${file}`)
  }
})

test('Kafka: once extractos coinciden con las fuentes ejecutadas', async () => {
  const files = ['src/client.ts', 'src/collect.ts', 'src/projection.ts', 'src/offsets.ts', 'tests/broker.test.mjs']
  const source = compact((await Promise.all(files.map((file) => readFile(`packages/kafka-streaming/${file}`, 'utf8')))).join('\n'))
  let count = 0
  for (const { entry, source: post } of posts)
    for (const [, snippet] of post.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(source.includes(compact(snippet)), `${entry.id}: snippet distinto`)
      count++
    }
  assert.equal(count, 11)
})

test('Kafka: cinco diagramas con fuentes, alt y dimensiones reales', async () => {
  for (const { entry, source } of posts) {
    const images = [...source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)]
    assert.equal(images.length, 1)
    const [, path, alt, width, height] = images[0]
    assert.equal(path, `/assets/visuals/kafka-streaming/${entry.id}.svg`)
    assert.ok(alt.length > 80)
    const svg = await readFile(blogPath(`public${path}`), 'utf8')
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
    assert.equal(+width, w)
    assert.equal(+height, h)
    await access(blogPath(`assets/kafka-streaming/${entry.id}.d2`))
  }
})

test('Kafka: evidencia de cinco casos y límites de los resultados publicados', async () => {
  const e = JSON.parse(await readFile('packages/kafka-streaming/evidence/broker.json'))
  assert.equal(e.kafka, '3.9.1')
  assert.equal(e.client, 'KafkaJS 2.2.4')
  assert.ok((await readFile('packages/kafka-streaming/scripts/broker.mjs', 'utf8')).includes(e.imageDigest))
  const cases = new Map(e.cases.map((c) => [c.case, c]))
  assert.equal(cases.size, 5)
  assert.deepEqual(cases.get('checkpoint').resumed, ['1', '2'])
  assert.equal(cases.get('checkpoint').committed, '3')
  assert.deepEqual(cases.get('replay').snapshot, [
    { shipmentId: 's-1', version: 3, status: 'delivered' },
    { shipmentId: 's-2', version: 3, status: 'delivered' },
  ])
  assert.ok(cases.get('replay').records.every((record) => record.partition === 1))
  assert.deepEqual(cases.get('group').after.toSorted(), [0, 1])
  const pressure = cases.get('pressure')
  assert.deepEqual([pressure.high, pressure.initialLag, pressure.pausedLag, pressure.finalLag], ['3', '3', '2', '0'])
  assert.deepEqual([cases.get('floor').low, cases.get('floor').high], ['2', '3'])
  assert.match(cases.get('floor').mechanism, /not timed retention/)
  const byId = new Map(posts.map(({ entry, source }) => [entry.id, source]))
  assert.match(byId.get('P051'), /no la ejecución natural/)
  assert.match(byId.get('KAFKA-PARTITIONS'), /ambos en la partición 1/)
  assert.match(byId.get('KAFKA-GROUPS'), /graceful/)
  assert.match(byId.get('KAFKA-REPLAY'), /proyección no sobrevive al reinicio/)
  assert.match(byId.get('KAFKA-PRESSURE'), /Sin benchmark, carga sostenida/)
})
