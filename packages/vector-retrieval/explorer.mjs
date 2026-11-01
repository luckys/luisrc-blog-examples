import {initializeSavedPanels} from './saved-panels.mjs';
import {compareGeometry,toyVectors} from './geometry.mjs';
import {geometryDiagram} from './geometry-diagram.mjs';
import {neighborDiagram} from './neighbor-diagram.mjs';
import {neighborRecall} from './vectors.mjs';
const $=id=>document.getElementById(id),fmt=n=>(Math.abs(n)<5e-10?0:n).toLocaleString('es-ES',{maximumFractionDigits:9}),show=(id,text)=>{$(id).textContent=text;};
function table(id,rows){$(id).replaceChildren();for(const values of rows){const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=typeof value==='number'?fmt(value):value;tr.append(td);}$(id).append(tr);}}
function option(id,value,label){const el=document.createElement('option');el.value=value;el.textContent=label;$(id).append(el);}
function drawToy(){
 const degrees=Number($('degrees').value),scale=Number($('scale').value),{a,b}=toyVectors(degrees,scale),m=compareGeometry(a,b);
 show('degrees-label',fmt(degrees)+'°');show('scale-label',fmt(scale));$('diagram').innerHTML=geometryDiagram(a,b,$('unit').checked);
 show('toy-vectors','a = '+JSON.stringify(a)+'\nb = '+JSON.stringify(b));
 table('toy-metrics',[['Dot product',m.dot,m.unitDot],['Cosine',m.cosine,m.unitCosine],['L2²',m.squaredL2,m.unitSquaredL2],['L2',Math.sqrt(m.squaredL2),Math.sqrt(m.unitSquaredL2)],['Norma a',m.normA,Math.hypot(...m.unitA)],['Norma b',m.normB,Math.hypot(...m.unitB)]]);
}
async function start(){
 const response=await fetch('viewer-data.json');if(!response.ok)throw Error('No se pudo cargar la captura');const data=await response.json();
 if(data.kind!=='saved_embedding_geometry_not_live_model')throw Error('Captura incompatible');
 show('status','Encoder capturado '+data.encodingCapturedAt+'. Modelo local q8, 384 dimensiones. Comparación y cálculos sobre datos guardados.');
 for(const q of data.queries)option('query',q.id,q.id+' · '+q.text);
 for(const d of data.corpus)option('document',d.id,d.id+' · '+d.title);
 const drawReal=()=>{
  const q=data.rows.find(r=>r.id===$('query').value),d=data.rows.find(r=>r.id===$('document').value),judgment=data.queries.find(r=>r.id===q.id),m=compareGeometry(q.rawVector,d.rawVector);
  show('query-text',q.text);show('document-text',d.text);show('judgment',judgment.relevant.includes(d.id)?'Relevante según el juicio del autor.':'No relevante según el juicio del autor.');
  table('real-metrics',[['Norma consulta original',m.normA],['Norma documento original',m.normB],['Dot product original',m.dot],['Cosine por fórmula',m.cosine],['Dot unitario float32',m.unitDot],['L2² original',m.squaredL2],['L2² unitarios float32',m.unitSquaredL2],['2 − 2×dot unitario',2-2*m.unitDot]]);
  table('components',q.rawVector.map((value,i)=>[i,value,d.rawVector[i],m.unitA[i]*m.unitB[i]]));
  show('component-total','Suma de 384 productos unitarios: '+fmt(m.unitDot)+'. La coincidencia numérica no prueba relevancia.');
 };
 for(const q of data.queries)option('native-query',q.id,q.id+' · '+q.text);
 for(const strategy of data.native.strategies)option('native-strategy',strategy.id,strategy.id);
 const drawNativeDocument=()=>{
  const doc=data.indexDocuments.find(d=>d.id===$('native-document').value),query=data.queries.find(q=>q.id===$('native-query').value);
  show('native-document-text',doc.text);
  show('native-judgment',doc.kind==='index-control'?'Sin juicio semántico: registro de control del índice.':query.relevant.includes(doc.id)?'Relevante según la etiqueta del corpus original de 20 documentos.':'No relevante según la etiqueta del corpus original de 20 documentos.');
 };
 const drawNative=()=>{
  const queryId=$('native-query').value,strategy=data.native.strategies.find(s=>s.id===$('native-strategy').value),reference=data.native.neighbors.find(r=>r.strategy==='flat'&&r.queryId===queryId),selected=data.native.neighbors.find(r=>r.strategy===strategy.id&&r.queryId===queryId),rset=new Set(reference.ids),sset=new Set(selected.ids),shared=selected.ids.filter(id=>rset.has(id)).length;
  show('native-summary','Coincidencia geométrica: '+shared+'/10; recall '+fmt(neighborRecall(selected.ids,reference.ids))+'. Captura '+data.native.capturedAt+'.');
  $('native-diagram').innerHTML=neighborDiagram(reference.ids,selected.ids);
  table('native-exact',reference.ids.map((id,i)=>[i+1,id,reference.distances[i],sset.has(id)?'sí':'no']));
  table('native-selected',selected.ids.map((id,i)=>[i+1,id,selected.distances[i],rset.has(id)?'sí':'no']));
  $('native-document').replaceChildren();for(const id of new Set([...selected.ids,...reference.ids]))option('native-document',id,id);
  show('native-build',JSON.stringify(data.native.builds.find(b=>b.id===strategy.index),null,2));show('native-timing',JSON.stringify(data.native.summaries.find(s=>s.strategy===strategy.id),null,2));drawNativeDocument();
 };
 $('native-query').addEventListener('change',drawNative);$('native-strategy').addEventListener('change',drawNative);$('native-document').addEventListener('change',drawNativeDocument);
 for(const id of ['degrees','scale'])$(id).addEventListener('input',drawToy);$('unit').addEventListener('change',drawToy);for(const id of ['query','document'])$(id).addEventListener('change',drawReal);
 for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',()=>{for(const b of document.querySelectorAll('[data-panel]')){const selected=b===button;b.setAttribute('aria-pressed',String(selected));$(b.dataset.panel).hidden=!selected;}});
 drawToy();drawReal();drawNative();initializeSavedPanels(data);
}
start().catch(error=>show('status',error.message));
