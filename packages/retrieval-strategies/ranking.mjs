export function descending(a,b){return b.score-a.score||(a.id<b.id?-1:a.id>b.id?1:0);}
export function cosine(a,b){
 if(!a.length||a.length!==b.length||![...a,...b].every(Number.isFinite))throw Error('Vectores incompatibles');
 const denominator=Math.hypot(...a)*Math.hypot(...b);if(!denominator)throw Error('Norma nula');
 return a.reduce((sum,value,i)=>sum+value*b[i],0)/denominator;
}
export function denseRanking(query,documents){
 const ids=new Set();return documents.map(document=>{
  if(!document.id||ids.has(document.id))throw Error('ID de chunk inválido');ids.add(document.id);
  return {id:document.id,score:cosine(query,document.vector)};
 }).sort(descending);
}
export function reciprocalRankFusion(rankings,{constant=60,window=10}={}){
 if(!Number.isFinite(constant)||constant<1||!Number.isInteger(window)||window<1)throw Error('Parámetros RRF inválidos');
 const byId=new Map();
 for(const [listIndex,ranking]of rankings.entries()){
  const seen=new Set();
  for(const [position,row]of ranking.slice(0,window).entries()){
   if(!row.id||seen.has(row.id))throw Error('Identidad repetida en una lista');seen.add(row.id);
   const rank=position+1,contribution=1/(constant+rank),item=byId.get(row.id)??{id:row.id,score:0,contributions:[]};
   item.score+=contribution;item.contributions.push({listIndex,rank,contribution});byId.set(row.id,item);
  }
 }
 return [...byId.values()].sort(descending);
}
export function filterTopK(ranking,metadata,filter,k=3,placement='before'){
 if(!Number.isInteger(k)||k<1||!['before','after'].includes(placement)||!['documentId','kind','language'].includes(filter.field))throw Error('Filtro inválido');
 const allowed=row=>{const entry=metadata.find(m=>m.id===row.id);if(!entry)throw Error('Metadata ausente');return entry[filter.field]===filter.value;};
 return placement==='before'?ranking.filter(allowed).slice(0,k):ranking.slice(0,k).filter(allowed);
}
export function guardedRewrite(original,candidate,protectedTerms){
 const fold=text=>text.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es');
 const tokens=new Set(fold(candidate).match(/[\p{L}\p{N}]+/gu)??[]),missing=protectedTerms.filter(term=>!tokens.has(fold(term)));
 return {original,candidate,protectedTerms,missing,accepted:missing.length===0,text:missing.length?original:candidate};
}
