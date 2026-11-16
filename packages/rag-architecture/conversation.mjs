const response=await fetch('./conversation-data.json');if(!response.ok)throw Error('No se pudo cargar la captura');
const data=await response.json(),$=id=>document.getElementById(id),cases=data.capture.cases;
const labels={ready:'Evidencia autorizada disponible',forbidden:'Conversación de otra identidad',unavailable_reference:'Referencia no disponible con estos permisos o versión',not_found:'Conversación desconocida',no_evidence:'Conversación sin referencias'};
const kinds={'cache-followup':'Seguimiento sobre caché','manager-followup':'Seguimiento sobre rotación','wrong-actor-other-tenant':'Otra organización','wrong-actor-same-tenant':'Otra identidad del tenant','revoked-manager':'Permiso retirado','unknown-conversation':'Conversación desconocida','foreign-reference-control':'Referencia ajena (control)','stale-reference-control':'Revisión incorrecta (control)','question-requests-other-identity':'Pregunta que pide cambiar de identidad','empty-references':'Sin referencias'};
for(const[cIndex,c]of cases.entries()){const option=document.createElement('option');option.value=String(cIndex);option.textContent=(cIndex+1)+'. '+kinds[c.kind]+' · '+c.role;$('case').append(option);}
function render(){
 const c=cases[Number($('case').value)];$('status').textContent=labels[c.outcome.status]+' · '+c.outcome.status;
 $('request').textContent=JSON.stringify({role:c.role,principal:c.principal,question:c.question},null,2);
 $('loads').textContent=JSON.stringify(c.loads,null,2);$('outcome').textContent=JSON.stringify(c.outcome,null,2);
 $('evidence').replaceChildren();for(const row of c.outcome.evidence){const li=document.createElement('li');li.textContent=row.id+' · '+row.body;$('evidence').append(li);}
 if(!c.outcome.evidence.length){const li=document.createElement('li');li.textContent='No se entrega texto de ninguna fuente al contexto.';$('evidence').append(li);}
 const values=[c.loads.length,c.loads.reduce((n,load)=>n+load.rows.length,0),c.outcome.evidence.length],svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 360 250');svg.setAttribute('role','img');svg.setAttribute('aria-label','Consultas de fuentes, filas leídas y fuentes en contexto: '+values.join(', '));
 const add=(name,attrs,text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;svg.append(node);};
 add('rect',{width:360,height:250,fill:'#020617',rx:8});add('text',{x:14,y:28,fill:'#e2e8f0','font-size':14},'Cantidad por etapa · escala 0–1');
 values.forEach((value,i)=>{const y=65+i*60;add('text',{x:14,y:y+18,fill:'#e2e8f0','font-size':13},['Consultas de fuentes','Filas leídas','Fuentes en contexto'][i]);add('rect',{x:158,y,width:value*150,height:24,fill:['#64748b','#38bdf8','#4ade80'][i]});add('text',{x:320,y:y+18,fill:'#e2e8f0','font-size':14},value);});
 $('flow').replaceChildren(svg);
}
$('case').addEventListener('change',render);render();
