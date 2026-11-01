import {tokensOf,toBio,fromBio} from './spans.mjs';
export const LABELS=['O','B-PER','I-PER','B-ORG','I-ORG'];
export function featuresAt(tokens,i){
 const word=tokens[i].text,lower=word.toLocaleLowerCase('es');
 return ['bias','w='+lower,'prev='+(tokens[i-1]?.text.toLocaleLowerCase('es')??'<START>'),'next='+(tokens[i+1]?.text.toLocaleLowerCase('es')??'<END>'),
 'upper='+(/^\p{Lu}/u.test(word)),'allcaps='+(/^\p{Lu}+$/u.test(word)),'number='+(/^\p{N}+$/u.test(word)),'first='+(i===0),
 ...[1,2,3].flatMap(n=>['suffix'+n+'='+Array.from(lower).slice(-n).join(''),'prefix'+n+'='+Array.from(lower).slice(0,n).join('')])];
}
function scores(weights,ids){return LABELS.map((_,k)=>ids.reduce((sum,id)=>sum+weights[id][k],0));}
function probabilities(logits){const max=Math.max(...logits),e=logits.map(x=>Math.exp(x-max)),sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);}
function randomFor(seed){let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/2**32;};}
export function fit(corpus,{seed,epochs,learningRate}){
 const train=corpus.filter(r=>r.split==='train');if(!train.length)throw Error('No train');
 const features=Array.from(new Set(train.flatMap(r=>{const t=tokensOf(r.text);return t.flatMap((_,i)=>featuresAt(t,i));}))).sort();
 const vocabulary=new Map(features.map((f,i)=>[f,i])),random=randomFor(seed);
 const weights=features.map(()=>LABELS.map(()=>(random()-.5)*.02));
 const examples=train.flatMap(r=>{const tokens=tokensOf(r.text),labels=toBio(r);return tokens.map((_,i)=>({ids:featuresAt(tokens,i).map(f=>vocabulary.get(f)),target:LABELS.indexOf(labels[i])}));});
 const loss=[];
 for(let epoch=0;epoch<=epochs;epoch++){
  const gradient=features.map(()=>LABELS.map(()=>0));let total=0;
  for(const {ids,target} of examples){const p=probabilities(scores(weights,ids));total-=Math.log(p[target]);
   if(epoch<epochs)for(const id of ids)for(let k=0;k<LABELS.length;k++)gradient[id][k]+=p[k]-(k===target?1:0);
  }
  loss.push(total/examples.length);
  if(epoch<epochs)for(let id=0;id<features.length;id++)for(let k=0;k<LABELS.length;k++)weights[id][k]-=learningRate*gradient[id][k]/examples.length;
 }
 return {kind:'linear softmax BIO, full-batch gradient descent',seed,epochs,learningRate,features,weights,loss,trainTokens:examples.length};
}
const allowed=(previous,current)=>!current.startsWith('I-')||previous===('B-'+current.slice(2))||previous===current;
export function decode(logits){
 if(!logits.length)return [];
 // Viterbi with fixed 0/-Infinity transition costs, not a trained CRF.
 let previous=LABELS.map((tag,k)=>tag.startsWith('I-')?-Infinity:logits[0][k]);const back=[];
 for(let i=1;i<logits.length;i++){
  const pointers=[];
  const next=LABELS.map((tag,k)=>{let best=-Infinity,index=0;
   for(let p=0;p<LABELS.length;p++){const value=allowed(LABELS[p],tag)?previous[p]+logits[i][k]:-Infinity;if(value>best){best=value;index=p;}}
   pointers[k]=index;return best;
  });back.push(pointers);previous=next;
 }
 let best=0;for(let k=1;k<LABELS.length;k++)if(previous[k]>previous[best])best=k;
 const path=[best];for(let i=back.length-1;i>=0;i--)path.unshift(best=back[i][best]);return path.map(k=>LABELS[k]);
}
export function predict(model,text){
 const tokens=tokensOf(text),vocabulary=new Map(model.features.map((f,i)=>[f,i]));
 const logits=tokens.map((_,i)=>scores(model.weights,featuresAt(tokens,i).map(f=>vocabulary.get(f)).filter(id=>id!==undefined)));
 const labels=decode(logits);return {labels,spans:fromBio(tokens,labels),logits};
}
export function rulesFrom(corpus){
 const rules=new Map();for(const r of corpus.filter(r=>r.split==='train'))for(const s of r.spans){const words=tokensOf(s.text).map(t=>t.text);const key=JSON.stringify(words);if(rules.has(key)&&rules.get(key).label!==s.label)throw Error('Conflicting gazetteer label');rules.set(key,{words,label:s.label});}
 return Array.from(rules.values()).sort((a,b)=>b.words.length-a.words.length||JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
}
export function matchRules(rules,text){
 const tokens=tokensOf(text),spans=[];
 for(let i=0;i<tokens.length;){const rule=rules.find(r=>r.words.every((w,j)=>tokens[i+j]?.text===w));
  if(rule){spans.push({start:tokens[i].start,end:tokens[i+rule.words.length-1].end,label:rule.label});i+=rule.words.length;}else i++;
 }return spans;
}
export function metrics(gold,predictions){
 if(new Set(gold.map(r=>r.id)).size!==gold.length||new Set(predictions.map(r=>r.id)).size!==predictions.length||gold.length!==predictions.length)throw Error('ID mismatch');
 const index=new Map(predictions.map(r=>[r.id,r]));let tp=0,fp=0,fn=0;
 const errors=[],key=s=>JSON.stringify([s.start,s.end,s.label]);
 for(const row of gold){const prediction=index.get(row.id);if(!prediction)throw Error('Missing prediction');
  const expected=new Set(row.spans.map(key)),actual=new Set(prediction.spans.map(key));
  for(const s of actual){if(expected.has(s))tp++;else{fp++;errors.push({id:row.id,kind:'false_positive',span:JSON.parse(s)});}}
  for(const s of expected)if(!actual.has(s)){fn++;errors.push({id:row.id,kind:'false_negative',span:JSON.parse(s)});}
 }
 return {tp,fp,fn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,f1:2*tp+fp+fn?2*tp/(2*tp+fp+fn):null,errors};
}
