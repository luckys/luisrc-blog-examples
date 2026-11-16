import * as echarts from 'echarts';
function chart(title,subtitle,labels,values,color='#38bdf8',max){
 const instance=echarts.init(null,null,{renderer:'svg',ssr:true,width:360,height:380});
 try{instance.setOption({animation:false,backgroundColor:'#0f172a',textStyle:{color:'#e2e8f0',fontFamily:'sans-serif'},title:{text:title,subtext:subtitle,left:12,top:10,textStyle:{fontSize:17,color:'#e2e8f0'},subtextStyle:{color:'#94a3b8',fontSize:13,lineHeight:19}},grid:{left:52,right:22,top:110,bottom:75},xAxis:{type:'category',data:labels,axisLabel:{color:'#e2e8f0',fontSize:12}},yAxis:{type:'value',min:0,max,axisLabel:{color:'#e2e8f0',formatter:value=>value.toLocaleString('es-ES')},splitLine:{lineStyle:{color:'#334155'}}},series:[{type:'bar',barWidth:42,itemStyle:{color},data:values,label:{show:true,position:'top',color:'#e2e8f0',fontSize:13,formatter:params=>params.value.toLocaleString('es-ES',{maximumFractionDigits:4})}}]});
 let svg=instance.renderToSVGString().replace(/zr\d+/g,'ingestion-figure');const classes=new Map();svg=svg.replace(/ingestion-figure-cls-\d+/g,key=>{if(!classes.has(key))classes.set(key,'ingestion-figure-cls-'+classes.size);return classes.get(key);});
 if(!svg.includes('viewBox='))svg=svg.replace('<svg ','<svg viewBox="0 0 360 380" ');
 return svg.replace('<svg ','<svg role="img" aria-label="'+title+'" ')+'\n';
 }finally{instance.dispose();}
}
export function extractionChart(data){return chart('Palabras recuperadas del PDF','Misma herramienta; formatos distintos\nOCR del scan se evalúa por separado',['Digital','Columnas','Scan'],data.documents.filter(doc=>doc.pages).map(doc=>doc.pages.flatMap(page=>page.words).length));}
export function confidenceChart(words){const bins=[words.filter(w=>w.confidence<50).length,words.filter(w=>w.confidence>=50&&w.confidence<90).length,words.filter(w=>w.confidence>=90).length];return chart('Confidence de 178 palabras','Scores del motor, no probabilidad\nCER observado 0 en este escaneo limpio',['<50','50–<90','≥90'],bins,'#fbbf24');}
export function layoutChart(data){return chart('Orden frente a referencia','Distancia normalizada; no error OCR\nRegla de columnas con plantilla conocida',['XML','Filas','Columnas'],['stream','rows','columns'].map(mode=>data.metrics.layout[mode].rate),'#38bdf8',1);}

export function dedupChart(ledger){return chart('Fuentes y grupos conservados','Mismo role; aliases conservados\nIncluye 3 controles fuera del corpus',['Fuentes','Bytes','Texto'],[ledger.documents.length,ledger.rawGroups.length,ledger.contentGroups.length]);}
export function budgetChart(preflight){
 const instance=echarts.init(null,null,{renderer:'svg',ssr:true,width:360,height:520}),axis={axisLabel:{color:'#e2e8f0',fontSize:13},splitLine:{lineStyle:{color:'#334155'}}},data=preflight.summaries;
 try{instance.setOption({animation:false,backgroundColor:'#0f172a',textStyle:{color:'#e2e8f0',fontFamily:'sans-serif'},title:{text:'Ventanas y tokens guardados',subtext:'3 representantes; sin overlap\nUnidades de origen ≠ tokens del modelo',left:12,top:10,textStyle:{fontSize:17,color:'#e2e8f0'},subtextStyle:{fontSize:13,lineHeight:19,color:'#94a3b8'}},
 graphic:[{type:'text',left:12,top:96,style:{text:'Cantidad de chunks',fill:'#e2e8f0',font:'14px sans-serif'}},{type:'text',left:12,top:294,style:{text:'Máximo observado de tokens por chunk',fill:'#e2e8f0',font:'14px sans-serif'}},{type:'text',left:12,top:498,style:{text:'Con special tokens; sin padding ni truncation.',fill:'#94a3b8',font:'13px sans-serif'}}],
 grid:[{left:52,right:24,top:124,height:108},{left:52,right:24,top:322,height:108}],
 xAxis:[0,1].map(gridIndex=>({...axis,gridIndex,type:'category',data:data.map(row=>String(row.budget)),name:'Presupuesto de unidades',nameLocation:'middle',nameGap:27,nameTextStyle:{color:'#e2e8f0',fontSize:13}})),
 yAxis:[{...axis,gridIndex:0,type:'value',min:0,max:Math.ceil(Math.max(...data.map(row=>row.chunks))/10)*10,interval:10},{...axis,gridIndex:1,type:'value',min:0,max:Math.ceil(Math.max(...data.map(row=>row.maxModelTokens))/30)*30,interval:30}],
 series:[['chunks','#38bdf8'],['maxModelTokens','#fbbf24']].map(([key,color],index)=>({type:'bar',xAxisIndex:index,yAxisIndex:index,barWidth:38,itemStyle:{color},data:data.map(row=>row[key]),label:{show:true,position:'top',color:'#e2e8f0',fontSize:13}}))});
 let svg=instance.renderToSVGString().replace(/zr\d+/g,'ingestion-figure');const classes=new Map();svg=svg.replace(/ingestion-figure-cls-\d+/g,key=>{if(!classes.has(key))classes.set(key,'ingestion-figure-cls-'+classes.size);return classes.get(key);});
 if(!svg.includes('viewBox='))svg=svg.replace('<svg ','<svg viewBox="0 0 360 520" ');
 return svg.replace('<svg ','<svg role="img" aria-label="Ventanas y tokens observados en ámbitos separados" ')+'\n';
 }finally{instance.dispose();}
}
