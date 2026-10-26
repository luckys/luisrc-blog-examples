import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'

const manifest = JSON.parse(
  await readFile(editorialPath('api-contracts-series.json')),
)
const entries = manifest.articles.filter((article) => article.roadmapId === 'P031')
const compact = (text) => text.replace(/\s/g, '').replaceAll('"', "'")

test('integración: cuatro drafts específicos, snippets ejecutados y dimensiones SVG reales', async () => {
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ['P031', 'API-INTEGRATION-GRAPHQL', 'API-INTEGRATION-GRPC', 'API-INTEGRATION-CHOICE'],
  )
  const code = compact(
    (
      await Promise.all(
        [
          'orders.mjs',
          'http.mjs',
          'graphql.mjs',
          'rpc.mjs',
          'tests/integration.test.mjs',
        ].map((file) => readFile(`packages/api-integration/${file}`, 'utf8')),
      )
    ).join('\n'),
  )
  let snippets = 0
  for (const entry of entries) {
    const source = await readFile(
      blogPath(`src/content/posts/es/${entry.slug}.md`),
      'utf8',
    )
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
    for (const key of ['id', 'title', 'slug', 'prerequisites'])
      assert.deepEqual(meta[key], entry[key])
    assert.equal(meta.locale, 'es')
    assert.equal(meta.draft, true)
    assert.equal(meta.status, 'draft')
    assert.equal(meta.author, 'Luis Ramírez Calle')
    assert.equal(meta.series, manifest.name)
    assert.ok(!source.includes('—'))
    for (const [, snippet] of source.matchAll(/```javascript\n([\s\S]*?)\n```/g)) {
      assert.ok(
        code.includes(compact(snippet)),
        `${entry.id}: snippet no coincide con fuente probada`,
      )
      snippets++
    }
    const [, path, alt, width, height] = source.match(
      /<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/,
    )
    assert.ok(alt.length > 80)
    const svg = await readFile(blogPath(`public${path}`), 'utf8')
    const [, , w, h] = svg
      .match(/viewBox="([^"]+)"/)[1]
      .split(/\s+/)
      .map(Number)
    assert.equal(+width, Math.ceil(w))
    assert.equal(+height, Math.ceil(h))
    await readFile(blogPath(`assets/api-contracts/${entry.id}.d2`))
  }
  assert.equal(snippets, 6)
})

test('integración: contrato publicado y evidencia coinciden con las fuentes canónicas', async () => {
  const grpcPost = await readFile(
    blogPath('src/content/posts/es/grpc-protobuf-deadlines-compatibilidad.md'),
    'utf8',
  )
  const proto = grpcPost.match(/```protobuf\n([\s\S]*?)\n```/)[1]
  assert.equal(
    proto.trim(),
    (await readFile('packages/api-integration/orders.proto', 'utf8')).trim(),
  )
  const graphqlPost = await readFile(
    blogPath('src/content/posts/es/graphql-resolvers-n-mas-uno-dataloader.md'),
    'utf8',
  )
  const graphql = compact(await readFile('packages/api-integration/graphql.mjs', 'utf8'))
  for (const [, snippet] of graphqlPost.matchAll(/```graphql\n([\s\S]*?)\n```/g))
    assert.ok(graphql.includes(compact(snippet)))
  const evidence = JSON.parse(
    await readFile('packages/api-integration/results/experiment.json'),
  )
  assert.deepEqual(evidence.polling.responses, [200, 304, 200, 200])
  assert.equal(evidence.events.received.length, 2)
  assert.deepEqual(evidence.events.final, evidence.polling.final)
  assert.deepEqual(evidence.graphql.batched, { orderReads: 1, customerReads: 1 })
})
