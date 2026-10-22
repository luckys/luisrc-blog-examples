import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/service.ts'
import { MemoryJobs } from '../src/memory.ts'

test('stub de ausencia y spy: no intenta escribir un trabajo inexistente', async () => {
  const writes = []
  const repository = {
    read: async () => null,
    compareAndSet: async (...args) => { writes.push(args); return true },
  }
  await assert.rejects(execute(repository, 'j-1', 'start', 0), /not_found/)
  assert.deepEqual(writes, [])
})

test('fallo del repositorio se propaga: no se inventa una confirmación', async () => {
  const repository = {
    read: async () => ({ id: 'j-1', state: 'queued', version: 0 }),
    compareAndSet: async () => { throw new Error('disk_unavailable') },
  }
  await assert.rejects(execute(repository, 'j-1', 'start', 0), /disk_unavailable/)
})

test('conflicto antes o durante CAS no devuelve éxito', async () => {
  const repository = {
    read: async () => ({ id: 'j-1', state: 'queued', version: 0 }),
    compareAndSet: async () => false,
  }
  await assert.rejects(execute(repository, 'j-1', 'start', 1), /version_conflict/)
  await assert.rejects(execute(repository, 'j-1', 'start', 0), /version_conflict/)
})

test('fake con estado: secuencia completa y duplicado sin nueva escritura', async () => {
  const repository = new MemoryJobs()
  await repository.insert('j-1')
  await execute(repository, 'j-1', 'start', 0)
  const result = await execute(repository, 'j-1', 'succeed', 1)
  assert.deepEqual(result, { id: 'j-1', state: 'succeeded', version: 2 })
  assert.deepEqual(await execute(repository, 'j-1', 'succeed', 2), result)
  await assert.rejects(execute(repository, 'j-1', 'fail', 2), /invalid_transition/)
  assert.deepEqual(await repository.read('j-1'), result)
})
