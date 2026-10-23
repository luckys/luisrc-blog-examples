import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeHeap } from '../scripts/heap-reader.mjs'
import { groupWindows } from '../src/windows.ts'

test('lector de heap: clases y camino de retención usan metadatos del snapshot', () => {
  const result = analyzeHeap({
    snapshot: { meta: { node_fields: ['type', 'name', 'self_size', 'edge_count'],
      node_types: [['object'], [], [], []], edge_fields: ['type', 'name_or_index', 'to_node'],
      edge_types: [['property', 'element', 'weak'], [], []] } },
    nodes: [0, 0, 24, 1, 0, 1, 40, 1, 0, 2, 40, 0],
    edges: [0, 3, 4, 1, 0, 8], strings: ['LabCache', 'Array', 'RetainedEntry', 'items'],
  })
  assert.deepEqual(result, { entries: 1, shallowBytes: 40,
    pathFromCache: ['LabCache', 'items → Array', '[0] → RetainedEntry'] })
})

test('ventanas: origen observado, conteos y última ventana parcial explícita', () => {
  const rows = [0, 1000, 11000].map((ms) => ({ at: new Date(ms).toISOString(), ms: 40, status: 200 }))
  const groups = groupWindows(rows)
  assert.deepEqual(groups.map((g) => [g.fromSecond, g.complete, g.requests]), [[0, true, 2], [10, false, 1]])
  assert.deepEqual(groupWindows([]), [])
  assert.throws(() => groupWindows(rows, 0), RangeError)
  assert.throws(() => groupWindows([{ at: 'bad', ms: 1, status: 200 }]), RangeError)
})
