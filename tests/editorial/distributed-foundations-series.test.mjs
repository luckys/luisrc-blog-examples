import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'

const manifest = JSON.parse(await readFile(editorialPath('distributed-foundations-series.json')))
const ids = ['P048', 'DIST-QUORUM', 'DIST-CONSENSUS', 'DIST-CLOCKS', 'DIST-CAP', 'DIST-SHARDING']
const posts = await Promise.all(manifest.articles.map(async (entry) => ({
  entry, source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8'),
})))
const compact = (text) => text.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('fundamentos: seis drafts específicos, ordenados y con prerrequisitos existentes', async () => {
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
    if (['DIST-QUORUM', 'DIST-CONSENSUS', 'DIST-CLOCKS'].includes(entry.id)) assert.equal(meta.math, true)
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
    for (const file of entry.files) await access(`packages/distributed-foundations/${file}`)
  }
})

test('fundamentos: once extractos ejecutados coinciden con sus fuentes', async () => {
  const files = ['src/clock.ts', 'src/replication.ts', 'src/voting.ts', 'src/routing.ts',
    'tests/replication.test.mjs', 'tests/quorum.test.mjs', 'tests/voting.test.mjs', 'tests/clock-routing.test.mjs']
  const source = compact((await Promise.all(files.map((file) => readFile(`packages/distributed-foundations/${file}`, 'utf8')))).join('\n'))
  let count = 0
  for (const { entry, source: post } of posts)
    for (const [, snippet] of post.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(source.includes(compact(snippet)), `${entry.id}: snippet distinto de fuente`)
      count++
    }
  assert.equal(count, 11)
})

test('fundamentos: seis diagramas con fuentes, dimensiones y texto alternativo', async () => {
  for (const { entry, source } of posts) {
    const images = [...source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)]
    assert.equal(images.length, 1)
    const [, path, alt, width, height] = images[0]
    assert.equal(path, `/assets/visuals/distributed-foundations/${entry.id}.svg`)
    assert.ok(alt.length > 80)
    const svg = await readFile(blogPath(`public${path}`), 'utf8')
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
    assert.equal(+width, w)
    assert.equal(+height, h)
    await access(blogPath(`assets/distributed-foundations/${entry.id}.d2`))
  }
})

test('fundamentos: límites y contraejemplos no se convierten en garantías de clúster', () => {
  const byId = new Map(posts.map(({ entry, source }) => [entry.id, source]))
  assert.match(byId.get('P048'), /No hay red, reloj físico, disco/)
  assert.match(byId.get('DIST-QUORUM'), /Quorum no equivale a consenso/)
  assert.match(byId.get('DIST-CONSENSUS'), /no persiste ese estado en disco/)
  assert.match(byId.get('DIST-CLOCKS'), /no prueban causalidad en sentido inverso/)
  assert.match(byId.get('DIST-CAP'), /test no demuestra CAP/)
  assert.match(byId.get('DIST-SHARDING'), /no mueve registros/)
  assert.match(byId.get('DIST-SHARDING'), /679/)
})
