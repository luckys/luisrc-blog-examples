import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
import { blogPath } from '../../scripts/blog-path.mjs'
import { chartSeries } from '../../packages/kubernetes-workloads/chart.mjs'
const root = 'packages/kubernetes-workloads/', json = async (file) => JSON.parse(await readFile(file))
const manifest = await json(editorialPath('kubernetes-series.json'))
const evidence = await json(root + 'evidence/kubernetes.json')
const posts = await Promise.all(manifest.articles.map(async (entry) => ({ entry, source: await readFile(blogPath('src/content/posts/es/' + entry.slug + '.md'), 'utf8') })))
const event = (id) => evidence.events.find((e) => e.id === id).facts
const compact = (s) => s.replace(/\s/g, '').replaceAll('"', "'").replaceAll(';', '').replace(/,(?=[)}\]])/g, '')

test('Kubernetes: once drafts por concepto con orden y prerequisitos existentes', async () => {
  assert.deepEqual(manifest.articles.map((a) => a.id), ['K8S-PODS', 'K8S-DEPLOYMENTS', 'K8S-SERVICES', 'K8S-INGRESS', 'K8S-STARTUP', 'K8S-READINESS', 'K8S-LIVENESS', 'K8S-CONFIG', 'K8S-SECRETS', 'K8S-RESOURCES', 'K8S-HPA'])
  const known = new Set(), seen = new Set(); let date = -Infinity
  for (const file of await readdir(blogPath('src/content/posts/es'))) { const s = await readFile(blogPath('src/content/posts/es/' + file), 'utf8'); known.add(YAML.parse(s.match(/^---\n([\s\S]*?)\n---/)[1]).id) }
  for (const { entry, source } of posts) {
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1])
    for (const key of ['id', 'title', 'slug', 'prerequisites']) assert.deepEqual(meta[key], entry[key])
    assert.equal(meta.locale, 'es'); assert.equal(meta.author, 'Luis Ramírez Calle'); assert.equal(meta.series, manifest.name); assert.equal(meta.draft, true); assert.equal(meta.status, 'draft')
    assert.ok(new Date(meta.published).valueOf() > date); date = new Date(meta.published).valueOf()
    for (const id of meta.prerequisites) { assert.ok(known.has(id), id); if (id.startsWith('K8S-')) assert.ok(seen.has(id)) } seen.add(entry.id)
    for (const heading of ['## Código completo y pruebas', '## Garantías y límites', '## Ejercicio:', '## Referencias']) assert.ok(source.includes(heading))
    assert.doesNotMatch(source, /—|\{\{diagram|\{\{json|\{\{js/)
    for (const file of entry.files) await access(root + file)
  }
})

test('Kubernetes: catorce extractos coinciden con sus manifiestos y observador probados', async () => {
  const specs = {
    'K8S-PODS': [], 'K8S-DEPLOYMENTS': [['deployment', '/spec/strategy']], 'K8S-SERVICES': [['service', '']], 'K8S-INGRESS': [['ingress', '/spec']],
    'K8S-STARTUP': [['slow-start-pod', '/spec/containers/0/startupProbe']], 'K8S-READINESS': [['deployment', '/spec/template/spec/containers/0/readinessProbe']],
    'K8S-LIVENESS': [['deployment', '/spec/template/spec/containers/0/livenessProbe']], 'K8S-CONFIG': [['deployment', '/spec/template/spec/containers/0/env/1'], ['deployment', '/spec/template/spec/containers/0/volumeMounts/0']],
    'K8S-SECRETS': [['service-account', ''], ['reader-role', '']], 'K8S-RESOURCES': [['deployment', '/spec/template/spec/containers/0/resources'], ['oom-pod', '/spec/containers/0/command']], 'K8S-HPA': [['hpa', '/spec']],
  }
  let count = 0
  for (const { entry, source } of posts) {
    const snippets = [...source.matchAll(/```json\n([\s\S]*?)\n```/g)]
    assert.equal(snippets.length, specs[entry.id].length)
    for (const [i, [file, path]] of specs[entry.id].entries()) {
      let expected = await json(root + 'manifests/' + file + '.json')
      for (const component of path.split('/').filter(Boolean)) expected = expected[component]
      assert.deepEqual(JSON.parse(snippets[i][1]), expected, entry.id); count++
    }
  }
  const script = compact(await readFile(root + 'scripts/exercise.mjs', 'utf8'))
  for (const [, snippet] of posts[0].source.matchAll(/```javascript\n([\s\S]*?)\n```/g)) { assert.ok(script.includes(compact(snippet))); count++ }
  assert.equal(count, 14)
})

test('Kubernetes: once D2 móviles y gráfica HPA corresponden a muestras y dimensiones reales', async () => {
  let count = 0
  for (const { entry, source } of posts) {
    await access(blogPath('assets/kubernetes/' + entry.id + '.d2'))
    for (const [, path, alt, width, height] of source.matchAll(/<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g)) {
      assert.ok(alt.length > 80)
      const svg = await readFile(blogPath('public' + path), 'utf8'), [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
      assert.equal(+width, w); assert.equal(+height, h); assert.ok(w <= 380); count++
    }
  }
  assert.equal(count, 12)
  const svg = await readFile(root + 'hpa-observations.svg', 'utf8'), chart = chartSeries(evidence.samples)
  assert.ok(svg.includes(`points="${chart.desired}"`)); assert.ok(svg.includes(`points="${chart.ready}"`))
  const expectedDesired = evidence.samples.filter((s) => Number.isFinite(s.desired) && Number.isFinite(s.cpuPercent)).map((s) => chart.point(s, s.desired).map((v) => v.toFixed(2)).join(',')).join(' ')
  assert.equal(chart.desired, expectedDesired)
  assert.match(svg, /Sin CPU válida no se traza deseo inicial/)
  const first = evidence.samples[0].elapsedMs, last = evidence.samples.at(-1).elapsedMs
  for (const s of evidence.samples) for (const key of ['desired', 'ready']) if (Number.isFinite(s[key])) {
    assert.ok(s[key] >= 0 && s[key] <= 3)
    assert.deepEqual(chart.point(s, s[key]), [40 + 310 * (s.elapsedMs - first) / (last - first), 245 - 60 * s[key]])
  }
  assert.match(svg, /No es un benchmark/)
})

test('Kubernetes:23fases observadas y fuentes actuales sin exportar Secret o credenciales', async () => {
  assert.equal(evidence.kind, 'local_kubernetes_workload_observation'); assert.equal(evidence.events.length, 23); assert.equal(Object.keys(evidence.sources).length, 26)
  assert.deepEqual(evidence.events.map((e) => e.id), ['cluster_ready', 'images_imported', 'baseline_ready', 'pod_replaced', 'rollout_v2', 'rollout_undo_v1', 'service_dns', 'ingress_rules', 'startup_protected', 'startup_missing_probe', 'readiness_removed_endpoint', 'readiness_recovered', 'liveness_restarted', 'config_volume_changed_env_stale', 'config_env_refreshed', 'rbac_and_secret', 'unschedulable_request', 'memory_oom', 'hpa_metrics_ready', 'hpa_scaled_up', 'hpa_scaled_down', 'namespace_removed', 'cluster_removed'])
  for (const [file, sha] of Object.entries(evidence.sources)) assert.equal(createHash('sha256').update(await readFile(root + file)).digest('hex'), sha, file)
  for (const [i, e] of evidence.events.entries()) { assert.equal(e.seq, i + 1); assert.equal(e.kind, 'observed'); if (i) assert.ok(e.elapsedMs >= evidence.events[i - 1].elapsedMs) }
  assert.doesNotMatch(JSON.stringify(evidence), /public-fixture-not-a-real-credential|client-key-data|BEGIN PRIVATE KEY/)
  assert.ok(Object.values(evidence.limits).every((v) => v === false))
  assert.equal(event('cluster_removed').containerAbsent, true); assert.equal(event('cluster_removed').networkAbsent, true); assert.equal(event('namespace_removed').namespaceAbsent, true)
})

test('Kubernetes: identidad, rutas y tres probes distinguen mecanismos reales', () => {
  const pod = event('pod_replaced'); assert.notEqual(pod.before.uid, pod.after.uid); assert.equal(pod.before.imageId, pod.after.imageId)
  assert.equal(event('rollout_v2').http.body.version, 'v2'); assert.equal(event('rollout_undo_v1').http.body.version, 'v1')
  assert.equal(event('service_dns').dns.address, event('service_dns').clusterIp); assert.equal(event('service_dns').dns.status, 200)
  assert.equal(event('ingress_rules').matched.status, 200); assert.equal(event('ingress_rules').unmatched.status, 404)
  assert.equal(event('startup_protected').during.status, 503); assert.equal(event('startup_protected').after.restarts, 0); assert.ok(event('startup_missing_probe').pod.restarts > 0)
  const ready = event('readiness_removed_endpoint'); assert.equal(ready.pod.uid, ready.before.uid); assert.equal(ready.pod.restarts, ready.before.restarts); assert.ok(ready.endpoints.every((e) => e.ready === false)); assert.equal(ready.http.status, 503)
  const live = event('liveness_restarted'); assert.equal(live.before.uid, live.after.uid); assert.ok(live.after.restarts > live.before.restarts)
})

test('Kubernetes: configuración, RBAC, scheduling, OOM y escalado tienen evidencia específica', () => {
  const config = event('config_volume_changed_env_stale'); assert.equal(config.http.body.message, 'volume-v2'); assert.equal(config.http.body.envMessage, 'env-v1'); assert.equal(config.before.uid, config.pod.uid)
  assert.equal(event('config_env_refreshed').http.body.envMessage, 'env-v2')
  const rbac = event('rbac_and_secret'); assert.equal(rbac.secretGetForbidden, true); assert.equal(rbac.configMapGetAllowed, true); assert.equal(rbac.appTokenAutomount, false)
  assert.equal(event('unschedulable_request').scheduled, false); assert.equal(event('memory_oom').termination.reason, 'OOMKilled')
  assert.ok(event('hpa_scaled_up').sample.ready >= 2); assert.ok(event('hpa_scaled_up').sample.cpuPercent > 50)
  assert.equal(event('hpa_scaled_down').sample.desired, 1); assert.equal(event('hpa_scaled_down').sample.ready, 1)
  const load = event('hpa_scaled_down').load; assert.ok(load.requests > 0); assert.equal(load.requests, load.successful + load.failed)
  assert.ok(evidence.samples.some((s) => s.phase === 'load' && s.desired >= 2)); assert.ok(evidence.samples.some((s) => s.phase === 'recovery' && s.desired === 1))
  assert.match(posts[8].source, /identidad \*\*impersonada\*\*/); assert.match(posts[10].source, /No es el 50% del nodo/)
})

test('Kubernetes: cinco exports canónicos y visor sin control remoto ni métricas heredadas', async () => {
  const exports = (await json('metadata/blog-exports.json')).filter((e) => e.source.startsWith(root)); assert.equal(exports.length, 5)
  for (const e of exports) assert.deepEqual(await readFile(e.source), await readFile(blogPath(e.destination)))
  const { sources, ...replay } = evidence; assert.deepEqual(await json(root + 'replay.json'), replay)
  const script = await readFile(root + 'explorer.mjs', 'utf8')
  assert.equal([...script.matchAll(/\bfetch\(/g)].length, 1); assert.match(script, /fetch\('replay.json'\)/)
  assert.doesNotMatch(script, /innerHTML|WebSocket/); assert.match(script, /No capturado/)
  const html = await readFile(root + 'explorer.html', 'utf8'); assert.match(html, /noindex,nofollow/); assert.match(html, /historial independiente/)
})
