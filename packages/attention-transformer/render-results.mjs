import{readFile,writeFile}from'node:fs/promises'
import{lineChart,matrixChart}from'./charts.mjs'
const data=JSON.parse(await readFile(new URL('comparison.json',import.meta.url))),c=data.cases.find(c=>c.id==='self_causal-7'),m=data.models[0],grad=m.inputGradient[0]
const plots={
 'attention-weights.svg':matrixChart(c.trace.weights[0][0],{allowed:c.trace.allowed[0][0],title:'Self causal · seed 7 · head 0'}),
 'scale-entropy.svg':lineChart(['raw','scaled'].map((key,i)=>({name:i?'Con escala':'Sin escala',points:data.probes.scale.map((p,j)=>({x:j,y:p[key].meanEntropy}))})),'Entropía media · ocho keys',{xMax:3,yMax:Math.log(8),ticks:[0,1,2,3],tickLabels:data.probes.scale.map(p=>p.depth),xLabel:'Dimensión (categorías)',yLabel:'Entropía (nats)'}),
 'position-signals.svg':lineChart([0,1,6,7].map(dim=>({name:'Dimensión '+dim,points:data.probes.positions.map((row,i)=>({x:i,y:row[dim]}))})),'Señales de posición sinusoidales',{xMax:15,yMin:-1,yMax:1,ticks:[0,5,10,15],xLabel:'Posición absoluta',yLabel:'Valor'}),
 'causal-gradient.svg':matrixChart(grad,{symmetric:Math.max(...grad.flat().map(Math.abs)),title:'Gradiente del logit [0, 1, 1] · seed 7'})
}
for(const[name,svg]of Object.entries(plots))await writeFile(new URL(name,import.meta.url),svg+'\n')
console.log('Cuatro figuras generadas desde el informe')
