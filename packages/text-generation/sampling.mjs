import {softmax} from '../language-models/analysis.mjs';

export function temperatureProbabilities(logits, temperature) {
  if (!Number.isFinite(temperature) || temperature <= 0) throw Error('Temperatura positiva y finita');
  return softmax(logits.map(value => value / temperature));
}

export function topKDistribution(probabilities, k) {
  if (!Number.isInteger(k) || k < 1 || k > probabilities.length) throw Error('K fuera de rango');
  const ids = probabilities.map((p,id) => ({p,id}))
    .sort((a,b) => b.p-a.p || a.id-b.id).slice(0,k).map(row => row.id);
  const mass = ids.reduce((sum,id) => sum+probabilities[id],0);
  if (!(mass > 0)) throw Error('Masa vacía');
  return {kept:ids.toSorted((a,b)=>a-b), mass,
    probabilities:probabilities.map((p,id)=>ids.includes(id)?p/mass:0)};
}

export function topPDistribution(probabilities, p, candidateIds = probabilities.map((_,id)=>id)) {
  if (!Number.isFinite(p) || p <= 0 || p > 1) throw Error('P fuera de rango');
  const ranked = candidateIds.map(id=>({value:probabilities[id],id}))
    .sort((a,b)=>b.value-a.value || a.id-b.id);
  const ids=[];
  let mass=0;
  for (const row of ranked) {
    ids.push(row.id); mass+=row.value;
    if (mass>=p) break;
  }
  if (!(mass>0)) throw Error('Masa vacía');
  return {kept:ids.toSorted((a,b)=>a-b), mass,
    probabilities:probabilities.map((value,id)=>ids.includes(id)?value/mass:0)};
}

export function filtered(logits,strategy) {
  const base=softmax(logits);
  if(strategy.mode==='greedy') {
    const id=logits.map((z,id)=>({z,id})).sort((a,b)=>b.z-a.z||a.id-b.id)[0].id;
    return {base,temperature:base,kept:[id],retainedMass:base[id],selection:base.map((_,i)=>Number(i===id))};
  }
  if(strategy.mode!=='sample')throw Error('Modo desconocido');
  const temperature=temperatureProbabilities(logits,strategy.temperature);
  let stage={probabilities:temperature,kept:temperature.map((_,id)=>id)};
  if(strategy.topK!==null)stage=topKDistribution(stage.probabilities,strategy.topK);
  if(strategy.topP!==null)stage=topPDistribution(stage.probabilities,strategy.topP,stage.kept);
  return {base,temperature,kept:stage.kept,retainedMass:stage.kept.reduce((s,id)=>s+temperature[id],0),selection:stage.probabilities};
}

export function inverseCdf(probabilities,uniform) {
  if(!(uniform>=0&&uniform<1))throw Error('Sorteo fuera de [0,1)');
  let cumulative=0,last=-1;
  for(let id=0;id<probabilities.length;id++) {
    if(probabilities[id]>0)last=id;
    cumulative+=probabilities[id];
    if(uniform<cumulative)return id;
  }
  return last;
}

export class LCG {
  constructor(seed){this.state=seed>>>0;}
  next(){this.state=(Math.imul(1664525,this.state)+1013904223)>>>0;return this.state/2**32;}
}
