import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'
import { estimate } from '../../packages/aws-foundations/src/costs.ts'
import { extractRates } from '../../packages/aws-foundations/scripts/pricing.mjs'
const root = 'packages/aws-foundations/'
const json = async (file) => JSON.parse(await readFile(file))
const manifest = await json(editorialPath('aws-foundations-series.json'))
const evidence = await json(root + 'evidence/comparison.json')
const posts = await Promise.all(manifest.articles.map(async (entry) => ({ entry,
  source: await readFile(blogPath('src/content/posts/es/' + entry.slug + '.md'), 'utf8') })))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('AWS: once drafts específicos en orden, prerrequisitos existentes y preguntas distintas', async () => {
  assert.deepEqual(manifest.articles.map((a) => a.id), ['P064', 'AWS-IAM', 'AWS-VPC', 'AWS-EC2', 'AWS-LAMBDA', 'AWS-ECS', 'AWS-S3', 'AWS-SQS', 'AWS-RDS', 'AWS-DYNAMODB', 'AWS-CHOICE'])
  const known = new Set(), seen = new Set(); let date = -Infinity
  for (const file of await readdir(blogPath('src/content/posts/es'))) {
    const source = await readFile(blogPath('src/content/posts/es/' + file), 'utf8')
    known.add(YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]).id)
  }
  for (const { entry, source } of posts) {
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
    for (const key of ['id', 'title', 'slug', 'prerequisites']) assert.deepEqual(meta[key], entry[key])
    assert.equal(meta.locale, 'es'); assert.equal(meta.author, 'Luis Ramírez Calle')
    assert.equal(meta.series, manifest.name); assert.equal(meta.draft, true); assert.equal(meta.status, 'draft')
    assert.ok(new Date(meta.published).valueOf() > date); date = new Date(meta.published).valueOf()
    for (const id of meta.prerequisites) { assert.ok(known.has(id), id); if (id.startsWith('AWS-') || id === 'P064') assert.ok(seen.has(id)) }
    seen.add(entry.id)
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias']) assert.ok(source.includes(heading), entry.id)
    assert.doesNotMatch(source, /—|\{\{diagram|\{\{code/)
    assert.equal([...source.matchAll(/^\| ---/gm)].length, [...source.matchAll(/<div role="region" aria-label="[^"]+" tabindex="0" style="overflow-x:auto">/g)].length)
    for (const file of entry.files) await access(root + file)
  }
  assert.equal(new Set(manifest.articles.map((a) => a.question)).size, 11)
})

test('AWS: nueve extractos TypeScript coinciden con las fuentes probadas', async () => {
  const code = compact((await Promise.all((await readdir(root + 'src')).map((f) => readFile(root + 'src/' + f, 'utf8')))).join('\n'))
  let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```typescript\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), entry.id); count++
    }
  assert.equal(count, 9)
  const fragments = [...posts[5].source.matchAll(/```json\n([\s\S]*?)\n```/g)]
  assert.equal(fragments.length, 1)
  assert.deepEqual(JSON.parse(fragments[0][1]), await json(root + 'designs/task-fragment.json'))
})

test('AWS: once diagramas legibles en móvil y gráfico calculado desde ambas comparaciones', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    await access(blogPath('assets/aws-foundations/' + entry.id + '.d2'))
    for (const [, path, alt, width, height] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath('public' + path), 'utf8')
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); assert.ok(w <= 380); count++
    }
  }
  assert.equal(count, 12)
  const svg = await readFile(root + 'cost-summary.svg', 'utf8')
  const max = Math.max(...evidence.cases.flatMap((c) => [c.result.lambda.subtotal, c.result.ecs.subtotal]))
  for (const c of evidence.cases) for (const key of ['lambda', 'ecs']) {
    assert.ok(svg.includes(String(c.result[key].subtotal)))
    assert.ok(svg.includes((340 * c.result[key].subtotal / max).toFixed(2)))
  }
  assert.match(svg, /Capacidad equivalente no probada/)
})

test('AWS: snapshot de cinco ofertas, tramos exactos y subtotales escritos sin capacidad inferida', async () => {
  const excerpts = await json(root + 'pricing/catalogue-excerpts.json')
  assert.deepEqual(evidence.pricing.rates, extractRates(excerpts))
  assert.equal(evidence.pricing.region, 'us-east-1'); assert.equal(evidence.pricing.currency, 'USD')
  const scenarios = await json(root + 'scenarios.json')
  for (const [i, c] of evidence.cases.entries()) {
    assert.deepEqual(c.input, { ...scenarios.defaults, ...scenarios.cases[i].inputs })
    assert.deepEqual(c.result, estimate(c.input, evidence.pricing.rates))
    assert.equal(c.result.capacityValidated, false)
  }
  assert.deepEqual(evidence.cases.map((c) => [c.result.lambda.subtotal, c.result.ecs.subtotal]), [[2.033335, 86.32905], [203.3335, 163.9652]])
  const last = posts.at(-1).source
  for (const number of ['2,033335', '86,32905', '203,3335', '163,9652', '43,8']) assert.ok(last.includes(number))
  assert.match(last, /No es una curva de autoscaling observada/)
  assert.match(posts[6].source, /no es un enlace de un solo uso/)
  assert.match(posts[7].source, /No reutilizamos este helper Standard como un handler FIFO correcto/)
  assert.match(posts[8].source, /restoreVerified: false/)
})

test('AWS: contratos locales y cuatro respuestas no se presentan como observaciones cloud', async () => {
  assert.equal(evidence.kind, 'calculated_design_comparison_with_local_contract_observations')
  assert.equal(Object.keys(evidence.sources).length, 25)
  for (const [file, sha] of Object.entries(evidence.sources))
    assert.equal(createHash('sha256').update(await readFile(root + file)).digest('hex'), sha, file)
  assert.equal(evidence.serverClosed, true)
  assert.ok(Object.values(evidence.limits).every((value) => value === false))
  assert.deepEqual(evidence.observations.map((o) => o.http.status), [200, 404, 405, 503])
  for (const o of evidence.observations) {
    assert.equal(o.lambdaInvocation, 'local_adapter_only_not_AWS')
    assert.equal(o.http.status, o.localLambda.statusCode); assert.deepEqual(o.http.body, JSON.parse(o.localLambda.body))
  }
  assert.equal(evidence.contracts.dbReview.restoreVerified, false)
  assert.deepEqual(evidence.contracts.queueResult.batchItemFailures, [{ itemIdentifier: 'b' }])
  assert.equal(evidence.designs.ecs.natGateway, false)
  assert.deepEqual(evidence.designs.ecs.network.services, ['ecr.api', 'ecr.dkr', 'logs'])
})

test('AWS: cinco exports canónicos y visor con modelo compilado compartido, sin control cloud', async () => {
  const exports = (await json('metadata/blog-exports.json')).filter((e) => e.source.startsWith(root))
  assert.equal(exports.length, 5)
  for (const e of exports) assert.deepEqual(await readFile(e.source), await readFile(blogPath(e.destination)))
  const { sources, loopbackOrigin, ...publicReport } = evidence
  assert.deepEqual(await json(root + 'comparison.json'), publicReport)
  const viewer = await readFile(root + 'explorer.mjs', 'utf8')
  assert.match(viewer, /import \{ estimate \} from '.\/cost-model.mjs'/)
  assert.equal([...viewer.matchAll(/\bfetch\(/g)].length, 1); assert.match(viewer, /fetch\('comparison.json'\)/)
  assert.doesNotMatch(viewer, /innerHTML|WebSocket|https?:\/\//)
  const model = await import('../../packages/aws-foundations/cost-model.mjs')
  for (const c of evidence.cases) assert.deepEqual(model.estimate(c.input, evidence.pricing.rates), c.result)
  const html = await readFile(root + 'explorer.html', 'utf8')
  assert.match(html, /lang="es"/); assert.match(html, /noindex,nofollow/)
  assert.match(html, /role="alert"/); assert.match(html, /aria-live="polite"/)
})
