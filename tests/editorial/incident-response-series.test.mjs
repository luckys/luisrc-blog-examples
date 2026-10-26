import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'
import { actionHasEvidence } from '../../packages/incident-response/src/review.ts'

const manifest = JSON.parse(await readFile(editorialPath('incident-response-series.json')))
const ids = ['P061', 'INC-MITIGATION', 'INC-RUNBOOKS', 'INC-ONCALL', 'INC-POSTMORTEM', 'INC-ACTIONS']
const root = 'packages/incident-response/'
const posts = await Promise.all(manifest.articles.map(async (entry) => ({ entry,
  source: await readFile(blogPath(`src/content/posts/es/${entry.slug}.md`), 'utf8') })))
const evidence = JSON.parse(await readFile(root + 'evidence/incident.json'))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('incidentes: seis drafts específicos, dependencias previas y código fuera del blog', async () => {
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
  assert.match(posts[3].source, /No se avisó a una guardia/)
  assert.match(posts[4].source, /No son el instante exacto/)
  assert.match(posts[5].source, /no demuestra exactly-once/)
})

test('incidentes: doce extractos corresponden a las fuentes probadas', async () => {
  const sources = []
  for (const dir of ['src', 'tests', 'scripts'])
    for (const file of await readdir(root + dir)) sources.push(await readFile(`${root}${dir}/${file}`, 'utf8'))
  const code = compact(sources.join('\n'))
  let count = 0
  for (const { entry, source } of posts)
    for (const [, snippet] of source.matchAll(/```(?:typescript|javascript)\n([\s\S]*?)\n```/g)) {
      assert.ok(code.includes(compact(snippet)), `${entry.id}: snippet`); count++
    }
  assert.equal(count, 12)
})

test('incidentes: seis D2 y recuentos derivados declaran alt y dimensiones reales', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    for (const [, path, alt, width, height] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath(`public${path}`), 'utf8')
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); count++
    }
    await access(blogPath(`assets/incident-response/${entry.id}.d2`))
  }
  assert.equal(count, 7)
})

test('incidentes: archivo consistente, alcance real y dos acciones abiertas', async () => {
  assert.equal(evidence.syntheticIncident, true); assert.equal(evidence.realHttpAndProcesses, true)
  assert.notEqual(evidence.apiPid, evidence.workerPid)
  for (const [file, hash] of Object.entries(evidence.sources))
    assert.equal(createHash('sha256').update(await readFile(root + file)).digest('hex'), hash, file)
  const event = (id) => evidence.events.find((e) => e.id === id).facts
  assert.equal(evidence.events.length, 11)
  for (const [i, e] of evidence.events.entries()) {
    assert.equal(e.seq, i + 1); assert.equal(e.kind, 'observed')
    if (i) assert.ok(e.elapsedMs >= evidence.events[i - 1].elapsedMs)
  }
  assert.equal(event('stalled_alive').liveStatus, 200)
  assert.deepEqual([event('stalled_alive').completed, event('stalled_alive').queued], [2, 3])
  assert.ok(event('stalled_alive').worker.ticks >= event('queued').worker.ticks + 3)
  assert.equal(event('drained').admissionOpen, false)
  assert.equal(event('guard_rejects_zero').rejected.ok, false)
  assert.deepEqual(event('guard_rejects_zero').state.worker.config, event('candidate_enabled').worker.config)
  assert.deepEqual([evidence.final.completed, evidence.final.queued, evidence.final.rejectedDuringPause], [7, 0, 1])
  for (const job of evidence.final.jobs) { assert.equal(job.result, `report:${job.id}`); assert.equal(job.attempts, 1) }
  assert.ok(evidence.actions.every((a) => actionHasEvidence(a, evidence.proofs)))
  assert.deepEqual(evidence.actions.filter((a) => a.state === 'open').map((a) => a.id), ['A02', 'A04'])
  for (const key of ['durableQueue', 'humanOnCall', 'productionUsers', 'binaryDeployment', 'restartRecovery']) assert.equal(evidence.limits[key], false)
})

test('incidentes: cuatro exports canónicos y replay sin canal de control', async () => {
  const exports = JSON.parse(await readFile('metadata/blog-exports.json'))
  const selected = exports.filter((entry) => entry.source.startsWith(root))
  assert.equal(selected.length, 4)
  for (const entry of selected) assert.deepEqual(await readFile(entry.source), await readFile(blogPath(entry.destination)))
  const data = JSON.parse(await readFile(root + 'replay.json'))
  assert.deepEqual(data.events, evidence.events); assert.deepEqual(data.actions, evidence.actions)
  const viewer = await readFile(root + 'explorer.mjs', 'utf8')
  assert.match(viewer, /fetch\('replay.json'\)/)
  assert.equal([...viewer.matchAll(/\bfetch\(/g)].length, 1)
  assert.doesNotMatch(viewer, /WebSocket|innerHTML/)
  assert.match(viewer, /No capturado/)
})
