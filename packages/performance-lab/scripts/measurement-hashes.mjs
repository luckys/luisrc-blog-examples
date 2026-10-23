import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

export const loadSources = ['src/server.ts', 'src/workload.ts', 'src/statistics.ts',
  'scripts/child-fixture.mjs', 'scripts/server-child.mjs', 'scripts/measure-load.mjs',
  'scripts/measurement-hashes.mjs', 'k6/load.js']
export const profileSources = ['src/workload.ts', 'src/cache.ts', 'scripts/child-fixture.mjs',
  'scripts/benchmark-child.mjs', 'scripts/cpu-child.mjs', 'scripts/memory-child.mjs',
  'scripts/heap-reader.mjs', 'scripts/measure-profiles.mjs', 'scripts/measurement-hashes.mjs']
export async function fingerprint(files) {
  const entries = await Promise.all(files.map(async (file) => [file,
    createHash('sha256').update(await readFile(file)).digest('hex')]))
  return Object.fromEntries(entries)
}
