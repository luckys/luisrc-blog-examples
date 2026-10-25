import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, cp, chmod, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { summarizePlan, assertPlanScope } from './plan.mjs'
import { hashes } from './hashes.mjs'
import { requestCatalogue } from './request.mjs'
const execute = promisify(execFile), tools = JSON.parse(await readFile('tools.json'))
const id = randomBytes(4).toString('hex'), project = 'luisrc-declarative-' + id, namespace = 'tf-lab-' + id
const root = resolve('.'), work = resolve('.artifacts', id), events = [], start = performance.now()
let ownsNetwork = false, ownsCluster = false, origin
await mkdir(work, { recursive: true, mode: 0o700 }); await chmod(work, 0o700)
const run = async (command, args, { accepts = [0], ...options } = {}) => {
  try { const result = await execute(command, args, { timeout: 240000, maxBuffer: 32 * 1024 * 1024, ...options }); return { ...result, code: 0 } }
  catch (error) { if (accepts.includes(error.code)) return { code: error.code, stdout: error.stdout ?? '', stderr: error.stderr ?? '' }; throw error }
}
const docker = (args, options) => run('docker', args, options)
const kubectl = (...args) => docker(['exec', project, 'kubectl', ...args])
const object = async (...args) => JSON.parse((await kubectl(...args, '-o', 'json')).stdout)
const waitFor = async (name, task, seconds = 180) => {
  const until = Date.now() + seconds * 1000
  while (Date.now() < until) { try { const value = await task(); if (value) return value } catch {} await new Promise((r) => setTimeout(r, 1500)) }
  throw Error('timeout:' + name)
}
const record = async (id, facts) => {
  const event = { seq: events.length + 1, id, kind: 'observed', at: new Date().toISOString(), elapsedMs: Math.round(performance.now() - start), facts }
  events.push(event); await writeFile(resolve(work, 'checkpoint.json'), JSON.stringify({ project, events }, null, 2)); console.log(id)
}
const tf = (args, options) => docker(['run', '--rm', '--network', 'container:' + project,
  '--user', process.getuid() + ':' + process.getgid(), '-e', 'TF_IN_AUTOMATION=1',
  '-v', work + ':/work', '-w', '/work', tools.terraform, ...args], options)
