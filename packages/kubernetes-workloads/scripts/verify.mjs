import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hashes } from './hashes.mjs'
const report = JSON.parse(await readFile('evidence/kubernetes.json'))
assert.equal(report.kind, 'local_kubernetes_workload_observation'); assert.deepEqual(report.sources, await hashes())
assert.equal(report.events.length, 23)
for (const [i, e] of report.events.entries()) { assert.equal(e.seq, i + 1); assert.equal(e.kind, 'observed'); if (i) assert.ok(e.elapsedMs >= report.events[i - 1].elapsedMs) }
const event = (id) => report.events.find((e) => e.id === id).facts
const pod = event('pod_replaced'); assert.notEqual(pod.before.uid, pod.after.uid); assert.equal(pod.before.imageId, pod.after.imageId)
assert.equal(event('rollout_v2').http.body.version, 'v2'); assert.equal(event('rollout_undo_v1').http.body.version, 'v1')
assert.equal(event('service_dns').dns.status, 200); assert.equal(event('service_dns').dns.address, event('service_dns').clusterIp)
assert.equal(event('ingress_rules').unmatched.status, 404)
assert.equal(event('startup_protected').during.status, 503); assert.equal(event('startup_protected').after.restarts, 0)
assert.ok(event('startup_missing_probe').pod.restarts > 0)
const readiness = event('readiness_removed_endpoint'); assert.equal(readiness.http.status, 503); assert.ok(readiness.endpoints.every((e) => e.ready === false)); assert.equal(readiness.pod.uid, readiness.before.uid); assert.equal(readiness.pod.restarts, readiness.before.restarts)
const live = event('liveness_restarted'); assert.equal(live.before.uid, live.after.uid); assert.ok(live.after.restarts > live.before.restarts)
assert.equal(event('config_volume_changed_env_stale').http.body.envMessage, 'env-v1'); assert.equal(event('config_volume_changed_env_stale').http.body.message, 'volume-v2')
assert.equal(event('config_env_refreshed').http.body.envMessage, 'env-v2')
assert.equal(event('rbac_and_secret').secretGetForbidden, true); assert.equal(event('rbac_and_secret').appTokenAutomount, false)
assert.equal(event('unschedulable_request').scheduled, false); assert.equal(event('memory_oom').termination.reason, 'OOMKilled')
assert.ok(event('hpa_scaled_up').sample.ready >= 2); assert.ok(event('hpa_scaled_up').sample.cpuPercent > 50)
assert.equal(event('hpa_scaled_down').sample.desired, 1); assert.equal(event('hpa_scaled_down').sample.ready, 1)
assert.ok(report.samples.some((s) => s.phase === 'load' && s.desired >= 2))
assert.ok(report.samples.some((s) => s.phase === 'recovery' && s.desired === 1))
assert.equal(event('namespace_removed').namespaceAbsent, true); assert.equal(event('cluster_removed').containerAbsent, true); assert.equal(event('cluster_removed').networkAbsent, true)
assert.ok(Object.values(report.limits).every((v) => v === false))
const { sources, ...replay } = report; assert.deepEqual(JSON.parse(await readFile('replay.json')), replay)
assert.ok(!JSON.stringify(report).includes('public-fixture-not-a-real-credential'))
console.log('23 fases, probes, rutas, RBAC, OOM y HPA verificados offline; no inicia Docker.')
