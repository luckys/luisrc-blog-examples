import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, mkdtemp, cp, rm } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { hashes } from './hashes.mjs'

const run = promisify(execFile)
const project = `luisrc-containers-${randomUUID().slice(0, 8)}`
const image = `${project}:runtime`; const buildImage = `${project}:build`
const env = { ...process.env, LAB_IMAGE: image }
const docker = async (...args) => (await run('docker', args, { env, timeout: 180000, maxBuffer: 8e6 })).stdout.trim()
const compose = (...args) => docker('compose', '-p', project, ...args)
const json = async (...args) => JSON.parse(await docker(...args))
const events = []; const started = performance.now(); const sources = await hashes()
await mkdir('.artifacts', { recursive: true }); await mkdir('evidence', { recursive: true })
const record = async (id, facts) => {
  events.push({ seq: events.length + 1, id, kind: 'observed', at: new Date().toISOString(), elapsedMs: performance.now() - started, facts })
  await writeFile('.artifacts/checkpoint.json', JSON.stringify({ partial: true, project, sources, events }, null, 2) + '\n')
  console.log(id)
}
const apiId = () => compose('ps', '-q', 'api')
const endpoint = async () => `http://${await compose('port', 'api', '3000')}`
const request = async (path, options) => {
  const response = await fetch((await endpoint()) + path, { ...options, signal: AbortSignal.timeout(4000) })
  return { status: response.status, body: await response.json() }
}
const waitFor = async (fn) => {
  for (let n = 0; n < 100; n++) { const value = await fn(); if (value) return value; await delay(100) }
  throw Error('condition_timeout')
}
const count = async () => Number(await compose('exec', '-T', 'postgres', 'psql', '-U', 'lab', '-d', 'notes_lab', '-Atc', 'SELECT count(*) FROM notes'))
const note = { id: 'first-note', text: 'Una nota ficticia que debe sobrevivir a recreaciones.' }
const createNote = () => request('/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(note) })
const down = (...args) => compose('down', '--timeout', '6', ...args)
let temp; let ownsProject = false
try {
  for (const type of ['container', 'volume', 'network'])
    assert.equal(await docker(type, 'ls', '-q', '--filter', `label=com.docker.compose.project=${project}`), '')
  ownsProject = true
  const buildResult = await run('docker', ['compose', '-p', project, '--progress', 'plain', 'build'], { env, timeout: 180000, maxBuffer: 8e6 })
  await writeFile('.artifacts/build.log', buildResult.stdout + buildResult.stderr)
  const firstImage = (await json('image', 'inspect', image))[0]
  // Contexto temporal con la misma allowlist: el experimento no modifica el checkout.
  temp = await mkdtemp(join(tmpdir(), 'container-build-cache-'))
  const included = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'packages/container-environments/package.json',
    'packages/container-environments/tsconfig.json', 'packages/container-environments/Dockerfile',
    'packages/container-environments/Dockerfile.dockerignore', 'packages/container-environments/src']
  for (const file of included) { await mkdir(dirname(join(temp, file)), { recursive: true }); await cp(resolve('../..', file), join(temp, file), { recursive: true }) }
  const changed = join(temp, 'packages/container-environments/src/notes.ts')
  await writeFile(changed, '// Solo cambia el source del experimento de cache.\n' + await readFile(changed, 'utf8'))
  const cacheResult = await run('docker', ['build', '--progress=plain', '--target', 'build', '-t', buildImage,
    '-f', join(temp, 'packages/container-environments/Dockerfile'), temp], { env, timeout: 180000, maxBuffer: 8e6 })
  const cacheLog = cacheResult.stdout + cacheResult.stderr
  await writeFile('.artifacts/cache-source-change.log', cacheLog)
  const installStep = cacheLog.match(/(#\d+) \[build \d+\/\d+\] RUN pnpm install[^\n]*/)
  assert.ok(installStep, 'install step visible'); assert.ok(cacheLog.includes(`${installStep[1]} CACHED`))
  const builder = (await json('image', 'inspect', buildImage))[0]
  await record('built', { runtimeImage: firstImage.Id, runtimeBytes: firstImage.Size, buildBytes: builder.Size,
    sourceChangeInstallCached: true, contextExperiment: 'temporary_copy_with_comment_change', runtimeUser: firstImage.Config.User })
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-build')
  assert.equal(await count(), 0)
  const state = (await json('inspect', await apiId()))[0]
  const security = JSON.parse(await compose('exec', '-T', 'api', 'node', '-e', `const fs=require('node:fs');let write;try{fs.writeFileSync('/app/probe','x');write='allowed'}catch(e){write=e.code}let compiler;try{require.resolve('typescript');compiler=true}catch{compiler=false}console.log(JSON.stringify({uid:process.getuid(),write,compiler}))`))
  assert.equal(security.uid, 1000); assert.ok(['EROFS', 'EACCES'].includes(security.write)); assert.equal(security.compiler, false)
  assert.equal(state.HostConfig.ReadonlyRootfs, true); assert.deepEqual(state.HostConfig.CapDrop, ['ALL'])
  const topology = {}
  for (const service of ['api', 'postgres', 'redis']) {
    const item = (await json('inspect', await compose('ps', '-q', service)))[0]
    topology[service] = { id: item.Id, image: item.Image, ports: item.HostConfig.PortBindings,
      networks: Object.keys(item.NetworkSettings.Networks), mounts: item.Mounts.map(({ Type, Name, Destination, RW }) => ({ Type, ...(Name ? { Name } : {}), Destination, RW })) }
  }
  assert.deepEqual(topology.postgres.ports, {}); assert.deepEqual(topology.redis.ports, {})
  assert.equal(topology.api.ports['3000/tcp'][0].HostIp, '127.0.0.1')
  const internal = (await json('network', 'inspect', `${project}_backend`))[0].Internal
  assert.equal(internal, true)
  assert.equal((await request('/ready')).status, 200)
  await record('fresh_setup', { rows: 0, topology, backendInternal: internal, security,
    readonlyRootfs: state.HostConfig.ReadonlyRootfs, capDrop: state.HostConfig.CapDrop,
    securityOpt: state.HostConfig.SecurityOpt, memoryBytes: state.HostConfig.Memory, nanoCpus: state.HostConfig.NanoCpus,
    postgresVersion: await compose('exec', '-T', 'postgres', 'postgres', '--version'),
    redisVersion: await compose('exec', '-T', 'redis', 'redis-server', '--version'),
    nodeVersion: await compose('exec', '-T', 'api', 'node', '--version') })
  assert.equal((await createNote()).status, 201)
  const first = await request('/notes/first-note'); const second = await request('/notes/first-note')
  assert.equal(first.body.source, 'postgres'); assert.equal(second.body.source, 'redis'); assert.deepEqual(second.body.note, note)
  const duplicate = await createNote(); assert.equal(duplicate.status, 409)
  await record('persisted_and_cached', { first, second, duplicate, rows: await count() })
  const before = await apiId()
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-deps', '--force-recreate', '--no-build', 'api')
  const after = await apiId(); assert.notEqual(after, before)
  assert.equal((await json('inspect', after))[0].Image, firstImage.Id)
  assert.deepEqual((await request('/notes/first-note')).body.note, note)
  await record('api_recreated', { before, after, image: firstImage.Id, rows: await count() })
  await compose('stop', 'redis')
  const fallback = await waitFor(async () => { const r = await request('/notes/first-note'); return r.status === 200 && r.body.source === 'postgres' ? r : null })
  const readyWithoutRedis = await request('/ready'); assert.equal(readyWithoutRedis.status, 200)
  assert.equal(readyWithoutRedis.body.cacheConnected, false)
  await record('redis_unavailable', { fallback, ready: readyWithoutRedis })
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--force-recreate', 'redis')
  await waitFor(async () => (await request('/ready')).body.cacheConnected)
  await compose('stop', 'postgres')
  const live = await request('/live'); const ready = await request('/ready'); const missing = await request('/notes/not-in-cache')
  assert.equal(live.status, 200); assert.equal(ready.status, 503); assert.equal(missing.status, 503)
  await record('postgres_unavailable', { live, ready, missing })
  await compose('up', '-d', '--wait', '--wait-timeout', '90', 'postgres')
  await waitFor(async () => (await request('/ready')).status === 200)
  assert.deepEqual((await request('/notes/first-note')).body.note, note)
  await record('postgres_recovered', { rows: await count(), ready: await request('/ready') })
  await down()
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-build')
  const surviving = await request('/notes/first-note')
  assert.equal(await count(), 1); assert.deepEqual(surviving.body.note, note); assert.equal(surviving.body.source, 'postgres')
  await record('volume_reused', { rows: 1, surviving })
  await down('--volumes')
  assert.equal(await docker('volume', 'ls', '-q', '--filter', `label=com.docker.compose.project=${project}`), '')
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--no-build')
  const gone = await request('/notes/first-note'); assert.equal(gone.status, 404); assert.equal(await count(), 0)
  assert.equal((await createNote()).status, 201)
  const recreated = await request('/notes/first-note'); assert.equal(recreated.body.source, 'postgres')
  await record('second_fresh_setup', { initialRows: 0, gone, recreated, finalRows: await count() })
  assert.deepEqual(await hashes(), sources)
} finally {
  if (ownsProject) await down('--volumes')
  if (temp) await rm(temp, { recursive: true, force: true })
}
const remaining = {}
for (const type of ['container', 'volume', 'network']) {
  remaining[type] = await docker(type, 'ls', '-q', '--filter', `label=com.docker.compose.project=${project}`)
  assert.equal(remaining[type], '')
}
await record('cleanup', { remaining, imagesRetained: [image, buildImage] })
const evidence = { capturedAt: new Date().toISOString(), kind: 'local_docker_observation', project, sources,
  engine: await docker('version', '--format', '{{.Server.Version}}'), compose: await docker('compose', 'version', '--short'),
  platform: 'linux/amd64', events, limits: { production: false, backupRestore: false, vulnerabilityScan: false,
    bitReproducibleImage: false, isolatedBenchmark: false, registryPush: false } }
await writeFile('evidence/compose.json', JSON.stringify(evidence, null, 2) + '\n')
await writeFile('replay.json', JSON.stringify({ capturedAt: evidence.capturedAt, kind: evidence.kind, events, limits: evidence.limits }, null, 2) + '\n')
console.log('Captura final y replay guardados; solo se conservaron las dos imágenes del laboratorio.')
