import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as echarts from 'echarts';
const root=new URL('.',import.meta.url),read=f=>readFile(new URL(f,root));
const capture=JSON.parse(await read('results/conversation.json'));
for(const[file,sha]of Object.entries(capture.sourceHashes))assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha,file);
await writeFile(new URL('conversation-data.json',root),JSON.stringify({kind:'saved_public_synthetic_conversation_cases',capture},null,2)+'\n');
const statuses=['ready','forbidden','unavailable_reference','not_found','no_evidence'],labels=['Evidencia lista','Otra identidad','Fuente no disponible','ID desconocido','Sin referencias'];
const chart=echarts.init(null,null,{renderer:'svg',ssr:true,width:360,height:470});
try{chart.setOption({animation:false,backgroundColor:'#0f172a',title:{text:'Resultado de las 21 solicitudes',subtext:'Contexto autorizado, no respuestas del LLM\nEscenarios conocidos del protocolo',left:12,top:10,textStyle:{color:'#e2e8f0',fontSize:17},subtextStyle:{color:'#cbd5e1',fontSize:13,lineHeight:19}},grid:{left:142,right:32,top:112,bottom:40},yAxis:{type:'category',inverse:true,data:labels,axisLabel:{color:'#e2e8f0',fontSize:12}},xAxis:{type:'value',min:0,max:9,interval:3,axisLabel:{color:'#e2e8f0'},splitLine:{lineStyle:{color:'#334155'}}},series:[{type:'bar',barWidth:30,data:statuses.map((status,i)=>({value:capture.cases.filter(c=>c.outcome.status===status).length,itemStyle:{color:['#4ade80','#fbbf24','#f87171','#94a3b8','#38bdf8'][i]}})),label:{show:true,position:'right',color:'#e2e8f0',fontSize:13}}]});let svg=chart.renderToSVGString().replace(/zr\d+/g,'conversation-figure');if(!svg.includes('viewBox='))svg=svg.replace('<svg ','<svg viewBox="0 0 360 470" ');await writeFile(new URL('conversation-outcomes.svg',root),svg+'\n');}finally{chart.dispose();}
console.log('Conversation playback and figure derived from the single native capture.');