const tfJson = async (...args) => JSON.parse((await tf(args)).stdout)
const variables = { namespace, image: 'docker.io/library/' + project + ':v1', message: 'hello-from-terraform', config_revision: 'v1' }
const writeVars = () => writeFile(resolve(work, 'lab.auto.tfvars.json'), JSON.stringify(variables))
const plan = async (name, extra = []) => {
  await writeVars()
  const result = await tf(['plan', '-input=false', '-no-color', '-detailed-exitcode', '-out=' + name + '.plan', ...extra], { accepts: [0, 2] })
  const raw = await tfJson('show', '-json', name + '.plan'), summary = summarizePlan(raw)
  assertPlanScope(summary)
  await writeFile(resolve(work, name + '.summary.json'), JSON.stringify({ exitCode: result.code, ...summary }, null, 2))
  return { exitCode: result.code, ...summary, observedDrift: summarizePlan({ resource_changes: raw.resource_drift }) }
}
const apply = (name) => tf(['apply', '-input=false', '-no-color', name + '.plan'])
const http = () => requestCatalogue(origin)
const messageIs = (message) => waitFor('http:' + message, async () => { const result = await http(); return result.status === 200 && result.body.message === message && result })
const configName = () => 'catalogue-' + variables.config_revision
const flatten = (module) => [...(module?.resources ?? []), ...(module?.child_modules ?? []).flatMap(flatten)]
const sources = await hashes()
try {
  assert.equal((await docker(['ps', '-aq', '--filter', 'name=^/' + project + '$'])).stdout.trim(), '')
  assert.equal((await docker(['network', 'ls', '-q', '--filter', 'name=^' + project + '$'])).stdout.trim(), '')
  await docker(['network', 'create', '--label', 'luisrc.lab=' + project, project]); ownsNetwork = true
  await docker(['run', '-d', '--name', project, '--hostname', project, '--label', 'luisrc.lab=' + project, '--network', project,
    '--privileged', '--cgroupns=host', '--tmpfs', '/run', '--tmpfs', '/var/run', '-p', '127.0.0.1::80', '-p', '127.0.0.1::6443',
    tools.k3s, 'server', '--disable=local-storage', '--write-kubeconfig-mode=600']); ownsCluster = true
  const nodes = await waitFor('node-ready', async () => { const nodes = await object('get', 'nodes'); return nodes.items.some((n) => n.status.conditions.some((c) => c.type === 'Ready' && c.status === 'True')) && nodes })
  await waitFor('traefik-ready', async () => {
    const deployment = await object('-n', 'kube-system', 'get', 'deployment', 'traefik')
    return deployment.status.availableReplicas >= 1
  }, 240)
  const info = JSON.parse((await docker(['inspect', project])).stdout)[0]
  const binding = info.NetworkSettings.Ports['80/tcp'][0]; assert.equal(binding.HostIp, '127.0.0.1'); origin = 'http://127.0.0.1:' + binding.HostPort
  await record('cluster_ready', { nodes: nodes.items.length, version: nodes.items[0].status.nodeInfo.kubeletVersion, traefikReady: true, publishedOnLoopback: true })
  await docker(['build', '-t', variables.image, '.'])
  await docker(['save', '-o', resolve(work, 'api.tar'), variables.image])
  await docker(['cp', resolve(work, 'api.tar'), project + ':/tmp/api.tar'])
  await docker(['exec', project, 'ctr', 'images', 'import', '/tmp/api.tar'])
  await docker(['exec', project, 'rm', '/tmp/api.tar'])
  const image = JSON.parse((await docker(['image', 'inspect', variables.image])).stdout)[0]
  await record('image_imported', { image: variables.image, imageId: image.Id, importedIntoLocalContainerd: true })
  await cp('terraform', work, { recursive: true, filter: (path) => !path.split('/').includes('.terraform') })
  await docker(['cp', project + ':/etc/rancher/k3s/k3s.yaml', resolve(work, 'kubeconfig')]); await chmod(resolve(work, 'kubeconfig'), 0o600)
  await tf(['init', '-input=false', '-no-color', '-lockfile=readonly']); await tf(['fmt', '-check', '-recursive']); await tf(['validate', '-no-color'])
  const version = await tfJson('version', '-json')
  await record('initialized_validated', { terraform: version.terraform_version, provider: version.provider_selections, fmt: 'passed', validate: 'passed', lockfileReadonly: true })
  const initial = await plan('create'); assert.equal(initial.exitCode, 2); assert.equal(initial.counts.create, 6)
  const rawPlan = await tfJson('show', '-json', 'create.plan')
  const secretChange = rawPlan.resource_changes.find((r) => r.address.endsWith('kubernetes_secret_v1.example'))
  assert.equal(secretChange.change.after_sensitive.data, true)
  await record('create_planned', { ...initial, secretDataMarkedSensitive: true })
  await apply('create'); await kubectl('-n', namespace, 'rollout', 'status', 'deployment/catalogue', '--timeout=180s')
  const response = await messageIs(variables.message), state = await tfJson('show', '-json')
  const secret = flatten(state.values.root_module).find((r) => r.address.endsWith('kubernetes_secret_v1.example'))
  const stateContainsDummyValue = secret.values.data.credential === 'public-lab-fixture-not-a-real-secret'; assert.equal(stateContainsDummyValue, true)
  await record('applied_http_ready', { http: response, resourcesInState: flatten(state.values.root_module).length, stateContainsDummyValue, secretValueExported: false })
  const unchanged = await plan('no-change'); assert.equal(unchanged.exitCode, 0); await record('no_changes', unchanged)
  const oldPod = (await object('-n', namespace, 'get', 'pods', '-l', 'app=catalogue')).items[0]
  await kubectl('-n', namespace, 'delete', 'pod', oldPod.metadata.name, '--wait=true')
  const replacement = await waitFor('replacement-pod', async () => { const pods = await object('-n', namespace, 'get', 'pods', '-l', 'app=catalogue'); return pods.items.find((p) => p.metadata.uid !== oldPod.metadata.uid && p.status.conditions?.some((c) => c.type === 'Ready' && c.status === 'True')) })
  const afterPod = await plan('after-pod'); assert.equal(afterPod.exitCode, 0)
  await record('pod_reconciled_without_apply', { beforeUid: oldPod.metadata.uid, afterUid: replacement.metadata.uid, terraformPlan: afterPod, http: await messageIs(variables.message) })
  await kubectl('-n', namespace, 'patch', 'configmap', configName(), '--type=merge', '-p', JSON.stringify({ data: { message: 'manual-drift' } }))
  const manual = await messageIs('manual-drift'), drift = await plan('drift'); assert.equal(drift.exitCode, 2); assert.equal(drift.counts.update, 1)
  await record('drift_detected', { http: manual, plan: drift })
  await apply('drift'); await record('drift_repaired', { http: await messageIs(variables.message), plan: await plan('repaired') })
  variables.message = 'saved-plan-a'; const stale = await plan('stale'); assert.equal(stale.exitCode, 2)
  variables.message = 'new-state-b'; await plan('fresh'); await apply('fresh')
  const staleAttempt = await tf(['apply', '-input=false', '-no-color', 'stale.plan'], { accepts: [1] })
  assert.equal(staleAttempt.code, 1); assert.match(staleAttempt.stderr, /Saved plan is stale/)
  await record('stale_plan_rejected', { rejected: true, reason: 'Saved plan is stale', http: await messageIs('new-state-b') })
  variables.message = 'new-revision'; variables.config_revision = 'v2'
  const replacing = await plan('replace'); assert.equal(replacing.counts.replace, 1); assert.equal(replacing.counts.update, 1)
  assert.deepEqual(replacing.changes.find((c) => c.address.endsWith('kubernetes_config_map_v1.settings')).actions, ['create', 'delete'])
  await record('replacement_planned', replacing); await apply('replace')
  await kubectl('-n', namespace, 'rollout', 'status', 'deployment/catalogue', '--timeout=180s')
  await record('replacement_applied', { http: await messageIs(variables.message), oldConfigMapAbsent: (await kubectl('-n', namespace, 'get', 'configmap', 'catalogue-v1', '--ignore-not-found', '-o', 'name')).stdout.trim() === '' })
  await kubectl('-n', namespace, 'patch', 'configmap', configName(), '--type=merge', '-p', JSON.stringify({ data: { message: 'refresh-only-drift' } }))
  const refreshing = await plan('refresh-only', ['-refresh-only']); assert.equal(refreshing.exitCode, 2); assert.equal(refreshing.changes.length, 0)
  await apply('refresh-only')
  const afterRefresh = await plan('after-refresh'); assert.equal(afterRefresh.counts.update, 1)
  await record('refresh_only_does_not_repair', { refreshPlan: refreshing, normalPlan: afterRefresh, http: await messageIs('refresh-only-drift') })
  await apply('after-refresh'); await record('normal_apply_restores_config', { http: await messageIs(variables.message), plan: await plan('final-no-change') })
  await writeVars()
  await tf(['plan', '-destroy', '-input=false', '-no-color', '-out=destroy.plan'])
  const destroy = summarizePlan(await tfJson('show', '-json', 'destroy.plan')); assertPlanScope(destroy, { destroy: true }); assert.equal(destroy.counts.delete, 6)
  await apply('destroy')
  assert.equal((await kubectl('get', 'namespace', namespace, '--ignore-not-found', '-o', 'name')).stdout.trim(), '')
  const finalState = await tfJson('show', '-json'); assert.equal(flatten(finalState.values?.root_module).length, 0)
  await record('destroyed_owned_resources', { ...destroy, namespaceAbsent: true, resourcesInState: 0 })
} finally {
  if (ownsCluster) await docker(['rm', '-f', '-v', project])
  if (ownsNetwork) await docker(['network', 'rm', project])
}
assert.deepEqual(await hashes(), sources)
assert.equal((await docker(['ps', '-aq', '--filter', 'label=luisrc.lab=' + project])).stdout.trim(), '')
assert.equal((await docker(['network', 'ls', '-q', '--filter', 'label=luisrc.lab=' + project])).stdout.trim(), '')
await record('local_cluster_removed', { containerAbsent: true, networkAbsent: true, imageRetained: variables.image, privateArtifactsIgnored: true })
const report = { kind: 'local_terraform_kubernetes_observation', capturedAt: new Date().toISOString(), project, namespace, versions: tools, sources, events,
  limits: { productionCluster: false, remoteBackendLockingTested: false, haTested: false, autoscalingTested: false, cloudProvisioned: false, continuousAvailabilityProven: false } }
await mkdir('evidence', { recursive: true }); await writeFile('evidence/terraform.json', JSON.stringify(report, null, 2) + '\n')
const { sources: _sources, ...replay } = report; await writeFile('replay.json', JSON.stringify(replay, null, 2) + '\n')
await rm(resolve(work, 'kubeconfig')); await rm(resolve(work, 'api.tar'))
console.log(`${events.length} fases reales, namespace y clúster propios eliminados; estado/planes privados ignorados.`)
