import{readFile,writeFile}from'node:fs/promises'
import{lineChart,embeddingChart}from'./charts.mjs'
const data=JSON.parse(await readFile(new URL('comparison.json',import.meta.url))),kinds=data.protocol.memory.kinds
const memory=kinds.map(k=>data.runs.find(r=>r.id===k+'-7'))
const charts={
 'memory-curves.svg':lineChart(memory.map(r=>({name:r.kind,points:r.history.map(p=>({x:p.epoch,y:p.validationAccuracy}))})),'Memoria · validation · seed 7'),
 'length-curves.svg':lineChart(memory.map(r=>({name:r.kind,points:r.lengthProbes.map((p,i)=>({x:i,y:p.accuracy}))})),'Tres curvas coinciden en accuracy 1',{xMax:5,ticks:[0,1,2,3,4,5],tickLabels:data.protocol.memory.lengthProbes,xLabel:'Longitudes evaluadas (discretas)',yLabel:'Accuracy'}),
 'gradient-controls.svg':lineChart(['rnnHalf','rnnLarge','fixedForget'].map((k,i)=>({name:['RNN a=0,5','RNN a=1,2','Camino f=0,99'][i],points:data.probes.gradientControls.map(p=>({x:p.length,y:Math.log10(p[k])}))})),'Controles de derivada · float64',{xMax:96,yMin:-30,yMax:8,ticks:[0,24,48,72,96],xLabel:'Pasos de la recurrencia',yLabel:'log10(derivada positiva)'}),
 'embedding-table.svg':embeddingChart(memory.find(r=>r.kind==='gru').embedding)
}
for(const[file,svg]of Object.entries(charts))await writeFile(new URL(file,import.meta.url),svg+'\n')
console.log('Cuatro figuras generadas desde las observaciones')
