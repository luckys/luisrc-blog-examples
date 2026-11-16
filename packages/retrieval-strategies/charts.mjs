import * as echarts from 'echarts';
const blue='#38bdf8',gold='#fbbf24',axis={axisLabel:{color:'#e2e8f0',fontSize:12,formatter:value=>typeof value==='number'?value.toLocaleString('es-ES',{maximumFractionDigits:4}):value},splitLine:{lineStyle:{color:'#334155'}}};
const number=n=>n.toLocaleString('es-ES',{maximumFractionDigits:4});
function render(height,title,subtitle,options){
 const chart=echarts.init(null,null,{renderer:'svg',ssr:true,width:360,height});
 try{chart.setOption({animation:false,backgroundColor:'#0f172a',textStyle:{fontFamily:'sans-serif',color:'#e2e8f0'},title:{text:title,subtext:subtitle,left:12,top:10,textStyle:{color:'#e2e8f0',fontSize:17},subtextStyle:{color:'#94a3b8',fontSize:13,lineHeight:19}},...options});let svg=chart.renderToSVGString().replace(/zr\d+/g,'retrieval-figure');const classes=new Map();svg=svg.replace(/retrieval-figure-cls-\d+/g,key=>{if(!classes.has(key))classes.set(key,'retrieval-figure-cls-'+classes.size);return classes.get(key);});if(!svg.includes('viewBox='))svg=svg.replace('<svg ',`<svg viewBox="0 0 360 ${height}" `);return svg.replace('<svg ',`<svg role="img" aria-label="${title}" `)+'\n';}finally{chart.dispose();}
}
const vertical=(labels,max=1.1)=>({grid:{left:52,right:24,top:112,bottom:85},xAxis:{...axis,type:'category',data:labels},yAxis:{...axis,type:'value',min:0,max}});
const bar=(name,values,color,labels=true)=>({name,type:'bar',data:values,itemStyle:{color},barMaxWidth:34,label:{show:labels,position:'top',fontSize:13,color:'#e2e8f0',formatter:p=>number(p.value)}});
export function lexicalChart(data){
 const terms=data.results.rows.find(r=>r.queryId==='Q01'&&r.method==='bm25').ranking[0].terms;
 return render(460,'Aportes al score de BM25','Q01 · primer chunk recuperado\nContribuciones, no probabilidades',{
  grid:{left:96,right:55,top:110,bottom:45},yAxis:{...axis,type:'category',inverse:true,data:terms.map(t=>t.term)},xAxis:{...axis,type:'value',min:0,max:2.5},series:[{type:'bar',barWidth:26,data:terms.map(t=>t.contribution),itemStyle:{color:blue},label:{show:true,position:'right',fontSize:12,color:'#e2e8f0',formatter:p=>number(p.value)}}]
 });
}
export function denseChart(data){
 const rows=data.results.rows.find(r=>r.queryId==='Q14'&&r.method==='dense').ranking,label=id=>{const c=data.inputs.chunks.find(c=>c.id===id);return (c.documentId==='RUNBOOK'?'RUN':c.documentId==='COLUMNS'?'COL':'HTML')+' '+c.first;};
 return render(720,'Coseno y evidencia no coinciden','Q14 · trece chunks ordenados\nVerde: chunk con la evidencia etiquetada',{
  grid:{left:90,right:60,top:112,bottom:45},yAxis:{...axis,type:'category',inverse:true,data:rows.map(r=>label(r.id))},xAxis:{...axis,type:'value',min:-.05,max:.35},series:[{type:'bar',barWidth:23,data:rows.map(r=>({value:r.score,itemStyle:{color:label(r.id)==='COL 64'?'#4ade80':blue}})),label:{show:true,position:'right',fontSize:12,color:'#e2e8f0',formatter:p=>number(p.value)}}]
 });
}
export function fusionChart(data){
 const rows=data.results.rows.find(r=>r.queryId==='Q14'&&r.method==='rrf').ranking.slice(0,4),label=id=>{const c=data.inputs.chunks.find(c=>c.id===id);return (c.documentId==='RUNBOOK'?'RUN':c.documentId==='COLUMNS'?'COL':'HTML')+' '+c.first;};
 return render(520,'RRF desplaza la evidencia','Q14 · constante 60 / ventana 10\nCOL 64 tiene evidencia y queda cuarto',{
  grid:{left:82,right:55,top:120,bottom:85},legend:{data:['BM25','Denso'],bottom:10,textStyle:{color:'#e2e8f0'}},yAxis:{...axis,type:'category',inverse:true,data:rows.map(r=>label(r.id))},xAxis:{...axis,type:'value',min:0,max:.04},series:[0,1].map(i=>({type:'bar',name:i?'Denso':'BM25',stack:'rrf',barWidth:32,data:rows.map(r=>r.contributions.find(c=>c.listIndex===i)?.contribution??0),itemStyle:{color:i?gold:blue},label:{show:i===1,position:'right',fontSize:11,color:'#e2e8f0',formatter:p=>number(rows[p.dataIndex].score)}}))
 });
}
export function filterChart(data){return render(420,'Filtrar antes cambia el top 3','F01 · solo COLUMNS · 4 elegibles\nCantidad de resultados, no latencia',{
 ...vertical(['BM25','Denso','RRF'],3.5),legend:{data:['Antes','Después'],bottom:10,textStyle:{color:'#e2e8f0'}},yAxis:{...axis,type:'value',min:0,max:3.5,interval:1},series:['before','after'].map((placement,i)=>bar(i?'Después':'Antes',['bm25','dense','rrf'].map(method=>data.results.filters.find(r=>r.filterId==='F01'&&r.method===method&&r.placement===placement).ranking.length),i?gold:blue))
});}
export function multiChart(data){const rows=data.results.multi.filter(r=>r.metrics.coverage!==null);return render(440,'Tres consultas pueden perder datos','6 casos con respuesta · variantes del autor\nQ19 negativo se conserva aparte',{
 ...vertical(rows.map(r=>r.queryId)),legend:{data:['Original','Tres listas'],bottom:10,textStyle:{color:'#e2e8f0'}},yAxis:{...axis,type:'value',min:0,max:1.1,interval:.25,axisLabel:{color:'#e2e8f0',formatter:v=>Math.round(v*100)+'%'}},series:[bar('Original',rows.map(r=>r.baseline.coverage),blue,false),bar('Tres listas',rows.map(r=>r.metrics.coverage),gold,false)]
});}
export function rewriteChart(data){return render(380,'Qué propuestas acepta la regla','8 equivalentes y 8 alteradas, según autor\nUna alterada pasa el control de tokens',{
 ...vertical(['Equivalentes','Alteradas'],9),yAxis:{...axis,type:'value',min:0,max:9,interval:2},series:[bar('Aceptadas',['safe','unsafe'].map(kind=>data.results.rewrites.filter(r=>r.kind===kind&&r.guard.accepted).length),blue)]
});}
export function evaluationChart(data){const rows=data.results.summaries.filter(r=>r.split==='test');return render(500,'Evidencia en top 3 por retriever','8 preguntas test con respuesta\nCorpus y preguntas ya conocidos',{
 ...vertical(['BM25','Denso','RRF']),legend:{data:['Cobertura','Completitud'],bottom:10,textStyle:{color:'#e2e8f0'}},yAxis:{...axis,type:'value',min:0,max:1.1,interval:.25,axisLabel:{color:'#e2e8f0',formatter:v=>Math.round(v*100)+'%'}},series:[['meanCoverage','Cobertura',blue],['completeRate','Completitud',gold]].map(([key,name,color])=>({...bar(name,rows.map(r=>r[key]),color),label:{show:true,rotate:90,distance:9,position:'top',color:'#e2e8f0',fontSize:12,formatter:p=>(p.value*100).toLocaleString('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'}}))
});}
