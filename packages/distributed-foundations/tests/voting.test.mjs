import test from 'node:test'
import assert from 'node:assert/strict'
import { voter } from '../src/voting.ts'

const request = (candidate, term = 1, logTerm = 0, logIndex = 0) => ({ candidate, term, logTerm, logIndex })
function* permutations(items) {
  if (items.length === 0) { yield []; return }
  for (let i = 0; i < items.length; i++)
    for (const tail of permutations(items.filter((_, index) => index !== i)))
      yield [items[i], ...tail]
}

test('elección: un voto por term, repetición permitida solo al mismo candidato', () => {
  const node = voter()
  assert.equal(node.vote(request('X')), true)
  assert.equal(node.vote(request('X')), true)
  assert.equal(node.vote(request('Y')), false)
  assert.equal(node.vote(request('Y', 2)), true)
  assert.equal(node.vote(request('X', 1)), false)
})

test('elección: compara último term del log y después índice, no solo longitud', () => {
  const node = voter({ term: 3, votedFor: null, logTerm: 2, logIndex: 4 })
  assert.equal(node.vote(request('X', 4, 1, 100)), false)
  assert.equal(node.vote(request('X', 4, 2, 3)), false)
  assert.equal(node.vote(request('Y', 4, 2, 4)), true)
})

test('elección: restaurar term y voto impide votar dos veces tras reinicio simulado', () => {
  const node = voter()
  node.vote(request('X'))
  assert.equal(voter(node.snapshot()).vote(request('Y')), false)
  assert.equal(voter().vote(request('Y')), true)
})

test('elección: 720 órdenes de seis solicitudes no producen dos mayorías en un term', () => {
  const messages = ['A', 'B', 'C'].flatMap((id) => ['X', 'Y'].map((candidate) => ({ id, candidate })))
  let checked = 0
  for (const order of permutations(messages)) {
    const nodes = new Map(['A', 'B', 'C'].map((id) => [id, voter()]))
    const votes = new Map([['X', 0], ['Y', 0]])
    for (const { id, candidate } of order)
      if (nodes.get(id).vote(request(candidate))) votes.set(candidate, votes.get(candidate) + 1)
    assert.ok([...votes.values()].filter((count) => count >= 2).length <= 1)
    checked++
  }
  assert.equal(checked, 720)
})

test('elección: solicitud inválida no adelanta el term ni consume el voto', () => {
  const node = voter()
  assert.throws(() => node.vote(request('', 10)))
  assert.deepEqual(node.snapshot(), { term: 0, votedFor: null, logTerm: 0, logIndex: 0 })
})

test('elección: no restaura un voto imposible en el term inicial', () => {
  assert.throws(() => voter({ term: 0, votedFor: 'X', logTerm: 0, logIndex: 0 }), /invalid_vote/)
})

test('elección: un term superior se recuerda incluso si el log candidato está atrasado', () => {
  const node = voter({ term: 2, votedFor: 'X', logTerm: 2, logIndex: 4 })
  assert.equal(node.vote(request('Y', 3, 1, 100)), false)
  assert.deepEqual(node.snapshot(), { term: 3, votedFor: null, logTerm: 2, logIndex: 4 })
})
