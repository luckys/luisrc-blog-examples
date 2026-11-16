import * as echarts from 'echarts';
function figure(height,title,subtitle,options){
 const instance=echarts.init(null,null,{renderer:'svg',ssr:true,width:360,height});
 try{instance.setOption({animation:false,backgroundColor:'#0f172a',textStyle:{color:'#e2e8f0',fontFamily:'sans-serif'},title:{text:title,subtext:subtitle,left:12,top:10,textStyle:{fontSize:17,color:'#e2e8f0'},subtextStyle:{color:'#94a3b8',fontSize:13,lineHeight:19}},...options});
  let svg=instance.renderToSVGString().replace(/zr\d+/g,'ingestion-chunks'),classes=new Map();svg=svg.replace(/ingestion-chunks-cls-\d+/g,key=>{if(!classes.has(key))classes.set(key,'ingestion-chunks-cls-'+classes.size);return classes.get(key);});
  if(!svg.includes('viewBox='))svg=svg.replace('<svg ',`<svg viewBox="0 0 360 ${height}" `);
  return svg.replace('<svg ',`<svg role="img" aria-label="${title}" `)+'\n';
 }finally{instance.dispose();}
}
const axis={axisLabel:{color:'#e2e8f0',fontSize:12},splitLine:{lineStyle:{color:'#334155'}}};
export function semanticChart(chunking){
 const documents=chunking.semanticDocuments;
 return figure(660,'Fronteras semánticas observadas','Umbral fijado: 0,35 · corta las 41\nCada panel mantiene su propio documento',{
  graphic:documents.map((d,i)=>({type:'text',left:14,top:98+i*180,style:{text:d.documentId+' · '+d.boundaries.length+' fronteras',font:'14px sans-serif',fill:'#e2e8f0'}})),
  grid:documents.map((d,i)=>({left:48,right:22,top:122+i*180,height:104})),
  xAxis:documents.map((d,i)=>({...axis,gridIndex:i,type:'category',data:d.boundaries.map((b,j)=>String(j+1)),name:'Frontera adyacente',nameLocation:'middle',nameGap:25,nameTextStyle:{color:'#e2e8f0',fontSize:12},axisLabel:{color:'#e2e8f0',interval:'auto'}})),
  yAxis:documents.map((d,i)=>({...axis,gridIndex:i,type:'value',min:0,max:1.2,interval:.4})),
  series:documents.map((d,i)=>({type:'line',xAxisIndex:i,yAxisIndex:i,symbolSize:5,itemStyle:{color:'#38bdf8'},data:d.boundaries.map(b=>b.distance),markLine:{silent:true,symbol:'none',label:{formatter:'0,35',position:'insideEndTop',color:'#fbbf24'},lineStyle:{color:'#fbbf24'},data:[{yAxis:.35}]}}))
 });
}
export function overlapChart(chunking){
 const rows=['size32','overlap4','overlap8'].map(id=>chunking.summaries.find(s=>s.strategy===id));
 return figure(420,'Unidades únicas y repetidas','Tres representantes · 367 únicas\nOverlap por ventana: 0, 4 y 8 unidades',{
  legend:{data:['Únicas','Repetidas'],bottom:10,textStyle:{color:'#e2e8f0'}},grid:{left:55,right:22,top:112,bottom:80},xAxis:{...axis,type:'category',data:['0','4','8'],name:'Overlap',nameLocation:'middle',nameGap:24,nameTextStyle:{color:'#e2e8f0'}},yAxis:{...axis,type:'value',min:0,max:550,interval:100},
  series:[['uniqueUnits','Únicas','#38bdf8'],['repeatedUnits','Repetidas','#fbbf24']].map(([key,name,color])=>({type:'bar',name,stack:'units',barWidth:45,itemStyle:{color},data:rows.map(row=>row[key]),label:{show:true,position:'inside',color:'#0f172a',fontSize:14,formatter:p=>p.value?String(p.value):''}}))
 });
}
export function retrievalChart(retrieval){
 const rows=retrieval.summaries.filter(row=>row.split==='test');
 return figure(480,'Evidencia recuperada en top 3','8 preguntas con respuesta · corpus conocido\nLos 2 negativos se muestran aparte',{
  legend:{data:['Cobertura','Completitud'],bottom:10,textStyle:{color:'#e2e8f0'}},grid:{left:52,right:24,top:120,bottom:90},xAxis:{...axis,type:'category',data:['Tamaño','Semántico','Overlap 4','Overlap 8'],axisLabel:{color:'#e2e8f0',interval:0,rotate:20,fontSize:12}},yAxis:{...axis,type:'value',min:0,max:1.1,interval:.25,axisLabel:{color:'#e2e8f0',formatter:v=>Math.round(v*100)+'%'}},
  series:[['meanCoverage','Cobertura','#38bdf8'],['completeRate','Completitud','#fbbf24']].map(([key,name,color])=>({type:'bar',name,barMaxWidth:23,itemStyle:{color},data:rows.map(row=>row[key]),label:{show:true,position:'top',rotate:90,distance:8,color:'#e2e8f0',fontSize:11,formatter:p=>(p.value*100).toLocaleString('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'}}))
 });
}
