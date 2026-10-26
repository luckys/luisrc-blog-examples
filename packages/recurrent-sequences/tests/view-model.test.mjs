import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
import{memoryRun,continuationRun,traceAt,checkpointAt,gateRow,comparisonRows,format}from'../model.mjs'
const data=JSON.parse(await readFile(new URL('../comparison.json',import.meta.url)))
test('selecciones de memoria conservan tarea, seed, longitud y checkpoint',()=>{
 for(const seed of data.protocol.seeds)for(const kind of data.protocol.memory.kinds){
  const r=memoryRun(data,seed,kind)
  assert.equal(checkpointAt(r,16).epoch,80)
  for(const length of [12,48]){
   const trace=traceAt(r,length);assert.equal(trace.hidden.length,length)
   for(let time=0;time<length;time++)for(let unit=0;unit<16;unit++){
    const row=gateRow(trace,time,unit);assert.equal(row.hidden,trace.hidden[time][unit])
    if(kind==='lstm')assert.equal(row.cell,trace.cells[time].cell[unit])
   }
  }
  assert.throws(()=>traceAt(r,96));assert.throws(()=>checkpointAt(r,17))
 }
 assert.throws(()=>memoryRun(data,999,'rnn'))
})
test('el control manual conserva sus puertas y rechaza índices inexistentes',()=>{
 for(const kind of ['rnn','lstm','gru']){
  const p=data.probes.cells[kind]
  const t={cells:p.steps,hidden:p.steps.map(s=>s.hidden)}
  for(let i=0;i<3;i++)assert.equal(gateRow(t,i,1).hidden,p.steps[i].hidden[1])
  assert.throws(()=>gateRow(t,3,0));assert.throws(()=>gateRow(t,0,2))
 }
})
test('comparar continuaciones no rellena predicciones ausentes como aciertos',()=>{
 for(const seed of data.protocol.seeds){const r=continuationRun(data,seed)
  assert.equal(checkpointAt(r,12).epoch,60)
  for(const e of r.examples){const rows=comparisonRows(e)
   assert.equal(rows.length,e.expected.length)
   rows.forEach((row,i)=>assert.equal(row.expected,e.expected[i]))
  }
 }
 const rows=comparisonRows({expected:[1,2,9],teacher:[1,2,9],generated:[9],perturbed:[]})
 assert.equal(rows[1].generated,null);assert.equal(rows[0].perturbed,null)
 assert.equal(format(null),'Ausente');assert.equal(format(0),'0')
 assert.match(format(1e-29),/E-29/);assert.match(format(3e7),/E7/)
})
