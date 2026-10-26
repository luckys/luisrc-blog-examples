import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
import{attentionAt,rowAt,contributionsAt,modelAt,positionAt,format,stages}from'../model.mjs'
const data=JSON.parse(await readFile(new URL('../comparison.json',import.meta.url)))
test('cada etapa conserva sus ejes de batch, head, query y key',()=>{
 for(const seed of data.protocol.seeds)for(const stage of stages){
  const c=attentionAt(data,seed,stage)
  for(let b=0;b<2;b++)for(let h=0;h<2;h++)for(let q=0;q<c.trace.weights[b][h].length;q++){
   const row=rowAt(c,b,h,q)
   assert.equal(row.length,c.trace.key[b][h].length)
   row.forEach((r,k)=>assert.equal(r.weight,c.trace.weights[b][h][q][k]))
   for(let dim=0;dim<4;dim++){
    const sum=contributionsAt(c,b,h,q,dim).reduce((s,v)=>s+v.product,0)
    assert.ok(Math.abs(sum-c.trace.attended[b][h][q][dim])<1e-12)
   }
  }
 }
 assert.throws(()=>attentionAt(data,999,'self_full'));assert.throws(()=>rowAt(attentionAt(data,7,'cross'),0,0,99))
})
test('filas excluidas no se confunden con pesos pequeños permitidos',()=>{
 const c=attentionAt(data,7,'self_causal')
 assert.equal(rowAt(c,0,0,0)[1].allowed,false)
 assert.equal(rowAt(c,0,0,0)[1].weight,0)
 assert.equal(rowAt(c,0,0,0)[0].allowed,true)
 assert.equal(rowAt(c,0,0,0)[0].weight,1)
})
test('posiciones y pruebas causales se seleccionan sin inventar observaciones',()=>{
 assert.deepEqual(positionAt(data,0),[0,1,0,1,0,1,0,1]);assert.throws(()=>positionAt(data,16))
 for(const seed of data.protocol.seeds){assert.equal(modelAt(data,seed).prefixError,0);assert.ok(modelAt(data,seed).unmaskedPrefixChange>0)}
 assert.equal(format(0),'0');assert.equal(format(null),'No aplica');assert.match(format(1e-16),/E-16/)
})
