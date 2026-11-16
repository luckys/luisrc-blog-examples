import {countDiagram} from './diagrams.mjs';
const response=await fetch('./viewer-data.json');if(!response.ok)throw Error('No se pudo cargar la captura');
const data=await response.json(),{capture,corpus,cases}=data,$=id=>document.getElementById(id);
const text=(id,value)=>{$(id).textContent=value;};
function options(id,entries){const select=$(id);select.replaceChildren();for(const[value,label]of entries){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}}
options('role',corpus.principals.map(p=>[p.role,p.role]));
text('missing-principal',JSON.stringify(capture.probes.find(p=>p.label==='missing-principal'),null,2));
function fillQueries(){options('query',cases.filter(c=>c.role===$('role').value).map(c=>[c.id,c.query]));}
function render(){
 const layout=$('layout').value,role=$('role').value;
 const row=capture.requests.find(r=>r.layout===layout&&r.caseId===$('query').value);
 const database=capture.databases.find(d=>d.name===row.database);
 const probes=capture.probes.filter(p=>p.layout===layout&&p.role===role);
 const visible=probes.find(p=>p.label==='plain-select').rows;
 text('status',`${row.identity.session_user} · ${row.database} · ${row.rows.length} resultado${row.rows.length===1?'':'s'} · ${row.exposedIds.length} exposiciones en esta solicitud. Recall@3: ${row.eligibleRecallAt3===null?'sin denominador (gold vacío)':row.eligibleRecallAt3}.`);
 $('counts').replaceChildren(countDiagram([database.documentIds.length,visible.length,row.rows.length]));
 text('gold','Gold autorizado: '+(row.goldIds.join(', ')||'ningún documento relevante en este ámbito'));
 $('results').replaceChildren();
 for(const result of row.rows){const li=document.createElement('li'),heading=document.createElement('strong'),paragraph=document.createElement('p');heading.textContent=result.id+' · score '+result.score;paragraph.textContent=result.body;li.append(heading,paragraph);$('results').append(li);}
 if(!row.rows.length){const li=document.createElement('li');li.textContent='La consulta no devolvió documentos.';$('results').append(li);}
 options('probe',probes.map((p,i)=>[String(i),p.label]));
 $('probe').onchange=()=>renderProbe(probes);renderProbe(probes);
 text('database',row.database+' · tabla e índices capturados después de ANALYZE');
 $('relations').replaceChildren();for(const relation of database.relations){const tr=document.createElement('tr');for(const value of [relation.relname,relation.file,relation.bytes,relation.owner]){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}$('relations').append(tr);}
 const plan=capture.plans.find(p=>p.layout===layout&&p.role===role);
 text('plan',JSON.stringify(plan.plan,null,2));
}
function renderProbe(probes){text('probe-result',JSON.stringify(probes[Number($('probe').value)],null,2));}
$('role').addEventListener('change',()=>{const previous=cases.find(c=>c.id===$('query').value)?.query;fillQueries();const entry=cases.find(c=>c.role===$('role').value&&c.query===previous);if(entry)$('query').value=entry.id;render();});
$('layout').addEventListener('change',render);$('query').addEventListener('change',render);
fillQueries();render();
