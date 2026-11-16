import {digest,wordWindows} from './ledger.mjs';
import {resolveRange} from './ranges.mjs';

function makeChunk(document,first,last,policy,budget) {
 const start=document.units[first].start,end=document.units[last-1].end,text=document.text.slice(start,end);
 const id=digest(JSON.stringify([document.representationId,policy,first,last,start,end,text]));
 return {id,documentId:document.documentId,documentVersion:document.documentVersion,representationId:document.representationId,policy,budget,first,last,start,end,text};
}

export function sentencePieces(document,budget) {
 if(!Number.isInteger(budget)||budget<1)throw Error('Presupuesto inválido');
 const ends=new Set([0,document.units.length]),ignored=[];
 const segments=new Intl.Segmenter('es',{granularity:'sentence'}).segment(document.text);
 for(const segment of segments){
  const end=segment.index+segment.segment.trimEnd().length;
  const unit=document.units.find(unit=>unit.end===end);
  if(unit)ends.add(unit.ordinal+1);else ignored.push({end,reason:'sentence_end_inside_or_outside_unit'});
 }
 const boundaries=[...ends].sort((a,b)=>a-b),pieces=[];
 for(let i=1;i<boundaries.length;i++)for(let first=boundaries[i-1];first<boundaries[i];first+=budget){
  const last=Math.min(first+budget,boundaries[i]),start=document.units[first].start,end=document.units[last-1].end;
  pieces.push({id:document.representationId+':'+first+':'+last,documentId:document.documentId,first,last,start,end,text:document.text.slice(start,end),endReason:last<boundaries[i]?'forced-budget':'sentence'});
 }
 return {pieces,ignored};
}

export function cosineDistance(a,b) {
 if(!a.length||a.length!==b.length||![...a,...b].every(Number.isFinite))throw Error('Vectores incompatibles');
 const norms=Math.hypot(...a)*Math.hypot(...b);if(!norms)throw Error('Norma nula');
 return 1-a.reduce((sum,value,index)=>sum+value*b[index],0)/norms;
}

export function semanticWindows(document,pieces,vectors,{budget,threshold,profile}) {
 if(!pieces.length||pieces.length!==vectors.length||!Number.isInteger(budget)||budget<1||!Number.isFinite(threshold)||threshold<0||threshold>2)throw Error('Configuración semántica inválida');
 if(pieces[0].first!==0||pieces.at(-1).last!==document.units.length||pieces.some((p,i)=>p.last-p.first>budget||(i&&pieces[i-1].last!==p.first)))throw Error('Piezas sin cobertura o presupuesto');
 const policy='adjacent-sentence-cosine/v1:'+JSON.stringify({budget,threshold,profile}),chunks=[],boundaries=[];
 let first=pieces[0].first;
 for(let i=1;i<pieces.length;i++){
  const distance=cosineDistance(vectors[i-1],vectors[i]),overBudget=pieces[i].last-first>budget,semantic=distance>threshold,cut=overBudget||semantic;
  boundaries.push({left:pieces[i-1].id,right:pieces[i].id,at:pieces[i].first,distance,budget:overBudget,semantic,cut,reason:overBudget?'budget':semantic?'semantic':'continue'});
  if(cut){chunks.push(makeChunk(document,first,pieces[i].first,policy,budget));first=pieces[i].first;}
 }
 chunks.push(makeChunk(document,first,pieces.at(-1).last,policy,budget));
 return {chunks,boundaries};
}

export function overlapWindows(document,budget,overlap) {
 if(!Number.isInteger(budget)||budget<1||!Number.isInteger(overlap)||overlap<0||overlap>=budget)throw Error('Overlap inválido');
 if(!overlap)return wordWindows(document,budget);
 const chunks=[],policy='word-overlap/v1:'+JSON.stringify({budget,overlap});
 for(let first=0;first<document.units.length;first+=budget-overlap){
  const last=Math.min(first+budget,document.units.length);chunks.push(makeChunk(document,first,last,policy,budget));
  if(last===document.units.length)break;
 }
 return chunks;
}

export function resolveGold(queries,documents) {
 return queries.map(query=>({...query,facts:query.facts.map(alternatives=>{
  if(!alternatives.length)throw Error('Hecho sin alternativas');
  return {alternatives:alternatives.map(alternative=>{
   const document=documents.find(document=>document.documentId===alternative.documentId);if(!document||!alternative.quote.trim())throw Error('Gold inválido');
   const start=document.text.indexOf(alternative.quote),end=start+alternative.quote.length;
   if(start<0||document.text.indexOf(alternative.quote,start+1)>=0)throw Error('Gold no anclado o ambiguo: '+query.id+'/'+alternative.quote);
   const range=resolveRange(document,start,end);
   return {...alternative,representationId:document.representationId,start,end,requiredUnitIds:range.references.map(reference=>reference.unitOrdinal)};
  })};
 })}));
}

export function evidenceMetrics(ranking,gold,k=3) {
 if(!Number.isInteger(k)||k<1)throw Error('k inválido');
 const top=ranking.slice(0,k),context=new Set();let contextUnits=0;
 for(const chunk of top){
  if(!chunk.representationId||!Number.isInteger(chunk.first)||!Number.isInteger(chunk.last)||chunk.last<=chunk.first)throw Error('Chunk sin rango versionado');
  for(let ordinal=chunk.first;ordinal<chunk.last;ordinal++){context.add(chunk.representationId+':'+ordinal);contextUnits++;}
 }
 const factMetrics=gold.facts.map(fact=>{
  const alternatives=fact.alternatives.map(alternative=>{
   const required=alternative.requiredUnitIds.length,matched=alternative.requiredUnitIds.filter(id=>context.has(alternative.representationId+':'+id)).length;
   if(!required)throw Error('Gold sin unidades');
   return {required,matched,coverage:matched/required,complete:matched===required};
  });
  return {coverage:Math.max(...alternatives.map(alt=>alt.coverage)),complete:alternatives.some(alt=>alt.complete),alternatives};
 });
 return {coverage:factMetrics.length?factMetrics.reduce((sum,fact)=>sum+fact.coverage,0)/factMetrics.length:null,complete:factMetrics.length?factMetrics.every(fact=>fact.complete):null,
  factMetrics,returned:top.length,contextUnits,uniqueContextUnits:context.size,contextRedundancy:contextUnits?1-context.size/contextUnits:0};
}
