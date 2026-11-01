import {tokensOf,toBio,fromBio} from './spans.mjs';
const corpus=await (await fetch('./corpus.json')).json();
const $=id=>document.getElementById(id);let current;
for(const r of corpus){const option=document.createElement('option');option.value=r.id;option.textContent=r.id+' · '+r.split+' · '+r.text;$('record').append(option);}
function show(){current=corpus.find(r=>r.id===$('record').value);const tokens=tokensOf(current.text),labels=toBio(current),points=Array.from(current.text);$('tokens').replaceChildren();$('highlight').replaceChildren();let cursor=0;
 for(const s of current.spans){$('highlight').append(document.createTextNode(points.slice(cursor,s.start).join('')));const mark=document.createElement('mark');mark.className=s.label==='ORG'?'org':'';mark.textContent=s.text;mark.title=s.label+' ['+s.start+','+s.end+')';$('highlight').append(mark);cursor=s.end;}$('highlight').append(document.createTextNode(points.slice(cursor).join('')));
 tokens.forEach((t,i)=>{const row=document.createElement('tr');for(const v of [t.text,t.start,t.end,labels[i]]){const cell=document.createElement('td');cell.textContent=v;row.append(cell);}$('tokens').append(row);});
 $('labels').value=labels.join(' ');$('detail').textContent=JSON.stringify(current.spans);$('decoded').textContent='';$('status').textContent='';}
$('record').addEventListener('change',show);$('probe').addEventListener('submit',e=>{e.preventDefault();try{const spans=fromBio(tokensOf(current.text),$('labels').value.trim().split(/\s+/));$('decoded').textContent=JSON.stringify(spans,null,2);$('status').textContent='Secuencia válida. No se ha evaluado si la predicción es correcta.';}catch(error){$('decoded').textContent='';$('status').textContent=error.message;}});show();

const {reviewErrors,alignFirstSubwords}=await import('./diagnostics.mjs');
const {lossChart}=await import('./charts.mjs');
const saved=await (await fetch('./observations.json')).json();
for(const v of saved.variants){const o=document.createElement('option');o.value=v.id;o.textContent=v.epochs?`${v.epochs} pasos · seed ${v.seed}`:'Diccionario de train';$('variant').append(o);}
$('variant').value='800-7';
function highlight(id,text,spans){const el=$(id),points=Array.from(text);el.replaceChildren();let cursor=0;for(const s of spans){el.append(document.createTextNode(points.slice(cursor,s.start).join('')));const m=document.createElement('mark');m.className=s.label==='ORG'?'org':'';m.textContent=points.slice(s.start,s.end).join('')+' ['+s.label+']';el.append(m);cursor=s.end;}el.append(document.createTextNode(points.slice(cursor).join('')));}
function compare(){const v=saved.variants.find(v=>v.id===$('variant').value),r=corpus.find(r=>r.id===$('result-record').value),p=v.predictions.find(p=>p.id===r.id);highlight('gold',r.text,r.spans);highlight('prediction',r.text,p.spans);$('review').textContent=JSON.stringify(reviewErrors(r.spans,p.spans),null,2);}
function results(){const split=$('split').value,v=saved.variants.find(v=>v.id===$('variant').value),m=v.metrics[split].exact,fmt=x=>x===null?'no definida':x.toLocaleString('es',{maximumFractionDigits:6});
 $('metrics').textContent=`TP ${m.tp} · FP ${m.fp} · FN ${m.fn} · Precision ${fmt(m.precision)} · Recall ${fmt(m.recall)} · F1 ${fmt(m.f1)}`;
 const before=$('result-record').value;$('result-record').replaceChildren();for(const r of corpus.filter(r=>r.split===split)){const o=document.createElement('option');o.value=r.id;o.textContent=r.id+' · '+r.text;$('result-record').append(o);}if(corpus.some(r=>r.split===split&&r.id===before))$('result-record').value=before;
 $('null-note').textContent='Una precisión no definida significa que no se predijo ninguna entidad. Los aciertos requieren tipo e intervalo exactos.';
 $('chart').replaceChildren();if(v.loss){const host=document.createElement('div'); // Only numeric, captured values and fixed labels enter this SVG.
 host.innerHTML=lossChart(v.loss);$('chart').append(host);$('chart-note').textContent='Loss de train, seed '+v.seed+'. El eje horizontal va de 0 a '+v.epochs+' pasos.';}else $('chart-note').textContent='El diccionario no tiene loss ni parámetros aprendidos.';compare();}
$('variant').addEventListener('change',results);$('split').addEventListener('change',results);$('result-record').addEventListener('change',compare);
$('align').addEventListener('submit',e=>{e.preventDefault();try{const ids=JSON.parse($('word-ids').value),labels=JSON.parse($('word-labels').value);if(!Array.isArray(ids)||!Array.isArray(labels)||ids.length>100||labels.length>100)throw Error('Usa arrays JSON de hasta 100 posiciones');$('aligned').textContent=JSON.stringify(alignFirstSubwords(ids,labels));}catch(e){$('aligned').textContent=e.message;}});results();
