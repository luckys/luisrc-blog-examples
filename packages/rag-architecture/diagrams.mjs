const NS='http://www.w3.org/2000/svg';
export function countDiagram(values){
 if(values.length!==3||values.some(v=>!Number.isInteger(v)||v<0||v>12))throw Error('Invalid counts');
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 360 300');svg.setAttribute('role','img');svg.setAttribute('aria-label','Documentos almacenados, visibles y devueltos: '+values.join(', '));
 const add=(name,attrs,text)=>{const node=document.createElementNS(NS,name);for(const[key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;svg.append(node);};
 add('rect',{width:360,height:300,fill:'#020617',rx:8});
 for(const tick of [0,3,6,9,12]){const y=230-tick*14;add('line',{x1:35,y1:y,x2:345,y2:y,stroke:'#334155'});add('text',{x:26,y:y+4,fill:'#cbd5e1','text-anchor':'end','font-size':12},tick);}
 values.forEach((value,i)=>{const x=58+i*98,y=230-value*14;add('rect',{x,y,width:50,height:value*14,fill:['#64748b','#38bdf8','#4ade80'][i]});add('text',{x:x+25,y:y-10,fill:'#f8fafc','text-anchor':'middle','font-size':16},value);add('text',{x:x+25,y:258,fill:'#e2e8f0','text-anchor':'middle','font-size':12},['Almacenados','Visibles','Devueltos'][i]);});
 add('text',{x:35,y:26,fill:'#e2e8f0','font-size':14},'Cantidad de documentos · escala 0–12');return svg;
}
