import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { MemoryJobs } from '../src/memory.ts'
import { SqliteJobs } from '../src/sqlite.ts'
import { repositoryContract } from './repository-contract.mjs'

repositoryContract('fake Map', async () => ({ repository: new MemoryJobs(), close() {} }))
repositoryContract('SQLite real en memoria', async () => {
  const repository = new SqliteJobs(':memory:')
  return { repository, close: () => repository.close() }
})

test('SQLite archivo: cerrar y reabrir conserva el cambio confirmado', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'editorial-testing-'))
  let second
  t.after(async () => {
    second?.close()
    await rm(directory, { recursive: true, force: true })
  })
  const path = join(directory, 'jobs.sqlite')
  const first = new SqliteJobs(path)
  try {
    await first.insert('j-1')
    await first.compareAndSet({ id: 'j-1', state: 'running', version: 1 }, 0)
  } finally { first.close() }
  second = new SqliteJobs(path)
  assert.deepEqual(await second.read('j-1'), { id: 'j-1', state: 'running', version: 1 })
})
