import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as echarts from 'echarts';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root)),json=async f=>JSON.parse(await read(f));
const capture=await json('results/isolation.json'),corpus=await json('corpus.json'),cases=await json('cases.json');
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha,file);
await writeFile(new URL('viewer-data.json',root),JSON.stringify({kind:'saved_public_synthetic_database_execution',capture,corpus,cases},null,2)+'\n');
const axis={axisLabel:{color:'#e2e8f0',fontSize:12},splitLine:{lineStyle:{color:'#334155'}}};
async function chart(file,title,subtitle,labels,series,max,height=460){
 const plot=echarts.init(null,null,{renderer:'svg',ssr:true,width:360,height});
 try{plot.setOption({animation:false,backgroundColor:'#0f172a',textStyle:{fontFamily:'sans-serif'},title:{text:title,subtext:subtitle,left:12,top:10,textStyle:{fontSize:17,color:'#e2e8f0'},subtextStyle:{fontSize:13,color:'#cbd5e1',lineHeight:19}},grid:{left:48,right:24,top:116,bottom:78},legend:{bottom:12,textStyle:{color:'#e2e8f0'}},xAxis:{...axis,type:'category',data:labels},yAxis:{...axis,type:'value',min:0,max},series:series.map((s,i)=>({name:s.name,type:'bar',data:s.values,barMaxWidth:42,itemStyle:{color:['#38bdf8','#fbbf24'][i]},label:{show:true,position:'top',color:'#e2e8f0',fontSize:13}}))});let svg=plot.renderToSVGString().replace(/zr\d+/g,'rag-architecture');if(!svg.includes('viewBox='))svg=svg.replace('<svg ',`<svg viewBox="0 0 360 ${height}" `);await writeFile(new URL(file,root),svg+'\n');}finally{plot.dispose();}
}
const globalRows=capture.requests.filter(r=>r.layout==='global'),isolatedRows=capture.requests.filter(r=>r.layout==='isolated');
await chart('request-counts.svg','Qué se comprobó al buscar','28 consultas por distribución\nCantidad de casos, no respuestas del LLM',['Con gold','Gold vacío'],[{name:'Global',values:[globalRows.filter(r=>r.goldIds.length).length,globalRows.filter(r=>!r.goldIds.length).length]},{name:'Separado',values:[isolatedRows.filter(r=>r.goldIds.length).length,isolatedRows.filter(r=>!r.goldIds.length).length]}],22);
await chart('visible-counts.svg','El rol reduce las filas visibles','SELECT sin filtro · ambas distribuciones\nCantidad de documentos autorizados',['α lector','α gestor','β lector','β gestor'],[{name:'Global',values:corpus.principals.map(p=>capture.probes.find(r=>r.role===p.role&&r.layout==='global'&&r.label==='plain-select').rows.length)},{name:'Separado',values:corpus.principals.map(p=>capture.probes.find(r=>r.role===p.role&&r.layout==='isolated'&&r.label==='plain-select').rows.length)}],7);
const ginSize=layout=>capture.databases.filter(d=>layout==='global'?d.name==='rag_global':d.name!=='rag_global').reduce((n,d)=>n+d.relations.find(r=>r.relname==='documents_terms_gin').bytes,0)/1024;
await chart('index-storage.svg','Tamaño físico de GIN','KiB de pg_relation_size · corpus diminuto\nNo incluye tabla, WAL ni otros índices',['Compartido','Separados'],[{name:'KiB',values:[ginSize('global'),ginSize('isolated')]}],60);
console.log('Viewer and three figures derived from original capture; no query rerun.');
