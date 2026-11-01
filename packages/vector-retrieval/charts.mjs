import * as echarts from 'echarts';
const background='#0f172a',foreground='#e2e8f0',muted='#94a3b8';
const fmt=(value,digits=3)=>Number(value).toLocaleString('es-ES',{maximumFractionDigits:digits});
function render(title,option,height=380){
 const chart=echarts.init(null,null,{renderer:'svg',ssr:true,width:360,height});
 try{
  chart.setOption({animation:false,backgroundColor:background,textStyle:{fontFamily:'sans-serif',fontSize:14,color:foreground},...option});
  let svg=chart.renderToSVGString().replace(/zr\d+/g,'vector-figure');
  const classes=new Map();svg=svg.replace(/vector-figure-cls-\d+/g,key=>{if(!classes.has(key))classes.set(key,'vector-figure-cls-'+classes.size);return classes.get(key);});
  if(!svg.includes('viewBox='))svg=svg.replace('<svg ',`<svg viewBox="0 0 360 ${height}" `);
  svg=svg.replace('<svg ',`<svg role="img" aria-labelledby="figure-title" `).replace(/(<svg[^>]*>)/,`$1<title id="figure-title">${title}</title>`);
  return svg+'\n';
 }finally{chart.dispose();}
}
const title=(text,subtext)=>({text,subtext,left:12,top:10,textStyle:{fontSize:17,color:foreground},subtextStyle:{fontSize:13,lineHeight:18,color:muted}});
const axis={axisLine:{lineStyle:{color:muted}},axisLabel:{color:foreground,fontSize:13},splitLine:{lineStyle:{color:'#334155'}}};
export function recallChart(summaries){
 return render('FAISS: recall de vecinos top10',{
  title:title('FAISS: recall de vecinos top10','20 consultas; referencia FlatL2\nefConstruction = 40'),
  legend:{top:73,textStyle:{color:foreground},data:['M4','M16']},grid:{left:48,right:28,top:115,bottom:75},
  xAxis:{...axis,type:'category',data:['4','16','64'],name:'efSearch',nameLocation:'middle',nameGap:30,nameTextStyle:{color:foreground}},
  yAxis:{...axis,type:'value',min:0,max:1,interval:.25,axisLabel:{...axis.axisLabel,formatter:v=>fmt(v,2)}},
  series:[4,16].map((m,i)=>({name:'M'+m,type:'line',symbol:'circle',symbolSize:8,itemStyle:{color:i?'#38bdf8':'#fbbf24'},lineStyle:{width:2},data:[4,16,64].map(ef=>summaries.find(s=>s.strategy===`hnsw${m}-ef${ef}`).meanNeighborRecall),label:{show:true,position:i?'top':'bottom',distance:6,fontSize:13,color:foreground,backgroundColor:background,padding:2,formatter:p=>fmt(p.value)}})),
 });
}
export function sizeChart(builds){
 return render('Tamaño del índice serializado',{
  title:title('Tamaño del índice serializado','MB decimales; no es memoria del proceso'),grid:{left:48,right:18,top:96,bottom:65},
  xAxis:{...axis,type:'category',data:['FlatL2','HNSW4','HNSW16']},yAxis:{...axis,type:'value',min:0,max:2,interval:.5,name:'MB',nameTextStyle:{color:foreground},axisLabel:{...axis.axisLabel,formatter:v=>fmt(v,1)}},
  series:[{type:'bar',barWidth:42,data:builds.map((r,i)=>({value:r.serializedBytes/1e6,itemStyle:{color:['#94a3b8','#fbbf24','#38bdf8'][i]}})),label:{show:true,position:'top',fontSize:13,color:foreground,formatter:p=>fmt(p.value)}}],
 });
}
export function qualityChart(summaries){
 const values=summaries.filter(r=>r.split==='test');
 return render('Relevancia en el corpus etiquetado',{
  title:title('Relevancia en el corpus etiquetado','Test: 9 consultas respondibles\n20 documentos; juicios del autor'),legend:{top:73,textStyle:{color:foreground},data:['BM25','Dense']},grid:{left:48,right:20,top:116,bottom:65},
  xAxis:{...axis,type:'category',data:['P@3','R@3','MRR@3']},yAxis:{...axis,type:'value',min:0,max:1,interval:.25,axisLabel:{...axis.axisLabel,formatter:v=>fmt(v,2)}},
  series:['bm25','dense'].map((method,i)=>({name:i?'Dense':'BM25',type:'bar',barWidth:22,barGap:'100%',itemStyle:{color:i?'#38bdf8':'#fbbf24'},data:['precision','recall','mrr'].map(key=>values.find(r=>r.method===method)[key]),label:{show:true,position:'top',fontSize:12,color:foreground,formatter:p=>fmt(p.value)}})),
 });
}

export function postgresRecallChart(summaries){
 return render('pgvector: recall de vecinos top10',{
  title:title('pgvector: recall de vecinos','20 consultas; referencia exacta PostgreSQL\nM16; efConstruction40; iterative_scan off'),
  grid:{left:48,right:28,top:110,bottom:75},
  xAxis:{...axis,type:'category',data:['4','16','64'],name:'ef_search',nameLocation:'middle',nameGap:30,nameTextStyle:{color:foreground}},
  yAxis:{...axis,type:'value',min:0,max:1,interval:.25,axisLabel:{...axis.axisLabel,formatter:v=>fmt(v,2)}},
  series:[{type:'line',symbolSize:8,itemStyle:{color:'#38bdf8'},data:[4,16,64].map(ef=>summaries.find(s=>s.strategy==='hnsw-ef'+ef).meanNeighborRecall),label:{show:true,position:'top',color:foreground,formatter:p=>fmt(p.value)}}],
 });
}
export function latencyChart(summaries,engine){
 const native=engine==='native',keys=native?['flat','hnsw16-ef4','hnsw16-ef16','hnsw16-ef64']:['exact','hnsw-ef4','hnsw-ef16','hnsw-ef64'];
 return render(native?'Latencia FAISS nativa':'Latencia cliente pgvector',{
  title:title(native?'FAISS: llamada nativa':'pgvector: cliente local',native?'600 llamadas por estrategia; HNSW M16\nSin IPC, encoder ni mapping posterior':'600 peticiones por estrategia; HNSW M16\nIncluye IPC y parsing; sin encoder'),
  legend:{top:77,textStyle:{color:foreground},data:['p50','p95']},grid:{left:57,right:22,top:121,bottom:67},
  xAxis:{...axis,type:'category',data:[native?'FlatL2':'Exacta','ef4','ef16','ef64']},
  yAxis:{...axis,type:'value',min:0,name:'ms',nameTextStyle:{color:foreground},axisLabel:{...axis.axisLabel,formatter:v=>fmt(v,3)}},
  series:['p50Ms','p95Ms'].map((key,i)=>({name:i?'p95':'p50',type:'bar',barWidth:18,barGap:'25%',itemStyle:{color:i?'#fbbf24':'#38bdf8'},data:keys.map(id=>summaries.find(s=>s.strategy===id)[key])})),
 });
}
