import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { hashes } from './hashes.mjs'
import { requestJson } from './request.mjs'
const tools = JSON.parse(await readFile('tools.json')), id = randomBytes(4).toString('hex')
const project = 'luisrc-kubernetes-' + id, namespace = 'k8s-lab-' + id, work = resolve('.artifacts', id)
const imageV1 = 'docker.io/library/' + project + ':v1', imageV2 = 'docker.io/library/' + project + ':v2'
const events = [], samples = [], start = performance.now(); let ownsNetwork = false, ownsCluster = false, origin, loadRunning = false, loadTasks = []
let settings = { message: 'volume-v1', ready: true, live: true }
await mkdir(work, { recursive: true, mode: 0o700 })
async function run(command, args, { input, accepts = [0], timeout = 240000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, { timeout, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !accepts.includes(error.code)) reject(error)
      else resolve({ code: error?.code ?? 0, stdout, stderr })
    })
    if (input !== undefined) child.stdin.end(input)
  })
}
const docker = (args, options) => run('docker', args, options)
const kubectl = (...args) => docker(['exec', project, 'kubectl', ...args])
const object = async (...args) => JSON.parse((await kubectl(...args, '-o', 'json')).stdout)
const waitFor = async (name, task, seconds = 180) => {
  const until = Date.now() + seconds * 1000
  while (Date.now() < until) { try { const value = await task(); if (value) return value } catch {} await new Promise((r) => setTimeout(r, 1500)) }
  throw Error('timeout:' + name)
}
const record = async (id, facts) => { events.push({ seq: events.length + 1, id, kind: 'observed', at: new Date().toISOString(), elapsedMs: Math.round(performance.now() - start), facts }); await writeFile(resolve(work, 'checkpoint.json'), JSON.stringify({ project, events, samples }, null, 2)); console.log(id) }
const podInfo = (pod) => ({ name: pod.metadata.name, uid: pod.metadata.uid, ready: pod.status.conditions?.some((c) => c.type === 'Ready' && c.status === 'True') ?? false,
  restarts: pod.status.containerStatuses?.[0]?.restartCount ?? 0, image: pod.spec.containers[0].image, imageId: pod.status.containerStatuses?.[0]?.imageID ?? null,
  owner: pod.metadata.ownerReferences?.[0]?.kind ?? null, phase: pod.status.phase })
