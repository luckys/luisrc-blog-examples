import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
import{scalarTrace,scalarStep,comparisonVector}from'../model.mjs'
const data=JSON.parse(await readFile(new URL('../comparison.json',import.meta.url)))
test('grafo escalar JS coincide con manual y PyTorch en todos los casos archivados',()=>{
 for(const c of data.scalarCases){const a=scalarTrace(c.input.w,c.input.x);assert.deepEqual(a,c.manual);for(const[k,v]of Object.entries(c.torch))assert.equal(a[k],v)}
 assert.throws(()=>scalarTrace(Infinity,2))
})
test('paso inverso no conserva campos de una etapa posterior',()=>{
 const t=scalarTrace(2,3)
 assert.equal(scalarStep(t,6).dw,144)
 assert.deepEqual(scalarStep(t,0),{w:2,x:3})
 assert.equal(scalarStep(t,5).dq,48);assert.equal(scalarStep(t,5).dw,undefined)
 assert.throws(()=>scalarStep(t,7))
})
test('seleccionar un método conserva null de detach y no cambia los datos',()=>{
 for(const c of data.cases){
  assert.deepEqual(comparisonVector(c,'torch',0),c.torch)
  assert.deepEqual(comparisonVector(c,'finite',2),c.finite[2].vector)
  assert.equal(comparisonVector(c,'detach',0).filter(v=>v===null).length,12)
  for(const k of Object.keys(c.mutants))assert.deepEqual(comparisonVector(c,k,0),c.mutants[k].vector)
  assert.throws(()=>comparisonVector(c,'unknown',0))
 }
})
