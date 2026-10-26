import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {terms,selectFeature,selectRun,checkpoint,scaleBounds,pixel} from '../model.mjs'
const data=JSON.parse(await readFile(new URL('../comparison.json',import.meta.url)))
test('la ventana reproduce cada celda, incluyendo padding y dilation',()=>{
 for(const c of data.probes.cases)for(let row=0;row<c.output.length;row++)for(let col=0;col<c.output[0].length;col++)
  assert.equal(terms(data.probes,c,row,col).reduce((s,t)=>s+t.product,0),c.output[row][col])
 assert.throws(()=>terms(data.probes,data.probes.cases[0],99,0))
})
test('los mapas conservan muestra, etapa, canal, coordenadas y escala',()=>{
 for(let sample=0;sample<4;sample++)for(const stage of Object.keys(data.features[sample].maps)){
  const maps=data.features[sample].maps[stage]
  for(let channel=0;channel<maps.length;channel++){
   const m=selectFeature(data,sample,stage,channel)
   assert.deepEqual(m,maps[channel]);assert.equal(pixel(m,0,0),maps[channel][0][0])
   for(const local of [false,true]){
    const [lo,hi]=scaleBounds(data,sample,stage,channel,local)
    assert.ok(lo<=Math.min(...m.flat())&&hi>=Math.max(...m.flat()))
   }
  }
 }
 assert.throws(()=>selectFeature(data,4,'pool',0));assert.throws(()=>selectFeature(data,0,'pool',4));assert.throws(()=>pixel([[1]],1,0))
})
test('el visor no confunde source y target ni inventa epochs',()=>{
 for(const seed of data.protocol.seeds)for(const mode of ['source',...data.protocol.targetModes]){
  const r=selectRun(data,seed,mode);assert.equal(checkpoint(r,40).epoch,40)
  assert.equal(r.trainableParameters,mode==='source'?372:mode.includes('frozen')?18:354)
  assert.throws(()=>checkpoint(r,41))
 }
 assert.throws(()=>selectRun(data,999,'source'))
})
