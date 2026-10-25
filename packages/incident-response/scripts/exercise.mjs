import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { withFixture, waitUntil } from './fixture.mjs'
import { sourceHashes } from './hashes.mjs'
import { actionHasEvidence } from '../src/review.ts'
import { saveCheckpoint } from '../src/journal.ts'

const root = new URL('../', import.meta.url)
const sources = await sourceHashes()
const events = []
const start = performance.now()
async function record(id, phase, kind, facts) {
  events.push({ seq: events.length + 1, id, phase, kind, at: new Date().toISOString(), elapsedMs: performance.now() - start, facts })
  await saveCheckpoint(new URL('.artifacts/checkpoint.json', root), events)
}
const result = await withFixture(async ({ origin, instanceId, pid, control }) => {
  const submit = async () => {
    const response = await fetch(origin + '/jobs', { method: 'POST' })
    assert.equal(response.status, 202)
    return response.json()
  }
  const baselineJobs = [await submit(), await submit()]
  const baseline = await waitUntil(origin, (s) => s.completed === 2)
  assert.notEqual(baseline.worker.pid, pid)
  await record('baseline', 'before', 'observed', baseline)
  const zero = await control('config', { batchSize: 0, expectedRevision: baseline.worker.config.revision })
  assert.equal(zero.ok, true)
  await record('zero_applied', 'fault', 'observed', zero)
  const stalledJobs = [await submit(), await submit(), await submit()]
  const queued = await waitUntil(origin, (s) => s.queued === 3)
  await record('queued', 'fault', 'observed', queued)
  const stalled = await waitUntil(origin, (s) => s.worker.ticks >= queued.worker.ticks + 3 && s.completed === 2)
  assert.equal(stalled.queued, 3); assert.equal(stalled.worker.attempts, 2)
  const live = await fetch(origin + '/live')
  assert.equal(live.status, 200)
  await record('stalled_alive', 'triage', 'observed', { ...stalled, liveStatus: live.status })
  assert.equal((await control('admission', { open: false })).ok, true)
  const rejected = await fetch(origin + '/jobs', { method: 'POST' })
  assert.equal(rejected.status, 503)
  await record('admission_paused', 'contain', 'observed', { status: rejected.status, state: await waitUntil(origin, () => true) })
  const wrongScope = await control('config', { batchSize: 1, expectedRevision: stalled.worker.config.revision }, instanceId + '-wrong')
  assert.equal(wrongScope.ok, false)
  await record('scope_rejected', 'contain', 'observed', wrongScope)
  const restored = await control('config', { batchSize: 2, expectedRevision: stalled.worker.config.revision })
  assert.equal(restored.ok, true)
  await record('config_restored', 'mitigate', 'observed', restored)
  const drained = await waitUntil(origin, (s) => s.completed === 5 && s.queued === 0)
  assert.equal(drained.admissionOpen, false)
  assert.deepEqual(drained.jobs.map((j) => j.id), [...baselineJobs, ...stalledJobs].map((j) => j.id))
  await record('drained', 'verify', 'observed', drained)
  const enabled = await control('config', { guarded: true, expectedRevision: drained.worker.config.revision })
  assert.equal(enabled.ok, true)
  await record('candidate_enabled', 'prevent', 'observed', enabled)
  const invalid = await control('config', { batchSize: 0, expectedRevision: enabled.worker.config.revision })
  assert.equal(invalid.ok, false)
  const unchanged = await waitUntil(origin, () => true)
  assert.deepEqual(unchanged.worker.config, enabled.worker.config)
  await record('guard_rejects_zero', 'prevent', 'observed', { rejected: invalid, state: unchanged })
  assert.equal((await control('admission', { open: true })).ok, true)
  const newJobs = [await submit(), await submit()]
  const final = await waitUntil(origin, (s) => s.completed === 7 && s.queued === 0)
  assert.equal(final.rejectedDuringPause, 1)
  for (const job of final.jobs) { assert.equal(job.result, `report:${job.id}`); assert.equal(job.attempts, 1) }
  assert.deepEqual(final.jobs.map((j) => j.id), [...baselineJobs, ...stalledJobs, ...newJobs].map((j) => j.id))
  await record('recovery_preserves_work', 'recover', 'observed', final)
  return { apiPid: pid, workerPid: final.worker.pid, final }
})
assert.deepEqual(await sourceHashes(), sources, 'source changed during exercise')
const proofs = { guard_rejects_zero: true, recovery_preserves_work: true }
const actions = JSON.parse(await readFile(new URL('docs/actions.json', root)))
assert.ok(actions.every((action) => actionHasEvidence(action, proofs)))
const evidence = { syntheticIncident: true, realHttpAndProcesses: true, measuredAt: new Date().toISOString(),
  node: process.version, sources, events, proofs, actions, ...result,
  limits: { durableQueue: false, humanOnCall: false, productionUsers: false, binaryDeployment: false,
    candidateActivation: 'guarded path already present in the fixture binary', retries: false, restartRecovery: false } }
