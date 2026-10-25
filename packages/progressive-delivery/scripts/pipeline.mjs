import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { imagePolicy } from '../src/gates.ts'

const run = promisify(execFile)
export async function runPipeline(prefix = `luisrc-delivery-${randomUUID().slice(0, 8)}`) {
  const stages = []; const started = performance.now()
  const step = async (name, fn) => {
    try { const result = await fn(); stages.push({ name, status: 'passed', elapsedMs: performance.now() - started }); return result }
    catch (error) { stages.push({ name, status: 'failed', elapsedMs: performance.now() - started }); await writeFile('.artifacts/pipeline-failed.json', JSON.stringify({ stages, error: String(error) }, null, 2)); throw error }
  }
  const command = async (exe, args, options = {}) => run(exe, args, { timeout: 180000, maxBuffer: 8e6, ...options })
  await mkdir('.artifacts', { recursive: true })
  await step('unit_and_router_tests', () => command('pnpm', ['run', 'test']))
  await step('typecheck', () => command('pnpm', ['run', 'typecheck']))
  await step('compile', () => command('pnpm', ['run', 'build']))
  let temp
  const audit = await step('runtime_dependency_audit', async () => {
    temp = await mkdtemp(join(tmpdir(), 'progressive-delivery-audit-'))
    const output = join(temp, 'artifact')
    await command('pnpm', ['--filter', '@luisrc-examples/progressive-delivery', 'deploy', '--prod', output])
    const report = await command('pnpm', ['audit', '--prod', '--audit-level', 'high', '--json'], { cwd: output })
    const data = JSON.parse(report.stdout)
    if (!data.metadata?.vulnerabilities || data.metadata.vulnerabilities.high !== 0 || data.metadata.vulnerabilities.critical !== 0) throw Error('audit_not_accepted')
    return data
  }).finally(async () => { if (temp) await rm(temp, { recursive: true, force: true }) })
  const artifacts = {}
  const base = (await readFile('Dockerfile', 'utf8')).match(/^ARG NODE_IMAGE=(.+)$/m)[1]
  for (const release of ['stable', 'candidate']) {
    const tag = `${prefix}:${release}`
    await step(`build_${release}`, async () => {
      const result = await command('docker', ['build', '--progress=plain', '-f', 'packages/progressive-delivery/Dockerfile',
        '--build-arg', `RELEASE=${release}`, '-t', tag, '.'], { cwd: resolve('../..') })
      await writeFile(`.artifacts/build-${release}.log`, result.stdout + result.stderr)
    })
    artifacts[release] = await step(`image_policy_${release}`, async () => {
      const output = await command('docker', ['image', 'inspect', tag])
      const image = JSON.parse(output.stdout)[0]
      if (!imagePolicy({ user: image.Config.User, base, ...audit.metadata.vulnerabilities })) throw Error('image_policy_rejected')
      return { tag, id: image.Id, user: image.Config.User, release, base }
    })
  }
  const result = { capturedAt: new Date().toISOString(), kind: 'local_pipeline_not_remote_ci', stages, audit, artifacts,
    promotion: 'not_granted_negative_fixture', limits: { osVulnerabilityScan: false, registryPush: false, signatureVerification: false, remoteCI: false } }
  await writeFile('.artifacts/pipeline.json', JSON.stringify(result, null, 2) + '\n')
  return result
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runPipeline()
  console.log(`${result.stages.length} gates locales pasan; dos artefactos para el fixture. No se ha autorizado promoción.`)
}
