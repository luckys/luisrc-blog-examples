import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { infer, activation } from '../inference.mjs'
const data=JSON.parse(await readFile(new URL('../training.json',import.meta.url)))
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-12,`${a} != ${b}`)
test('inferencia JS coincide con NumPy en los ocho probes de cada checkpoint',()=>{
 for(const c of data.results.cases)for(const h of c.history)for(const [i,point]of data.protocol.probePoints.entries()){
  const p=infer(point,h.layers);near(p.probability,h.probeProbability[i])
  if(c.width)for(let j=0;j<c.width;j++)near(p.hidden[j],h.probeHidden[i][j])
 }
})
test('grid final completo y activaciones conservan las observaciones NumPy',()=>{
 for(const c of data.results.cases)for(const [i,point]of data.results.grid.points.entries()){
  const p=infer(point,c.history.at(-1).layers);near(p.probability,c.gridProbability[i])
  if(c.width)for(let j=0;j<c.width;j++)near(p.hidden[j],c.gridHidden[i][j])
 }
 for(const kind of ['tanh','sigmoid','relu'])for(const [i,x]of data.results.activation.x.entries())near(activation(kind,x),data.results.activation[kind][i])
})
test('rechaza shapes y valores inválidos; sigmoid sigue finita a magnitudes extremas',()=>{
 assert.throws(()=>infer([NaN,0],data.results.cases[0].history[0].layers))
 assert.throws(()=>infer([0],data.results.cases[0].history[0].layers))
 assert.throws(()=>activation('unknown',0));near(activation('sigmoid',-1000),0);near(activation('sigmoid',1000),1)
})
