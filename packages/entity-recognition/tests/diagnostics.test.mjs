import test from 'node:test';import assert from 'node:assert/strict';
import {alignFirstSubwords,reviewErrors} from '../diagnostics.mjs';
import {fit,featuresAt,LABELS} from '../model.mjs';import {tokensOf,toBio} from '../spans.mjs';
test('first-subword alignment masks specials and continuations without changing original word tags',()=>{
 assert.deepEqual(alignFirstSubwords([null,0,0,1,2,2,null],[1,2,0]),[-100,1,-100,2,0,-100,-100]);
 assert.throws(()=>alignFirstSubwords([null,3],[1]));
 assert.throws(()=>alignFirstSubwords([0,1,0],[1,2]));
 assert.deepEqual(alignFirstSubwords([null,0,null],[1,2]),[-100,1,-100]); // truncation does not label absent words
});
test('error review distinguishes exact, boundary, type, omissions and spurious mentions',()=>{
 const g=[{start:0,end:9,label:'PER'},{start:20,end:24,label:'ORG'},{start:30,end:35,label:'PER'}];
 const p=[{start:0,end:3,label:'PER'},{start:20,end:24,label:'PER'},{start:40,end:44,label:'ORG'}];
 assert.deepEqual(reviewErrors(g,p).map(x=>x.kind),['type','boundary','omission','spurious']);
 assert.deepEqual(reviewErrors(g,g),[]);
 assert.equal(reviewErrors([{start:0,end:4,label:'PER'}],[{start:1,end:4,label:'ORG'}])[0].kind,'boundary_and_type');
});
test('diagnostic overlap pairing is one-to-one and does not turn partial matches into TP',()=>{
 const r=reviewErrors([{start:0,end:10,label:'PER'}],[{start:0,end:3,label:'PER'},{start:4,end:10,label:'PER'}]);
 assert.equal(r.filter(x=>x.kind==='boundary').length,1);assert.equal(r.filter(x=>x.kind==='spurious').length,1);
});
test('one gradient-descent update agrees with independent finite differences',()=>{
 const corpus=[{split:'train',text:'Ana vino',spans:[{start:0,end:3,label:'PER',text:'Ana'}]}],options={seed:7,learningRate:.05};
 const before=fit(corpus,{...options,epochs:0}),after=fit(corpus,{...options,epochs:1});
 const t=tokensOf(corpus[0].text),tags=toBio(corpus[0]),v=new Map(before.features.map((f,i)=>[f,i]));
 function loss(w){return t.reduce((sum,_,i)=>{const ids=featuresAt(t,i).map(f=>v.get(f)),z=LABELS.map((_,k)=>ids.reduce((s,id)=>s+w[id][k],0)),max=Math.max(...z);return sum+max+Math.log(z.reduce((s,x)=>s+Math.exp(x-max),0))-z[LABELS.indexOf(tags[i])];},0)/t.length;}
 const h=1e-5;
 for(const id of [v.get('bias'),v.get('w=ana')])for(let k=0;k<5;k++){
  const plus=structuredClone(before.weights),minus=structuredClone(before.weights);plus[id][k]+=h;minus[id][k]-=h;
  const numerical=(loss(plus)-loss(minus))/(2*h),actual=(before.weights[id][k]-after.weights[id][k])/.05;
  assert.ok(Math.abs(numerical-actual)<1e-8);
 }
});
