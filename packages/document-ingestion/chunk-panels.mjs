import {partitionAtThreshold,contextEvidence,coverageCounts,coverageDiagram} from './chunk-explorer.mjs';
const $=id=>document.getElementById(id),show=(id,value)=>{$(id).textContent=value;},fmt=v=>v.toLocaleString('es-ES',{maximumFractionDigits:6});
function options(id,rows){$(id).replaceChildren(...rows.map(([value,label])=>{const o=document.createElement('option');o.value=String(value);o.textContent=label;return o;}));}
function rows(id,values){$(id).replaceChildren(...values.map(row=>{const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}return tr;}));}
export function initializeChunkPanels(data){
 const docs=data.ledger.documents.filter(d=>data.ledger.indexDocumentIds.includes(d.documentId)),saved=data.chunking,inputs=data.chunkInputs,retrieval=data.retrieval;
 options('semantic-document',docs.map(d=>[d.documentId,d.documentId]));
 function semantic(){
  const document=docs.find(d=>d.documentId===$('semantic-document').value),segment=inputs.segments.find(d=>d.documentId===document.documentId),actual=saved.semanticDocuments.find(d=>d.documentId===document.documentId);
  options('semantic-boundary',actual.boundaries.map((b,i)=>[i,'Frontera '+(i+1)+' · unidad '+b.at+' · distancia '+fmt(b.distance)]));boundary();counterfactual();
 }
 function boundary(){
  const id=$('semantic-document').value,actual=saved.semanticDocuments.find(d=>d.documentId===id),pieces=inputs.segments.find(d=>d.documentId===id).pieces,i=Number($('semantic-boundary').value),b=actual.boundaries[i];
  show('semantic-left',pieces[i].text);show('semantic-right',pieces[i+1].text);show('semantic-detail',JSON.stringify(b,null,2));
 }
 function counterfactual(){
  const document=docs.find(d=>d.documentId===$('semantic-document').value),input=inputs.segments.find(d=>d.documentId===document.documentId),actual=saved.semanticDocuments.find(d=>d.documentId===document.documentId),threshold=Number($('semantic-threshold').value);
  const chunks=partitionAtThreshold(document,input.pieces,actual.boundaries,threshold);show('semantic-threshold-label',fmt(threshold));
  show('semantic-summary','Captura original: '+actual.chunks.length+' chunks con umbral 0,35. Simulación local: '+chunks.length+' con '+fmt(threshold)+'. No recalcula embeddings, búsqueda ni las métricas guardadas.');
  rows('semantic-ranges',chunks.map(c=>[c.first,c.last,c.last-c.first,document.text.slice(document.units[c.first].start,document.units[c.last-1].end)]));
 }
 options('overlap-document',docs.map(d=>[d.documentId,d.documentId]));options('overlap-policy',[['size32','0 unidades · paso 32'],['overlap4','4 unidades · paso 28'],['overlap8','8 unidades · paso 24']]);
 function overlap(){const chunks=saved.strategies.find(s=>s.id===$('overlap-policy').value).chunks.filter(c=>c.documentId===$('overlap-document').value);options('overlap-chunk',chunks.map((c,i)=>[i,i+' · ['+c.first+', '+c.last+')']));overlapChunk();}
 function overlapChunk(){
  const document=docs.find(d=>d.documentId===$('overlap-document').value),chunks=saved.strategies.find(s=>s.id===$('overlap-policy').value).chunks.filter(c=>c.documentId===document.documentId),chunk=chunks[Number($('overlap-chunk').value)],counts=coverageCounts(document,chunks),total=counts.reduce((s,n)=>s+n,0);
  show('overlap-summary',chunks.length+' chunks; '+total+' unidades contadas; '+counts.length+' únicas; '+(total-counts.length)+' repetidas en este documento.');
  $('overlap-diagram').innerHTML=coverageDiagram(counts,chunk);show('overlap-text',chunk.text);show('overlap-detail',JSON.stringify(chunk,null,2));
 }
 options('retrieval-query',retrieval.queries.map(q=>[q.id,q.id+' · '+q.text]));options('retrieval-strategy',saved.strategies.map(s=>[s.id,s.id]));
 function drawRetrieval(){
  const query=retrieval.queries.find(q=>q.id===$('retrieval-query').value),strategy=$('retrieval-strategy').value,row=retrieval.rows.find(r=>r.queryId===query.id&&r.strategy===strategy),byId=new Map(saved.strategies.find(s=>s.id===strategy).chunks.map(c=>[c.id,c])),k=Number($('retrieval-k').value),top=row.ranking.slice(0,k).map(r=>({...byId.get(r.id),score:r.score})),metrics=contextEvidence(top,query);
  show('retrieval-k-label',k);show('retrieval-summary',query.split+' · '+metrics.returned+' devueltos. Cobertura: '+(metrics.coverage===null?'no aplicable':fmt(metrics.coverage))+'; completa: '+(metrics.complete===null?'no aplicable':metrics.complete?'sí':'no')+'; redundancia: '+fmt(metrics.contextRedundancy)+'.');
  show('retrieval-detail',JSON.stringify(metrics,null,2));show('retrieval-gold',JSON.stringify(query.facts,null,2));$('retrieval-chunks').replaceChildren();
  for(const [i,chunk]of top.entries()){const section=document.createElement('section'),h=document.createElement('h3'),pre=document.createElement('pre'),details=document.createElement('details'),summary=document.createElement('summary'),meta=document.createElement('pre');h.textContent=(i+1)+'. '+chunk.documentId+' · ['+chunk.first+', '+chunk.last+') · score '+fmt(chunk.score);pre.textContent=chunk.text;summary.textContent='Identidad, versión y rango';meta.textContent=JSON.stringify(chunk,null,2);details.append(summary,meta);section.append(h,pre,details);$('retrieval-chunks').append(section);}
 }
 for(const [id,event,handler]of [['semantic-document','change',semantic],['semantic-boundary','change',boundary],['semantic-threshold','input',counterfactual],['overlap-document','change',overlap],['overlap-policy','change',overlap],['overlap-chunk','change',overlapChunk],['retrieval-query','change',drawRetrieval],['retrieval-strategy','change',drawRetrieval],['retrieval-k','input',drawRetrieval]])$(id).addEventListener(event,handler);
 semantic();overlap();drawRetrieval();
}