const appPod = async () => (await object('-n', namespace, 'get', 'pods', '-l', 'app=catalogue')).items.find((p) => !p.metadata.deletionTimestamp)
const readyApp = () => waitFor('app-ready', async () => { const pod = await appPod(); return pod && podInfo(pod).ready && pod })
const http = (path = '/catalogue', host) => requestJson(origin, path, host)
const expectedHttp = (predicate) => waitFor('http-result', async () => { const value = await http(); return predicate(value) && value })
const readyHttp = () => expectedHttp((r) => r.status === 200)
async function apply(file) {
  const raw = (await readFile('manifests/' + file + '.json', 'utf8')).replaceAll('LAB_IMAGE_V1', imageV1).replaceAll('LAB_NAMESPACE', namespace)
  const resource = JSON.parse(raw); resource.metadata.namespace = namespace
  await docker(['exec', '-i', project, 'kubectl', 'apply', '-f', '-'], { input: JSON.stringify(resource) })
}
async function patchSettings(change, envMessage) {
  settings = { ...settings, ...change }
  const data = { 'settings.json': JSON.stringify(settings) }; if (envMessage !== undefined) data.envMessage = envMessage
  await kubectl('-n', namespace, 'patch', 'configmap', 'catalogue-settings', '--type=merge', '-p', JSON.stringify({ data }))
}
async function endpoints() {
  const data = await object('-n', namespace, 'get', 'endpointslices', '-l', 'kubernetes.io/service-name=catalogue')
  return data.items.flatMap((s) => s.endpoints.map((e) => ({ addresses: e.addresses, ready: e.conditions.ready ?? null, pod: e.targetRef?.name ?? null })))
}
const execNode = async (pod, source) => JSON.parse((await kubectl('-n', namespace, 'exec', pod, '--', 'node', '-e', source)).stdout)
async function sampleLoad(phase) {
  const [hpa, deployment] = await Promise.all([object('-n', namespace, 'get', 'hpa', 'catalogue'), object('-n', namespace, 'get', 'deployment', 'catalogue')])
  const cpu = hpa.status.currentMetrics?.find((m) => m.resource?.name === 'cpu')?.resource.current.averageUtilization
  const sample = { phase, at: new Date().toISOString(), elapsedMs: Math.round(performance.now() - start), cpuPercent: cpu ?? null,
    desired: hpa.status.desiredReplicas ?? null, current: hpa.status.currentReplicas ?? null, ready: deployment.status.readyReplicas ?? 0, target: 50 }
  samples.push(sample); return sample
}
const load = { requests: 0, successful: 0, failed: 0 }
const sources = await hashes()
try {
  assert.equal((await docker(['ps', '-aq', '--filter', 'name=^/' + project + '$'])).stdout.trim(), '')
  assert.equal((await docker(['network', 'ls', '-q', '--filter', 'name=^' + project + '$'])).stdout.trim(), '')
  await docker(['network', 'create', '--label', 'luisrc.lab=' + project, project]); ownsNetwork = true
  await docker(['run', '-d', '--name', project, '--hostname', project, '--label', 'luisrc.lab=' + project, '--network', project,
    '--privileged', '--cgroupns=host', '--tmpfs', '/run', '--tmpfs', '/var/run', '-p', '127.0.0.1::80', '-p', '127.0.0.1::6443', tools.k3s, 'server', '--disable=local-storage']); ownsCluster = true
  const nodes = await waitFor('node', async () => { const data = await object('get', 'nodes'); return data.items.some((n) => n.status.conditions.some((c) => c.type === 'Ready' && c.status === 'True')) && data })
  await waitFor('traefik', async () => (await object('-n', 'kube-system', 'get', 'deployment', 'traefik')).status.availableReplicas >= 1, 240)
  const info = JSON.parse((await docker(['inspect', project])).stdout)[0], binding = info.NetworkSettings.Ports['80/tcp'][0]
  assert.equal(binding.HostIp, '127.0.0.1'); origin = 'http://127.0.0.1:' + binding.HostPort
  await record('cluster_ready', { version: nodes.items[0].status.nodeInfo.kubeletVersion, nodes: nodes.items.length, traefikReady: true, loopbackOnly: true })
  const images = []
  for (const [version, image] of [['v1', imageV1], ['v2', imageV2]]) {
    await docker(['build', '--build-arg', 'APP_VERSION=' + version, '-t', image, '.'])
    const tar = resolve(work, version + '.tar'); await docker(['save', '-o', tar, image]); await docker(['cp', tar, project + ':/tmp/' + version + '.tar'])
    await docker(['exec', project, 'ctr', 'images', 'import', '/tmp/' + version + '.tar']); await docker(['exec', project, 'rm', '/tmp/' + version + '.tar']); await rm(tar)
    images.push({ version, image, id: JSON.parse((await docker(['image', 'inspect', image])).stdout)[0].Id })
  }
  assert.notEqual(images[0].id, images[1].id); await record('images_imported', { images, bakedVersion: true })
  await kubectl('create', 'namespace', namespace)
  for (const name of ['configmap', 'secret', 'service-account', 'deployment', 'service', 'ingress']) await apply(name)
  await readyApp(); const baseline = await readyHttp(); assert.equal(baseline.body.version, 'v1')
  const initial = podInfo(await appPod()); await record('baseline_ready', { pod: initial, http: baseline, endpoints: await endpoints() })
  await kubectl('-n', namespace, 'delete', 'pod', initial.name, '--wait=true'); const replaced = podInfo(await readyApp())
  assert.notEqual(initial.uid, replaced.uid); assert.equal(initial.imageId, replaced.imageId)
  const rs = await object('-n', namespace, 'get', 'replicasets', '-l', 'app=catalogue')
  assert.ok(rs.items.some((r) => r.metadata.ownerReferences?.some((o) => o.kind === 'Deployment')))
  await record('pod_replaced', { before: initial, after: replaced, replicaSetOwnedByDeployment: true, http: await readyHttp() })
  await kubectl('-n', namespace, 'set', 'image', 'deployment/catalogue', 'api=' + imageV2)
  await kubectl('-n', namespace, 'rollout', 'status', 'deployment/catalogue', '--timeout=180s')
  await record('rollout_v2', { pod: podInfo(await readyApp()), http: await expectedHttp((r) => r.status === 200 && r.body.version === 'v2') })
  await kubectl('-n', namespace, 'rollout', 'undo', 'deployment/catalogue'); await kubectl('-n', namespace, 'rollout', 'status', 'deployment/catalogue', '--timeout=180s')
  await record('rollout_undo_v1', { pod: podInfo(await readyApp()), http: await expectedHttp((r) => r.status === 200 && r.body.version === 'v1') })
  await apply('client-pod'); await kubectl('-n', namespace, 'wait', '--for=condition=Ready', 'pod/dns-client', '--timeout=120s')
  const dns = await waitFor('service-dns', () => execNode('dns-client', `const dns=require('node:dns').promises;(async()=>{const name='catalogue.${namespace}.svc.cluster.local';const result=await dns.lookup(name);const r=await fetch('http://'+name+'/catalogue',{signal:AbortSignal.timeout(3000)});console.log(JSON.stringify({name,address:result.address,status:r.status,body:await r.json()}))})();`))
  assert.equal(dns.status, 200); await record('service_dns', { dns, endpoints: await endpoints(), clusterIp: (await object('-n', namespace, 'get', 'service', 'catalogue')).spec.clusterIP })
  const wrong = await http('/catalogue', 'wrong.lab.test'); assert.equal(wrong.status, 404)
  await record('ingress_rules', { matched: await readyHttp(), unmatched: wrong, controller: (await object('get', 'ingressclass', 'traefik')).spec.controller })
  await apply('slow-start-pod')
  await waitFor('slow-container-running', async () => (await object('-n', namespace, 'get', 'pod', 'slow-start')).status.containerStatuses?.[0]?.state.running)
  const beforeSlow = podInfo(await object('-n', namespace, 'get', 'pod', 'slow-start'))
  const duringSlow = await execNode('slow-start', `(async()=>{const r=await fetch('http://127.0.0.1:3000/startup');console.log(JSON.stringify({status:r.status,body:await r.json()}))})();`)
  assert.equal(duringSlow.status, 503)
  await waitFor('startup-completed', async () => { const pod = await object('-n', namespace, 'get', 'pod', 'slow-start'); return podInfo(pod).ready && pod })
  const afterSlow = podInfo(await object('-n', namespace, 'get', 'pod', 'slow-start')); assert.equal(afterSlow.restarts, 0)
  await record('startup_protected', { before: beforeSlow, after: afterSlow, during: duringSlow, initializationMs: 8000 })
  await apply('no-startup-pod')
  const looping = await waitFor('startup-negative', async () => { const pod = await object('-n', namespace, 'get', 'pod', 'no-startup'); return podInfo(pod).restarts > 0 && pod })
  await record('startup_missing_probe', { pod: podInfo(looping), initializationMs: 8000 })
  await kubectl('-n', namespace, 'delete', 'pod', 'slow-start', 'no-startup', '--wait=true')
  const beforeReady = podInfo(await appPod()); await patchSettings({ ready: false })
  const unready = await waitFor('unready-endpoints', async () => { const eps = await endpoints(); const pod = podInfo(await appPod()); return eps.length && eps.every((e) => e.ready === false) && !pod.ready && { pod, endpoints: eps } })
  assert.equal(unready.pod.uid, beforeReady.uid); assert.equal(unready.pod.restarts, beforeReady.restarts)
  await record('readiness_removed_endpoint', { before: beforeReady, ...unready, http: await expectedHttp((r) => r.status === 503) })
  await patchSettings({ ready: true }); await readyApp(); await record('readiness_recovered', { pod: podInfo(await appPod()), endpoints: await endpoints(), http: await readyHttp() })
  const beforeLive = podInfo(await appPod()); await patchSettings({ live: false })
  await waitFor('liveness-restart', async () => podInfo(await appPod()).restarts > beforeLive.restarts)
  await patchSettings({ live: true }); await readyApp(); const afterLive = podInfo(await appPod())
  assert.equal(beforeLive.uid, afterLive.uid); assert.ok(afterLive.restarts > beforeLive.restarts)
  await record('liveness_restarted', { before: beforeLive, after: afterLive, http: await readyHttp() })
  const beforeConfig = podInfo(await appPod()); await patchSettings({ message: 'volume-v2' }, 'env-v2')
  const changed = await expectedHttp((r) => r.status === 200 && r.body.message === 'volume-v2'); assert.equal(changed.body.envMessage, 'env-v1')
  await record('config_volume_changed_env_stale', { pod: podInfo(await appPod()), before: beforeConfig, http: changed })
  await kubectl('-n', namespace, 'rollout', 'restart', 'deployment/catalogue'); await kubectl('-n', namespace, 'rollout', 'status', 'deployment/catalogue', '--timeout=180s')
  await record('config_env_refreshed', { pod: podInfo(await readyApp()), http: await expectedHttp((r) => r.status === 200 && r.body.envMessage === 'env-v2') })
  for (const name of ['reader-account', 'reader-role', 'reader-binding']) await apply(name)
  const identity = 'system:serviceaccount:' + namespace + ':reader'
  await kubectl('-n', namespace, 'get', 'configmap', 'catalogue-settings', '--as=' + identity)
  const denied = await docker(['exec', project, 'kubectl', '-n', namespace, 'get', 'secret', 'catalogue-dummy', '--as=' + identity], { accepts: [1] })
  assert.equal(denied.code, 1); assert.match(denied.stderr, /Forbidden/)
  const secret = await object('-n', namespace, 'get', 'secret', 'catalogue-dummy')
  assert.equal(Buffer.from(secret.data.credential, 'base64').toString(), 'public-fixture-not-a-real-credential')
  await record('rbac_and_secret', { configMapGetAllowed: true, secretGetForbidden: true, impersonatedIdentity: identity, fixtureBase64Decoded: true, secretValuePublished: false, appTokenAutomount: (await appPod()).spec.automountServiceAccountToken })
  await apply('unschedulable-pod')
  const pending = await waitFor('unschedulable', async () => { const pod = await object('-n', namespace, 'get', 'pod', 'unschedulable'); return pod.status.conditions?.some((c) => c.type === 'PodScheduled' && c.reason === 'Unschedulable') && pod })
  const condition = pending.status.conditions.find((c) => c.type === 'PodScheduled'); assert.match(condition.message, /Insufficient cpu/)
  await record('unschedulable_request', { phase: pending.status.phase, scheduled: Boolean(pending.spec.nodeName), reason: condition.reason, insufficientCpu: true, cpuRequest: pending.spec.containers[0].resources.requests.cpu })
  await kubectl('-n', namespace, 'delete', 'pod', 'unschedulable', '--wait=true')
  await apply('oom-pod')
  const oom = await waitFor('oom-killed', async () => { const pod = await object('-n', namespace, 'get', 'pod', 'memory-limit'); return pod.status.containerStatuses?.[0]?.state.terminated?.reason === 'OOMKilled' && pod })
  await record('memory_oom', { phase: oom.status.phase, termination: oom.status.containerStatuses[0].state.terminated, memoryLimit: '64Mi', allocationAttemptMi: 256 })
  await kubectl('-n', namespace, 'delete', 'pod', 'memory-limit', '--wait=true')
  await waitFor('metrics-server', async () => (await object('-n', 'kube-system', 'get', 'deployment', 'metrics-server')).status.availableReplicas >= 1)
  await apply('hpa')
  const baselineMetric = await waitFor('hpa-metrics', async () => { const sample = await sampleLoad('baseline'); return sample.cpuPercent !== null && sample }, 240)
  await record('hpa_metrics_ready', { sample: baselineMetric, cpuRequest: '50m', targetUtilization: 50, minReplicas: 1, maxReplicas: 3 })
  loadRunning = true
  loadTasks = Array.from({ length: 8 }, async () => { while (loadRunning) { load.requests++; try { const result = await http('/work?ms=20'); if (result.status === 200) load.successful++; else load.failed++ } catch { load.failed++ } } })
  const scaled = await waitFor('hpa-scale-up', async () => { const sample = await sampleLoad('load'); return sample.desired >= 2 && sample.ready >= 2 && sample.cpuPercent > 50 && sample }, 300)
  await record('hpa_scaled_up', { sample: scaled, load: { ...load }, clients: 8, workMs: 20 })
  loadRunning = false; await Promise.all(loadTasks)
  const reduced = await waitFor('hpa-scale-down', async () => { const sample = await sampleLoad('recovery'); return sample.desired === 1 && sample.ready === 1 && sample.cpuPercent !== null && sample }, 300)
  await record('hpa_scaled_down', { sample: reduced, load: { ...load }, http: await readyHttp() })
  await kubectl('delete', 'namespace', namespace, '--wait=true', '--timeout=180s')
  assert.equal((await kubectl('get', 'namespace', namespace, '--ignore-not-found', '-o', 'name')).stdout.trim(), '')
  await record('namespace_removed', { namespaceAbsent: true })
} finally {
  loadRunning = false; await Promise.allSettled(loadTasks)
  if (ownsCluster) await docker(['rm', '-f', '-v', project])
  if (ownsNetwork) await docker(['network', 'rm', project])
}
assert.deepEqual(await hashes(), sources)
assert.equal((await docker(['ps', '-aq', '--filter', 'label=luisrc.lab=' + project])).stdout.trim(), '')
assert.equal((await docker(['network', 'ls', '-q', '--filter', 'label=luisrc.lab=' + project])).stdout.trim(), '')
await record('cluster_removed', { containerAbsent: true, networkAbsent: true, imagesRetained: [imageV1, imageV2] })
const report = { kind: 'local_kubernetes_workload_observation', capturedAt: new Date().toISOString(), project, namespace, sources, tools, events, samples,
  limits: { productionCluster: false, multiNodeFailureTested: false, continuousAvailabilityProven: false, throughputBenchmark: false, secretEncryptionVerified: false, realTokenAuthenticationTested: false, externalLoadBalancerProvisioned: false } }
await mkdir('evidence', { recursive: true }); await writeFile('evidence/kubernetes.json', JSON.stringify(report, null, 2) + '\n')
const { sources: _sources, ...replay } = report; await writeFile('replay.json', JSON.stringify(replay, null, 2) + '\n')
console.log(events.length + ' fases Kubernetes reales, HPA observado y recursos propios eliminados.')
