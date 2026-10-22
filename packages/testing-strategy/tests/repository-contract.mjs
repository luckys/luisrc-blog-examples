import test from 'node:test'
import assert from 'node:assert/strict'

export function repositoryContract(name, fixture) {
  test(`${name}: ausencia, alta única y objetos aislados`, async (t) => {
    const { repository, close } = await fixture()
    t.after(close)
    assert.equal(await repository.read('j-1'), null)
    assert.deepEqual(await repository.insert('j-1'), { id: 'j-1', state: 'queued', version: 0 })
    await assert.rejects(repository.insert('j-1'), /duplicate/)
    const job = await repository.read('j-1')
    assert.throws(() => { job.version = 999 }, TypeError)
    assert.equal((await repository.read('j-1')).version, 0)
  })

  test(`${name}: compare-and-set elige un solo cambio de la versión cero`, async (t) => {
    const { repository, close } = await fixture()
    t.after(close)
    await repository.insert('j-1')
    const results = await Promise.all([
      repository.compareAndSet({ id: 'j-1', state: 'running', version: 1 }, 0),
      repository.compareAndSet({ id: 'j-1', state: 'cancelled', version: 1 }, 0),
    ])
    assert.deepEqual(results.toSorted(), [false, true])
    const winner = await repository.read('j-1')
    assert.equal(winner.version, 1)
    assert.ok(['running', 'cancelled'].includes(winner.state))
    assert.equal(await repository.compareAndSet({ id: 'j-2', state: 'running', version: 1 }, 0), false)
  })

  test(`${name}: rechaza un salto de versión sin cambiar el registro`, async (t) => {
    const { repository, close } = await fixture()
    t.after(close)
    await repository.insert('j-1')
    await assert.rejects(repository.compareAndSet({ id: 'j-1', state: 'running', version: 2 }, 0), /invalid_version/)
    assert.equal((await repository.read('j-1')).version, 0)
  })
}
