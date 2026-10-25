import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {selectRun,checkpoint,batchGroups,residual,resumeSummary} from '../model.mjs'
const data=JSON.parse(await readFile(new URL('../comparison.json',import.meta.url)))
test('los checkpoints conservan seed, contadores y el grupo final',()=>{
 for(const seed of [7,19,31]){
  const run=selectRun(data,seed),row=checkpoint(run,60)
  assert.equal(run.seed,seed);assert.equal(row.updates,540);assert.equal(row.examplesSeen,15360)
  const groups=batchGroups(row,30)
  assert.deepEqual(groups.map(g=>g.size),[30,30,30,30,30,30,30,30,16])
  assert.deepEqual(groups.flatMap(g=>g.ids),row.order)
  assert.deepEqual(batchGroups(checkpoint(run,0),30),[])
 }
 assert.throws(()=>selectRun(data,42));assert.throws(()=>checkpoint(data.runs[0],61))
})
test('el selector de broadcasting conserva las dos operaciones observadas',()=>{
 const bad=residual(data,'bad'),good=residual(data,'good')
 assert.deepEqual(bad.shape,[4,4]);assert.deepEqual(good.shape,[4,1])
 assert.equal(bad.mse,2.625);assert.equal(good.mse,1.875)
 assert.deepEqual(bad.matrix,data.probes.tensors.badResidual)
 assert.throws(()=>residual(data,'other'))
})
test('la reanudación completa coincide y los controles cambian después de epoch30',()=>{
 for(const r of data.resumed){
  for(const epoch of [0,30])assert.equal(resumeSummary(data,r.variant,epoch).error,0)
  assert.equal(resumeSummary(data,r.variant,60).error,r.maxParameterError)
 }
 assert.equal(resumeSummary(data,'full',60).error,0)
 assert.ok(resumeSummary(data,'weights_only',60).error>.3)
})
