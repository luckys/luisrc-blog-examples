import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { selectRuns, summarize, seriesPoints } from '../model.mjs'
const data=JSON.parse(await readFile(new URL('../comparison.json',import.meta.url)))
test('las comparaciones mantienen seed y explicitan sus intervenciones',()=>{
 for(const seed of [7,19,31]){
  const runs=selectRuns(data,'optimizers',seed)
  assert.equal(runs.length,4)
  assert.ok(runs.every(r=>r.seed===seed&&r.updates===640&&r.examplesSeen===20480))
  assert.equal(new Set(runs.map(r=>r.orderHash)).size,1)
 }
 assert.deepEqual(selectRuns(data,'batch',31).map(r=>r.id),['sgd-7','sgd-batch16','sgd-full'])
 assert.throws(()=>selectRuns(data,'missing',7))
})
test('los ejes conservan números observados y no inventan tasas en epoch cero',()=>{
 const run=data.runs[0]
 for(const axis of ['epoch','updates','examplesSeen']){
  const p=seriesPoints(run,axis,'validationLoss')
  assert.equal(p.length,81)
  assert.deepEqual(p[0],{x:0,y:run.history[0].validationLoss})
  assert.equal(p.at(-1).x,run.history.at(-1)[axis])
 }
 assert.equal(seriesPoints(run,'updates','lrLast').length,80)
 assert.throws(()=>seriesPoints(run,'seconds','trainLoss'))
})
test('el resumen selecciona el checkpoint, incluyendo cero y el último',()=>{
 for(const run of data.runs)for(const epoch of [0,4,80]){
  assert.deepEqual(summarize(run,epoch),{id:run.id,...run.history[epoch]})
 }
 assert.throws(()=>summarize(data.runs[0],81))
})
