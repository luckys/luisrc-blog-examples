const response=await fetch('./multistep-data.json');if(!response.ok)throw Error('No se pudo cargar la captura');
const data=await response.json(),$=id=>document.getElementById(id);
const names={'one-step':'Solo una llamada','follow-reference':'Seguir la referencia','cycle':'Ciclo','empty-search':'Búsqueda sin semilla','foreign-reference':'Referencia de otro tenant','restricted-reference':'Referencia restringida','direct-sufficient':'Primera fuente suficiente','zero-budget':'Presupuesto cero','foreign-first-budget':'Llamada gastada en referencia ajena','missing-reference':'Referencia inexistente','source-budget':'Límite de fuentes'};
const stops={call_budget:'Presupuesto de llamadas agotado',requirements_met:'Claves de documento requeridas disponibles',no_progress:'No quedan referencias nuevas',no_results:'La búsqueda inicial no devuelve fuentes',source_budget:'Límite de fuentes alcanzado',frontier_budget:'Límite de referencias alcanzado'};
for(const[i,row]of data.capture.rows.entries()){const option=document.createElement('option');option.value=String(i);option.textContent=(i+1)+'. '+names[row.kind]+' · '+row.role;$('workflow').append(option);}
function render(reset=false){
 const row=data.capture.rows[Number($('workflow').value)],entry=data.cases.find(c=>c.id===row.caseId);
 if(reset){$('step').max=String(row.queries.length);$('step').value=String(row.queries.length);}
 const step=Number($('step').value),prefix=row.queries.slice(0,step),documents=new Map();for(const query of prefix)for(const document of query.rows)documents.set(document.id,document);
 $('status').textContent=stops[row.result.stop]+' · '+row.result.stop;
 $('config').textContent=JSON.stringify({role:row.role,query:entry.query,requiredKeys:entry.requiredKeys,maxCalls:entry.maxCalls,maxSources:entry.maxSources,maxQueuedReferences:entry.maxQueuedReferences,sourceCalls:row.result.calls},null,2);
 $('step-count').textContent=step+' / '+row.queries.length;
 $('queries').textContent=JSON.stringify(prefix,null,2);$('trace').textContent=JSON.stringify(row.result.trace,null,2);
 const coverage=entry.goldAuthorizedIds.length?entry.goldAuthorizedIds.filter(id=>documents.has(id)).length/entry.goldAuthorizedIds.length:null;
 $('coverage').textContent='Cobertura de IDs relevantes autorizados en este prefijo: '+(coverage===null?'sin denominador (gold vacío)':coverage)+'.';
 $('sources').replaceChildren();for(const source of documents.values()){const li=document.createElement('li');li.textContent=source.id+' · '+source.body;$('sources').append(li);}if(!documents.size){const li=document.createElement('li');li.textContent='No se han recuperado fuentes en este prefijo.';$('sources').append(li);}
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 360 180');svg.setAttribute('role','img');svg.setAttribute('aria-label','Llamadas guardadas: '+row.queries.length+'; reproducidas: '+step);
 const add=(name,attrs,text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;svg.append(node);};
 add('rect',{width:360,height:180,fill:'#020617',rx:8});
 if(!row.queries.length)add('text',{x:20,y:80,fill:'#e2e8f0','font-size':14},'El presupuesto impide iniciar la búsqueda.');
 row.queries.forEach((query,i)=>{const x=row.queries.length===1?180:80+i*200;if(i)add('line',{x1:98,y1:60,x2:x-18,y2:60,stroke:'#64748b','stroke-width':2});add('circle',{cx:x,cy:60,r:18,fill:i<step?'#38bdf8':'#475569'});add('text',{x,y:65,fill:i<step?'#020617':'#f8fafc','text-anchor':'middle','font-size':14},i+1);add('text',{x,y:110,fill:'#e2e8f0','text-anchor':'middle','font-size':13},query.kind==='search'?'Búsqueda':'Referencia');add('text',{x,y:137,fill:'#cbd5e1','text-anchor':'middle','font-size':13},query.rows.length+' fila'+(query.rows.length===1?'':'s'));});
 $('calls').replaceChildren(svg);
}
$('workflow').addEventListener('change',()=>render(true));$('step').addEventListener('input',()=>render());render(true);
