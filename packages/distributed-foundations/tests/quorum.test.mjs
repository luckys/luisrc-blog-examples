import test from 'node:test'
import assert from 'node:assert/strict'
import { subsets, overlaps, newest } from '../src/quorum.ts'

test('quorum: todos los conjuntos de tamaño dos en tres miembros se cruzan', () => {
  const groups = subsets(['A', 'B', 'C'], 2)
  assert.deepEqual(groups, [['A', 'B'], ['A', 'C'], ['B', 'C']])
  for (const write of groups)
    for (const read of groups) assert.equal(overlaps(write, read), true)
})

test('quorum: W=2 R=1 permite una lectura que no toca la escritura', () => {
  assert.equal(overlaps(['A', 'B'], ['C']), false)
  assert.deepEqual(newest([{ version: 0, value: 'pending' }]), { version: 0, value: 'pending' })
})

test('quorum: escoger la versión no equivale a escoger el valor más frecuente', () => {
  assert.deepEqual(newest([
    { version: 1, value: 'shipped' },
    { version: 0, value: 'pending' },
    { version: 0, value: 'pending' },
  ]), { version: 1, value: 'shipped' })
})

test('quorum: una versión contradictoria se rechaza, no se resuelve por orden de llegada', () => {
  assert.throws(() => newest([
    { version: 1, value: 'packed' }, { version: 1, value: 'shipped' },
  ]), /conflicting_version/)
})

test('quorum: miembros distintos y tamaños válidos son supuestos explícitos', () => {
  for (const args of [[['A', 'A'], 1], [['A'], 0], [['A'], 2], [[], 1]])
    assert.throws(() => subsets(...args))
  assert.throws(() => newest([]))
  assert.throws(() => newest([{ version: -1, value: 'x' }]))
})
