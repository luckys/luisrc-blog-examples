import { writeHeapSnapshot } from 'node:v8'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { LabCache } from '../src/cache.ts'
import { analyzeHeap } from './heap-reader.mjs'

const [variant, folder] = process.argv.slice(2)
assert.ok(['unbounded', 'bounded'].includes(variant))
assert.equal(typeof global.gc, 'function')
globalThis.labCache = new LabCache(variant === 'unbounded' ? Infinity : 100)
function fill(from, to) { for (let i = from; i < to; i++) globalThis.labCache.add(i) }
const samples = []
async function capture(stage, expected) {
  global.gc()
  const memory = process.memoryUsage()
  const file = `${folder}/${variant}-${stage}.heapsnapshot`
  writeHeapSnapshot(file)
  const raw = await readFile(file)
  const analysis = analyzeHeap(JSON.parse(raw.toString('utf8')))
  assert.equal(analysis.entries, expected)
  if (expected > 0) assert.ok(analysis.pathFromCache?.some((part) => part.includes('items')))
  samples.push({ stage, memory, ...analysis, snapshotSha256: createHash('sha256').update(raw).digest('hex') })
}
fill(0, 500)
await capture('500', variant === 'unbounded' ? 500 : 100)
fill(500, 1500)
await capture('1500', variant === 'unbounded' ? 1500 : 100)
globalThis.labCache = null
await capture('released', 0)
console.log(JSON.stringify({ variant, forcedGc: true, samples }))
