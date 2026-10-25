import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
import{selectRun,checkpoint,snapshot,normalization,format}from'../model.mjs'
const data=JSON.parse(await readFile(new URL('../comparison.json',import.meta.url)))
test('seleccionar una parada no inventa checkpoints futuros',()=>{
 for(const seed of [7,19,31])for(const variant of Object.keys(data.protocol.variants)){
  const r=selectRun(data,seed,variant)
  assert.equal(checkpoint(r,r.history.length-1).epoch,r.last.epoch)
  assert.throws(()=>checkpoint(r,r.history.length))
 }
 assert.throws(()=>selectRun(data,99,'baseline'))
})
test('modelo último, mejor y elegido tienen su propio significado',()=>{
 for(const seed of [7,19,31]){
  const early=selectRun(data,seed,'early_stopping')
  assert.deepEqual(snapshot(early,'selected').prediction,snapshot(early,'best').prediction)
  assert.notEqual(snapshot(early,'last').epoch,snapshot(early,'selected').epoch)
  assert.deepEqual(snapshot(selectRun(data,seed,'baseline'),'selected'),selectRun(data,seed,'baseline').last)
 }
 assert.throws(()=>snapshot(data.runs[0],'future'))
})
test('normalización conserva las matrices observadas y sus ejes',()=>{
 const a=normalization(data,'layer','A'),b=normalization(data,'layer','B')
 assert.deepEqual(a.output[0],b.output[0]);assert.deepEqual(a.input[0],b.input[0])
 assert.notDeepEqual(normalization(data,'batch','A').output[0],normalization(data,'batch','B').output[0])
 assert.throws(()=>normalization(data,'other','A'))
 assert.equal(format(null),'No aplica')
})
