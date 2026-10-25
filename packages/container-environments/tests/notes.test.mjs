import test from 'node:test'
import assert from 'node:assert/strict'
import { parseNote, readNote } from '../src/notes.ts'

test('input: acepta solo id/text y rechaza valores ambiguos o grandes', () => {
  assert.deepEqual(parseNote({ id: 'note-1', text: 'Primera nota' }), { id: 'note-1', text: 'Primera nota' })
  for (const value of [null, [], {}, { id: '../etc', text: 'x' }, { id: 'ok', text: '' },
    { id: 'ok', text: 'x'.repeat(201) }, { id: 'ok', text: 'x', admin: true }])
    assert.throws(() => parseNote(value))
})

test('cache miss: lee PostgreSQL y repuebla la cache sin modificar la nota', async () => {
  const note = { id: 'one', text: 'Persistente' }; const writes = []
  const result = await readNote('one', {
    cached: async () => null, load: async () => note, cache: async (v) => { writes.push(v) },
  })
  assert.deepEqual(result, { note, source: 'postgres' }); assert.deepEqual(writes, [note])
})

test('cache caída: una lectura conserva la fuente SQL y no espera una cola offline', async () => {
  const note = { id: 'one', text: 'Persistente' }
  const result = await readNote('one', {
    cached: async () => { throw Error('offline') }, load: async () => note,
    cache: async () => { throw Error('offline') },
  })
  assert.deepEqual(result, { note, source: 'postgres' })
})

test('cache hit: comprueba identidad; una respuesta ajena no sustituye el dato', async () => {
  const note = { id: 'one', text: 'Persistente' }; let reads = 0
  const deps = { cached: async () => JSON.stringify(note), load: async () => { reads++; return note }, cache: async () => {} }
  assert.equal((await readNote('one', deps)).source, 'redis'); assert.equal(reads, 0)
  deps.cached = async () => JSON.stringify({ ...note, id: 'other' })
  assert.equal((await readNote('one', deps)).source, 'postgres'); assert.equal(reads, 1)
})

test('no encontrada no se inventa; un fallo SQL sin hit se propaga', async () => {
  assert.deepEqual(await readNote('missing', { cached: async () => null, load: async () => null, cache: async () => {} }), { note: null, source: 'postgres' })
  await assert.rejects(readNote('missing', { cached: async () => null, load: async () => { throw Error('SQL offline') }, cache: async () => {} }), /SQL offline/)
})