await mkdir(new URL('evidence/', root), { recursive: true })
await writeFile(new URL('evidence/incident.json', root), JSON.stringify(evidence, null, 2) + '\n')
await writeFile(new URL('replay.json', root), JSON.stringify({ syntheticIncident: true, events, actions, limits: evidence.limits }, null, 2) + '\n')
const stages = ['baseline', 'stalled_alive', 'drained', 'recovery_preserves_work']
const bars = stages.map((id, i) => {
  const facts = events.find((e) => e.id === id).facts
  const y = 78 + i * 66
  return `<text x="16" y="${y}" fill="#e5e7eb">${['Baseline', 'Sin progreso', 'Drenado', 'Trabajo nuevo'][i]}</text><rect x="142" y="${y - 15}" width="${facts.completed * 20}" height="17" fill="#34d399"/><text x="${148 + facts.completed * 20}" y="${y}" fill="#e5e7eb">${facts.completed}</text><text x="142" y="${y + 21}" fill="#fbbf24">${facts.queued} pendientes</text>`
}).join('')
await writeFile(new URL('recovery.svg', root), `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380" role="img" aria-labelledby="title desc"><title id="title">Completados y pendientes observados</title><desc id="desc">El ejercicio observa dos completos y tres pendientes durante el fallo; cinco completos después de drenar y siete tras probar trabajo nuevo.</desc><rect width="380" height="380" fill="#111827"/><g font-family="sans-serif" font-size="14"><text x="16" y="28" fill="#f8fafc" font-size="17">Fixture real · incidente sintético</text><text x="16" y="50" fill="#cbd5e1" font-size="12">Verde: completados · ámbar: pendientes</text>${bars}<text x="16" y="355" fill="#cbd5e1">Recuentos, no tiempos de respuesta humanos</text></g></svg>\n`)
const timeline = events.map((e) => `| ${e.seq} | ${e.id} | ${e.at} | ${e.elapsedMs.toFixed(3)} |`).join('\n')
await writeFile(new URL('evidence/postmortem.md', root), `# Incidente sintético: batch size cero\n\nDatos ficticios, HTTP real y dos procesos locales. No usuarios de producción.\n\nImpacto observado: tres trabajos aceptados sin progreso durante la observación y\nuna petición rechazada por contención. Ver incident.json para hechos completos.\n\n## Cronología capturada\n\n| Orden | Evento | UTC | ms desde harness |\n| --- | --- | --- | --- |\n${timeline}\n\n## Mecanismo y condiciones\n\nLegacy acepta cero; slice(0,0) no selecciona trabajo. API live y ticks no prueban\nfinalización. Restaurar batch2 drenó la misma cola, sin borrar IDs. La ruta validada\nrechaza cero y conserva revisión. Su activación ocurre en el mismo binario, no deploy.\n\n## Seguimiento\n\nA01/A03 verificadas solo en fixture; A02 observación/alertas y A04 durabilidad abiertas.\nNo se ejecutaron guardias, paging, restart recovery o efectos externos.\n`)
console.log(JSON.stringify({ events: events.length, pids: [result.apiPid, result.workerPid],
  completed: result.final.completed, queued: result.final.queued, rejectedDuringPause: result.final.rejectedDuringPause, proofs }, null, 2))
