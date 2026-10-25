import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'
const json = async (file) => JSON.parse(await readFile(file))
const root = 'packages/declarative-infrastructure/'
const manifest = await json(blogPath('docs/editorial/terraform-series.json'))
const evidence = await json(root + 'evidence/terraform.json')
const posts = await Promise.all(manifest.articles.map(async (entry) => ({ entry, source: await readFile(blogPath('src/content/posts/es/' + entry.slug + '.md'), 'utf8') })))
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')
const event = (id) => evidence.events.find((e) => e.id === id).facts

test('Terraform: seis drafts con dependencias y alcance P065 en dos bloques', async () => {
  assert.deepEqual(manifest.articles.map((a) => a.id), ['P065', 'TF-PROVIDERS', 'TF-STATE', 'TF-MODULES', 'TF-DRIFT', 'TF-CHANGES'])
  assert.match(manifest.roadmapScope, /cobertura conjunta/)
  const complement = await json(blogPath('docs/editorial/kubernetes-series.json'))
  assert.equal(complement.articles.length, 11)
  for (const a of complement.articles) await access(blogPath('src/content/posts/es/' + a.slug + '.md'))
  const known = new Set(), seen = new Set(); let date = -Infinity
  for (const file of await readdir(blogPath('src/content/posts/es'))) {
    const s = await readFile(blogPath('src/content/posts/es/' + file), 'utf8')
    known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id)
  }
  for (const { entry, source } of posts) {
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
    for (const key of ['id', 'title', 'slug', 'prerequisites']) assert.deepEqual(meta[key], entry[key])
    assert.equal(meta.locale, 'es'); assert.equal(meta.author, 'Luis Ramírez Calle'); assert.equal(meta.draft, true); assert.equal(meta.status, 'draft'); assert.equal(meta.series, manifest.name)
    assert.ok(new Date(meta.published).valueOf() > date); date = new Date(meta.published).valueOf()
    for (const id of meta.prerequisites) { assert.ok(known.has(id), id); if (id.startsWith('TF-') || id === 'P065') assert.ok(seen.has(id)) }
    seen.add(entry.id)
    assert.doesNotMatch(source, /—|\{\{diagram|\{\{snippet/)
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias']) assert.ok(source.includes(heading))
    for (const file of entry.files) await access(root + file)
  }
  const route = await readFile(blogPath('docs/editorial/ruta-terraform-kubernetes.md'), 'utf8')
  assert.match(route, /Bloque Kubernetes/); assert.match(route, /HPA/)
  assert.match(posts[0].source, /bloque Kubernetes.*completa/)
})

test('Terraform: siete extractos HCL/JavaScript pertenecen al módulo y al runner probados', async () => {
  const files = ['terraform/main.tf', 'terraform/versions.tf', 'terraform/modules/catalogue/main.tf', 'terraform/modules/catalogue/variables.tf', 'scripts/plan.mjs']
  const code = compact((await Promise.all(files.map((f) => readFile(root + f, 'utf8')))).join('\n')); let count = 0
  for (const { entry, source } of posts) for (const [, snippet] of source.matchAll(/```(?:hcl|javascript)\n([\s\S]*?)\n```/g)) {
    assert.ok(code.includes(compact(snippet)), entry.id); count++
  }
  assert.equal(count, 7)
})

test('Terraform: seis diagramas móviles y gráfico derivado con escala común y reemplazos separados', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    await access(blogPath('assets/terraform/' + entry.id + '.d2'))
    for (const [, path, alt, width, height] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath('public' + path), 'utf8')
      const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); assert.ok(w <= 380); count++
    }
  }
  assert.equal(count, 7)
  const svg = await readFile(root + 'plan-actions.svg', 'utf8')
  for (const id of ['create_planned', 'drift_detected', 'replacement_planned', 'destroyed_owned_resources']) {
    const f = event(id), counts = (f.plan ?? f).counts
    assert.ok(svg.includes(`${id}: crear ${counts.create}, actualizar ${counts.update}, borrar ${counts.delete}, reemplazar ${counts.replace}`))
    for (const key of ['create', 'update', 'delete']) assert.ok(svg.includes((279 * counts[key] / 6).toFixed(2)))
  }
})

test('Terraform: observaciones reales de provider, state y HTTP sin publicar archivos privados', async () => {
  assert.equal(evidence.kind, 'local_terraform_kubernetes_observation')
  assert.equal(evidence.events.length, 16); assert.equal(Object.keys(evidence.sources).length, 17)
  for (const [file, hash] of Object.entries(evidence.sources)) assert.equal(createHash('sha256').update(await readFile(root + file)).digest('hex'), hash, file)
  for (const [i, e] of evidence.events.entries()) { assert.equal(e.seq, i + 1); assert.equal(e.kind, 'observed'); if (i) assert.ok(e.elapsedMs >= evidence.events[i - 1].elapsedMs) }
  assert.equal(event('initialized_validated').terraform, '1.15.3')
  assert.deepEqual(event('initialized_validated').provider, { 'registry.terraform.io/hashicorp/kubernetes': '3.4.0' })
  assert.equal(event('initialized_validated').lockfileReadonly, true)
  assert.equal(event('create_planned').secretDataMarkedSensitive, true)
  assert.equal(event('applied_http_ready').stateContainsDummyValue, true)
  assert.equal(event('applied_http_ready').resourcesInState, 6)
  assert.equal(event('applied_http_ready').http.body.message, 'hello-from-terraform')
  assert.equal(event('no_changes').exitCode, 0)
  const source = JSON.stringify(evidence)
  assert.doesNotMatch(source, /public-lab-fixture-not-a-real-secret|client-key-data|BEGIN PRIVATE KEY/)
  assert.ok(Object.values(evidence.limits).every((v) => v === false))
})

test('Terraform: drift, stale, reemplazo y reconciliación tienen resultados observados distintos', () => {
  const pod = event('pod_reconciled_without_apply'); assert.notEqual(pod.beforeUid, pod.afterUid); assert.equal(pod.terraformPlan.exitCode, 0)
  assert.equal(event('drift_detected').http.body.message, 'manual-drift'); assert.equal(event('drift_detected').plan.counts.update, 1)
  assert.equal(event('drift_repaired').http.body.message, 'hello-from-terraform'); assert.equal(event('drift_repaired').plan.exitCode, 0)
  assert.equal(event('stale_plan_rejected').reason, 'Saved plan is stale'); assert.equal(event('stale_plan_rejected').http.body.message, 'new-state-b')
  const replacement = event('replacement_planned'); assert.equal(replacement.counts.replace, 1); assert.equal(replacement.counts.update, 1)
  assert.deepEqual(replacement.changes.find((r) => r.address.endsWith('config_map_v1.settings')).actions, ['create', 'delete'])
  assert.equal(event('replacement_applied').oldConfigMapAbsent, true)
  const refresh = event('refresh_only_does_not_repair'); assert.equal(refresh.refreshPlan.changes.length, 0); assert.equal(refresh.refreshPlan.observedDrift.counts.update, 1)
  assert.equal(refresh.normalPlan.counts.update, 1); assert.equal(refresh.http.body.message, 'refresh-only-drift')
  assert.equal(event('normal_apply_restores_config').plan.exitCode, 0)
  assert.equal(event('destroyed_owned_resources').namespaceAbsent, true); assert.equal(event('destroyed_owned_resources').resourcesInState, 0)
  assert.equal(event('local_cluster_removed').containerAbsent, true); assert.equal(event('local_cluster_removed').networkAbsent, true)
})

test('Terraform: cuatro exports canónicos, visor sin control y fases sin valores heredados', async () => {
  const exports = (await json('metadata/blog-exports.json')).filter((e) => e.source.startsWith(root)); assert.equal(exports.length, 4)
  for (const e of exports) assert.deepEqual(await readFile(e.source), await readFile(blogPath(e.destination)))
  const { sources, ...replay } = evidence; assert.deepEqual(await json(root + 'replay.json'), replay)
  const viewer = await readFile(root + 'explorer.mjs', 'utf8')
  assert.equal([...viewer.matchAll(/\bfetch\(/g)].length, 1); assert.match(viewer, /fetch\('replay.json'\)/)
  assert.doesNotMatch(viewer, /innerHTML|WebSocket/); assert.match(viewer, /No capturado/)
  const runner = await readFile(root + 'scripts/exercise.mjs', 'utf8')
  assert.match(runner, /if \(ownsCluster\) await docker/); assert.doesNotMatch(runner, /\bprune\b/)
  const html = await readFile(root + 'explorer.html', 'utf8'); assert.match(html, /noindex,nofollow/); assert.match(html, /lang="es"/)
})
